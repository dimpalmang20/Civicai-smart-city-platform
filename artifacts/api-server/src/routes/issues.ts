import { Router } from "express";
import { db } from "@workspace/db";
import {
  issuesTable,
  usersTable,
  rewardsTable,
  authoritiesTable,
  transactionsTable,
} from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  ListIssuesQueryParams,
  CreateIssueBody,
  GetIssueParams,
  UpdateIssueParams,
  UpdateIssueBody,
  DetectIssueBody,
} from "@workspace/api-zod";
import crypto from "crypto";
import sharp from "sharp";
import imghash from "imghash";
import * as exifr from "exifr";
import { classifyCivicIssue } from "../lib/classify-image";
import { reverseGeocode } from "../lib/geocode";
import { createUserNotification } from "../lib/notify";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";

const router = Router();

const RESOLVE_REWARD_POINTS = Number(process.env["RESOLVE_REWARD_POINTS"] ?? 150);
const ACCEPT_REWARD_POINTS = Number(process.env["ACCEPT_REWARD_POINTS"] ?? 25);

/** Human-facing department label (legacy UI / compatibility). */
function getDepartmentLabel(issueType: string): string {
  const routing: Record<string, string> = {
    garbage: "Sanitation Department",
    plastic: "Recycling Company",
    pothole: "PWD Department",
    water_leakage: "Water Authority",
    street_light: "Electricity Department",
    other: "Municipality",
  };
  return routing[issueType] ?? "Municipality";
}

/** Stable key used to match `authorities.department_key`. */
function getDepartmentKey(issueType: string): string {
  const routing: Record<string, string> = {
    garbage: "sanitation",
    plastic: "recycling",
    pothole: "pwd",
    water_leakage: "water",
    street_light: "electricity",
    other: "municipality",
  };
  return routing[issueType] ?? "municipality";
}

function computeBadge(points: number): string | null {
  if (points >= 5000) return "City Hero";
  if (points >= 2000) return "Top Reporter";
  if (points >= 500) return "Civic Champion";
  return null;
}

async function recordRejectedAttempt(userId: number) {
  await db
    .update(usersTable)
    .set({
      totalReports: sql`total_reports + 1`,
      rejectedReports: sql`rejected_reports + 1`,
      trustScore: sql`(valid_reports)::numeric / greatest(total_reports + 1, 1)::numeric`,
    })
    .where(eq(usersTable.id, userId));
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, b64] = match;
  try {
    return { mime, buffer: Buffer.from(b64, "base64") };
  } catch {
    return null;
  }
}

function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
  }
  return dist;
}

async function pickAuthorityId(departmentKey: string): Promise<number | null> {
  const rows = await db
    .select({ id: authoritiesTable.id })
    .from(authoritiesTable)
    .where(and(eq(authoritiesTable.departmentKey, departmentKey), eq(authoritiesTable.isActive, true)))
    .limit(1);
  return rows[0]?.id ?? null;
}

// GET /api/issues
router.get("/", async (req, res) => {
  const user = req.body.user || req.query.user; // temporary

  if (user?.role === "authority") {
    const authority = await db
  .select()
  .from(authoritiesTable)
  .where(eq(authoritiesTable.userId, user.userId))
  .limit(1);

const authData = authority[0];

    if (!authData) {
      return res.json([]);
    }

    const issues = await db
      .select()
      .from(issuesTable)
      .where(eq(issuesTable.authorityId, authData.id))
      .orderBy(desc(issuesTable.createdAt));

    return res.json(issues);
  }

  const issues = await db
    .select()
    .from(issuesTable)
    .orderBy(desc(issuesTable.createdAt));

  res.json(issues);
});

// POST /api/issues/detect  (must come before /:id)
router.post("/detect", async (req, res) => {
  const parseResult = DetectIssueBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { imageUrl, imageBase64 } = parseResult.data as {
    imageUrl?: string;
    imageBase64?: string;
  };

  let buffer: Buffer | null = null;
  if (imageUrl) {
    const parsed = parseDataUrl(imageUrl);
    buffer = parsed?.buffer ?? null;
  } else if (imageBase64) {
    try {
      buffer = Buffer.from(imageBase64, "base64");
    } catch {
      buffer = null;
    }
  }

  if (!buffer || buffer.length < 32) {
    res.status(400).json({ error: "missing_image", message: "Provide imageUrl (data URL) or raw base64 in imageBase64" });
    return;
  }

  const cls = await classifyCivicIssue(buffer);
  res.json({
    issueType: cls.issueType,
    confidence: cls.confidence,
    department: getDepartmentLabel(cls.issueType),
    description: cls.description,
  });
});

