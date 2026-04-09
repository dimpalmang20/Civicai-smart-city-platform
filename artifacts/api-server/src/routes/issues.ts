import { Router } from "express";
import { db } from "@workspace/db";
import { issuesTable, usersTable, rewardsTable } from "@workspace/db";
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

const router = Router();

// Department routing based on issue type
function getDepartment(issueType: string): string {
  const routing: Record<string, string> = {
    garbage: "Municipality",
    plastic: "Recycling Company",
    pothole: "PWD Department",
    water_leakage: "Water Authority",
    street_light: "Electricity Department",
    other: "Municipality",
  };
  return routing[issueType] ?? "Municipality";
}

// AI detection simulation (MVP - production would call Python YOLO service)
function simulateAIDetection(imageUrl?: string): {
  issueType: string;
  confidence: number;
  department: string;
  description: string;
} {
  const types = [
    { issueType: "garbage", confidence: 0.94, description: "Garbage pile detected near residential area" },
    { issueType: "pothole", confidence: 0.89, description: "Road pothole detected causing traffic hazard" },
    { issueType: "water_leakage", confidence: 0.92, description: "Water leakage from underground pipe detected" },
    { issueType: "street_light", confidence: 0.87, description: "Street light malfunction detected" },
    { issueType: "plastic", confidence: 0.91, description: "Plastic waste accumulation detected" },
  ];
  const pick = types[Math.floor(Math.random() * types.length)];
  return {
    ...pick,
    department: getDepartment(pick.issueType),
  };
}

// Compute badge based on points
function computeBadge(points: number): string | null {
  if (points >= 5000) return "City Hero";
  if (points >= 2000) return "Top Reporter";
  if (points >= 500) return "Civic Champion";
  return null;
}

// GET /api/issues
router.get("/", async (req, res) => {
  const parseResult = ListIssuesQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_query", message: "Invalid query parameters" });
    return;
  }

  const { status, issue_type, limit = 50, offset = 0 } = parseResult.data;
  const conditions = [];

  if (status) conditions.push(eq(issuesTable.status, status as any));
  if (issue_type) conditions.push(eq(issuesTable.issueType, issue_type as any));

  const issues = await db
    .select()
    .from(issuesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(issuesTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(issues);
});

// POST /api/issues/detect  (must come before /:id)
router.post("/detect", async (req, res) => {
  const parseResult = DetectIssueBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const detection = simulateAIDetection(parseResult.data.imageUrl);
  res.json(detection);
});

// POST /api/issues
router.post("/", async (req, res) => {
  const parseResult = CreateIssueBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const body = parseResult.data;

  // Check for duplicate by image hash
  const existing = await db
    .select()
    .from(issuesTable)
    .where(eq(issuesTable.imageHash, body.imageHash))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "duplicate_issue", message: "This issue has already been reported" });
    return;
  }

  const department = getDepartment(body.issueType);

  // Get reporter name if userId provided
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
      issueType: body.issueType,
      description: body.description ?? null,
      imageUrl: body.imageUrl ?? null,
      latitude: String(body.latitude),
      longitude: String(body.longitude),
      address: body.address,
      department,
      confidenceScore: body.confidenceScore ? String(body.confidenceScore) : null,
      imageHash: body.imageHash,
      reporterName,
      pointsAwarded: 100,
      status: "pending",
    })
    .returning();

  // Award points to user if logged in
  if (body.userId) {
    await db
      .update(usersTable)
      .set({
        points: sql`points + 100`,
        totalReports: sql`total_reports + 1`,
      })
      .where(eq(usersTable.id, body.userId));

    await db.insert(rewardsTable).values({
      userId: body.userId,
      type: "earned",
      points: 100,
      description: `Report accepted: ${body.issueType.replace("_", " ")} at ${body.address}`,
    });

    // Update badge
    const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, body.userId));
    const badge = computeBadge(updatedUser.points);
    if (badge !== updatedUser.badge) {
      await db.update(usersTable).set({ badge }).where(eq(usersTable.id, body.userId));
    }
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

// PATCH /api/issues/:id
router.patch("/:id", async (req, res) => {
  const paramsResult = UpdateIssueParams.safeParse({ id: Number(req.params.id) });
  const bodyResult = UpdateIssueBody.safeParse(req.body);

  if (!paramsResult.success || !bodyResult.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid request" });
    return;
  }

  const { status, resolvedImageUrl } = bodyResult.data;
  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (status) updateData.status = status;
  if (resolvedImageUrl) updateData.resolvedImageUrl = resolvedImageUrl;

  const [updated] = await db
    .update(issuesTable)
    .set(updateData)
    .where(eq(issuesTable.id, paramsResult.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Issue not found" });
    return;
  }

  // Award resolution bonus points
  if (status === "resolved" && updated.userId) {
    await db
      .update(usersTable)
      .set({
        points: sql`points + 200`,
        resolvedReports: sql`resolved_reports + 1`,
      })
      .where(eq(usersTable.id, updated.userId));

    await db.insert(rewardsTable).values({
      userId: updated.userId,
      type: "earned",
      points: 200,
      description: `Issue resolved: ${updated.issueType.replace("_", " ")} at ${updated.address}`,
    });
  }

  res.json(updated);
});

export default router;
