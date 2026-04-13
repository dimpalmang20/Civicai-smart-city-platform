import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

const router = Router();

// GET /api/notifications
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);

  res.json(
    rows.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      body: r.body,
      read: r.read,
      issueId: r.issueId,
      metadata: r.metadataJson ? JSON.parse(r.metadataJson) : null,
      createdAt: r.createdAt,
    })),
  );
});

// POST /api/notifications/:id/read
router.post("/:id/read", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_params", message: "Invalid id" });
    return;
  }
  const userId = req.auth!.userId;
  const [updated] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Notification not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