// POST /api/issues
router.post("/", async (req, res) => {
  const parseResult = CreateIssueBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const body = parseResult.data;

  const MAX_LOCATION_MISMATCH_METERS = Number(process.env.MAX_LOCATION_MISMATCH_METERS ?? 100);
  const MAX_EXIF_VS_REPORTER_METERS = Number(process.env.MAX_EXIF_VS_REPORTER_METERS ?? 800);
  const MAX_PHASH_DISTANCE = Number(process.env.MAX_PHASH_DISTANCE ?? 6);
  const MAX_IMAGE_AGE_DAYS = Number(process.env.MAX_IMAGE_AGE_DAYS ?? 7);

  const validationNotes: string[] = [];
  let verificationStatus: "pending" | "flagged" = "pending";

  if (body.reporterLatitude != null && body.reporterLongitude != null) {
    const mismatch = haversineMeters(
      { lat: Number(body.reporterLatitude), lng: Number(body.reporterLongitude) },
      { lat: Number(body.latitude), lng: Number(body.longitude) },
    );
    if (Number.isFinite(mismatch) && mismatch > MAX_LOCATION_MISMATCH_METERS) {
      if (body.userId) await recordRejectedAttempt(body.userId);
      res.status(400).json({ error: "location_mismatch", message: "Location mismatch detected" });
      return;
    }
  } else {
    validationNotes.push("Missing reporter GPS location (low trust).");
    verificationStatus = "flagged";
  }

  let imageMd5: string | null = null;
  let imagePhash: string | null = null;
  let exifTakenAt: Date | null = null;
  let exifLatitude: number | null = null;
  let exifLongitude: number | null = null;
  let imageBuffer: Buffer | null = null;

  if (body.imageUrl) {
    const parsed = parseDataUrl(body.imageUrl);
    if (parsed) {
      imageBuffer = parsed.buffer;
      imageMd5 = crypto.createHash("md5").update(parsed.buffer).digest("hex");

      try {
        const normalized = await sharp(parsed.buffer).rotate().resize(256, 256, { fit: "inside" }).toBuffer();
        imagePhash = await imghash.hash(normalized, 16, "hex");
      } catch {
        validationNotes.push("Could not compute perceptual hash (low trust).");
        verificationStatus = "flagged";
      }

      try {
        const exif: any = await exifr.parse(parsed.buffer, { gps: true, exif: true, tiff: true, iptc: true });
        const taken = exif?.DateTimeOriginal ?? exif?.CreateDate ?? exif?.ModifyDate ?? null;
        if (taken instanceof Date && !isNaN(taken.getTime())) {
          exifTakenAt = taken;
          const ageDays = (Date.now() - taken.getTime()) / (1000 * 60 * 60 * 24);
          if (ageDays > MAX_IMAGE_AGE_DAYS) {
            validationNotes.push(`Image appears old (${Math.floor(ageDays)} days) (low trust).`);
            verificationStatus = "flagged";
          }
        } else {
          validationNotes.push("Missing EXIF timestamp — may be a download/screenshot (low trust).");
          verificationStatus = "flagged";
        }

        if (!(exif?.Make || exif?.Model)) {
          validationNotes.push("Missing camera Make/Model EXIF — possible non-camera image.");
          verificationStatus = "flagged";
        }

        if (typeof exif?.latitude === "number" && typeof exif?.longitude === "number") {
          const elat = exif.latitude as number;
          const elng = exif.longitude as number;
          exifLatitude = elat;
          exifLongitude = elng;
          if (body.reporterLatitude != null && body.reporterLongitude != null) {
            const exifGap = haversineMeters(
              { lat: elat, lng: elng },
              { lat: Number(body.reporterLatitude), lng: Number(body.reporterLongitude) },
            );
            if (Number.isFinite(exifGap) && exifGap > MAX_EXIF_VS_REPORTER_METERS) {
              if (body.userId) await recordRejectedAttempt(body.userId);
              res.status(400).json({
                error: "exif_location_mismatch",
                message: "Image GPS does not match your device location",
              });
              return;
            }
          }
        }
      } catch {
        validationNotes.push("EXIF read failed (low trust).");
        verificationStatus = "flagged";
      }
    } else {
      validationNotes.push("Image is not a supported base64 data URL (low trust).");
      verificationStatus = "flagged";
    }
  } else {
    validationNotes.push("Missing image (low trust).");
    verificationStatus = "flagged";
  }

  if (!imageBuffer) {
    if (body.userId) await recordRejectedAttempt(body.userId);
    res.status(400).json({ error: "missing_image", message: "Image required" });
    return;
  }

  const detection = await classifyCivicIssue(imageBuffer);
  if (detection.confidence < 0.7) {
    if (body.userId) await recordRejectedAttempt(body.userId);
    res.status(400).json({ error: "ai_validation_failed", message: "No valid issue detected in image" });
    return;
  }

  if (imageMd5) {
    const exact = await db.select().from(issuesTable).where(eq(issuesTable.imageMd5, imageMd5)).limit(1);
    if (exact.length > 0) {
      if (body.userId) await recordRejectedAttempt(body.userId);
      res.status(409).json({ error: "duplicate_image", message: "Duplicate image detected" });
      return;
    }
  }

  if (imagePhash) {
    const recent = await db
      .select({ id: issuesTable.id, imagePhash: issuesTable.imagePhash })
      .from(issuesTable)
      .orderBy(desc(issuesTable.createdAt))
      .limit(200);

    const near = recent.find(
      (r) => r.imagePhash && imagePhash && hammingDistanceHex(r.imagePhash, imagePhash) <= MAX_PHASH_DISTANCE,
    );
    if (near) {
      if (body.userId) await recordRejectedAttempt(body.userId);
      res.status(409).json({ error: "duplicate_image_similar", message: "Similar image detected (possible duplicate report)" });
      return;
    }
  }

  const departmentKey = getDepartmentKey(detection.issueType);
  const department = getDepartmentLabel(detection.issueType);
  const authorityId = await pickAuthorityId(departmentKey);

  let address = body.address;
  const looksPlaceholder = /^lat:/i.test(address) || address.length < 8;
  if (looksPlaceholder) {
    const geo = await reverseGeocode(Number(body.latitude), Number(body.longitude));
    if (geo) address = geo;
  }

  let reporterName: string | null = null;
  if (body.userId) {
    const user = await db.select().from(usersTable).where(eq(usersTable.id, body.userId)).limit(1);
    if (user[0]) {
      reporterName = user[0].name;
    }
  }

  const [issue] = await db
    .insert(issuesTable)
    .values({
      userId: body.userId ?? null,
      authorityId,
      issueType: detection.issueType as any,
      description: body.description ?? detection.description ?? null,
      imageUrl: body.imageUrl ?? null,
      latitude: String(body.latitude),
      longitude: String(body.longitude),
      reporterLatitude: body.reporterLatitude != null ? String(body.reporterLatitude) : null,
      reporterLongitude: body.reporterLongitude != null ? String(body.reporterLongitude) : null,
      address,
      department,
      confidenceScore: String(detection.confidence),
      imageHash: body.imageHash,
      imageMd5,
      imagePhash,
      exifTakenAt,
      exifLatitude: exifLatitude != null ? String(exifLatitude) : null,
      exifLongitude: exifLongitude != null ? String(exifLongitude) : null,
      reporterName,
      verificationStatus,
      isDuplicate: false,
      isValid: verificationStatus === "pending",
      validationNotes: validationNotes.length ? validationNotes.join(" ") : null,
      pointsAwarded: 0,
      status: "pending",
    })
    .returning();

  if (body.userId) {
    await db
      .update(usersTable)
      .set({
        totalReports: sql`total_reports + 1`,
      })
      .where(eq(usersTable.id, body.userId));

    await createUserNotification({
      userId: body.userId,
      category: "complaint_received",
      title: "Report received",
      body: `Your ${String(detection.issueType).replace("_", " ")} report was received and routed to ${department}.`,
      issueId: issue.id,
    });
  }

  res.status(201).json(issue);
});

// GET /api/issues/:id
router.get("/:id", async (req, res) => {
  const parseResult = GetIssueParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_params", message: "Invalid issue ID" });
    return;
  }

  const [issue] = await db.select().from(issuesTable).where(eq(issuesTable.id, parseResult.data.id));
  if (!issue) {
    res.status(404).json({ error: "not_found", message: "Issue not found" });
    return;
  }

  res.json(issue);
});

// PATCH /api/issues/:id — authority workflow + rewards (single transitions)
router.patch("/:id", requireAuth, requireRole("authority", "admin"), async (req: AuthedRequest, res) => {
  const paramsResult = UpdateIssueParams.safeParse({ id: Number(req.params.id) });
  const bodyResult = UpdateIssueBody.safeParse(req.body);

  if (!paramsResult.success || !bodyResult.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid request" });
    return;
  }

  const issueId = paramsResult.data.id;
  const { status, resolvedImageUrl } = bodyResult.data;

  const [existing] = await db.select().from(issuesTable).where(eq(issuesTable.id, issueId));
  if (!existing) {
    res.status(404).json({ error: "not_found", message: "Issue not found" });
    return;
  }

  const auth = req.auth!;
  if (auth.role === "authority") {
    const aid = auth.authorityId;
    let allowed = false;
    if (aid != null && existing.authorityId === aid) {
      allowed = true;
    } else if (aid != null && existing.authorityId == null) {
      const [authRow] = await db.select().from(authoritiesTable).where(eq(authoritiesTable.id, aid)).limit(1);
      const expectedKey = getDepartmentKey(String(existing.issueType));
      allowed = Boolean(authRow && authRow.departmentKey === expectedKey);
    }
    if (!allowed) {
      res.status(403).json({ error: "forbidden", message: "This complaint is not assigned to your authority" });
      return;
    }
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (status) updateData.status = status;
  if (resolvedImageUrl) updateData.resolvedImageUrl = resolvedImageUrl;

  const [updated] = await db.update(issuesTable).set(updateData).where(eq(issuesTable.id, issueId)).returning();
  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Issue not found" });
    return;
  }

  // Complaint accepted (in progress)
  if (status === "in_progress" && existing.status === "pending" && updated.userId) {
    await createUserNotification({
      userId: updated.userId,
      category: "complaint_accepted",
      title: "Complaint accepted",
      body: `Your report #${updated.id} is now being handled by ${updated.department}.`,
      issueId: updated.id,
    });

    if (ACCEPT_REWARD_POINTS > 0) {
      await db
        .update(usersTable)
        .set({
          points: sql`points + ${ACCEPT_REWARD_POINTS}`,
        })
        .where(eq(usersTable.id, updated.userId));

      const [uAfter] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
      await db.insert(transactionsTable).values({
        userId: updated.userId,
        amount: ACCEPT_REWARD_POINTS,
        balanceAfter: uAfter.points,
        type: "reward_accepted",
        description: `Complaint accepted: #${updated.id}`,
        issueId: updated.id,
      });

      await db.insert(rewardsTable).values({
        userId: updated.userId,
        type: "earned",
        points: ACCEPT_REWARD_POINTS,
        description: `Complaint accepted: #${updated.id}`,
      });

      const badge = computeBadge(uAfter.points);
      if (badge !== uAfter.badge) {
        await db.update(usersTable).set({ badge }).where(eq(usersTable.id, updated.userId));
      }

      await createUserNotification({
        userId: updated.userId,
        category: "reward_credited",
        title: "Points credited",
        body: `${ACCEPT_REWARD_POINTS} points were added for an accepted complaint.`,
        issueId: updated.id,
      });
    }
  }

  // Resolved: one-time reward + notifications
  if (status === "resolved" && existing.status !== "resolved" && updated.userId) {
    await db
      .update(usersTable)
      .set({
        points: sql`points + ${RESOLVE_REWARD_POINTS}`,
        resolvedReports: sql`resolved_reports + 1`,
      })
      .where(eq(usersTable.id, updated.userId));

    const [uAfter] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));

    await db.insert(transactionsTable).values({
      userId: updated.userId,
      amount: RESOLVE_REWARD_POINTS,
      balanceAfter: uAfter.points,
      type: "reward_resolved",
      description: `Complaint resolved: #${updated.id}`,
      issueId: updated.id,
    });

    await db.insert(rewardsTable).values({
      userId: updated.userId,
      type: "earned",
      points: RESOLVE_REWARD_POINTS,
      description: `Complaint resolved: #${updated.id}`,
    });

    await db
      .update(issuesTable)
      .set({
        verificationStatus: "approved",
        isValid: true,
        pointsAwarded: sql`points_awarded + ${RESOLVE_REWARD_POINTS}`,
        updatedAt: new Date(),
      })
      .where(eq(issuesTable.id, updated.id));

    const badge = computeBadge(uAfter.points);
    if (badge !== uAfter.badge) {
      await db.update(usersTable).set({ badge }).where(eq(usersTable.id, updated.userId));
    }

    await createUserNotification({
      userId: updated.userId,
      category: "complaint_resolved",
      title: "Complaint resolved",
      body: `Your report #${updated.id} was marked resolved by the authority.`,
      issueId: updated.id,
    });

    await createUserNotification({
      userId: updated.userId,
      category: "reward_credited",
      title: "Reward credited",
      body: `${RESOLVE_REWARD_POINTS} civic points were added to your wallet.`,
      issueId: updated.id,
    });
  }

  const [fresh] = await db.select().from(issuesTable).where(eq(issuesTable.id, issueId));
  res.json(fresh);
});

export default router;
