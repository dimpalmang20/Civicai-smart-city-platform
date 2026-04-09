import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, issuesTable } from "@workspace/db";
import { eq, count, sql, and, gte } from "drizzle-orm";

const router = Router();

// GET /api/analytics/summary
router.get("/summary", async (req, res) => {
  const [totals] = await db
    .select({
      total: count(),
      resolved: sql<number>`count(*) filter (where status = 'resolved')`,
      pending: sql<number>`count(*) filter (where status = 'pending')`,
      inProgress: sql<number>`count(*) filter (where status = 'in_progress')`,
      totalPoints: sql<number>`coalesce(sum(points_awarded), 0)`,
    })
    .from(issuesTable);

  const [userCount] = await db.select({ total: count() }).from(usersTable);

  const total = Number(totals.total);
  const resolved = Number(totals.resolved);
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) / 100 : 0;

  res.json({
    totalIssues: total,
    resolvedIssues: resolved,
    pendingIssues: Number(totals.pending),
    inProgressIssues: Number(totals.inProgress),
    totalUsers: Number(userCount.total),
    totalPointsAwarded: Number(totals.totalPoints),
    resolutionRate,
  });
});

// GET /api/analytics/issues-by-type
router.get("/issues-by-type", async (req, res) => {
  const labels: Record<string, string> = {
    garbage: "Garbage",
    pothole: "Pothole",
    water_leakage: "Water Leakage",
    street_light: "Street Light",
    plastic: "Plastic Waste",
    other: "Other",
  };

  const results = await db
    .select({
      issueType: issuesTable.issueType,
      count: count(),
    })
    .from(issuesTable)
    .groupBy(issuesTable.issueType)
    .orderBy(sql`count(*) desc`);

  res.json(
    results.map((r) => ({
      issueType: r.issueType,
      count: Number(r.count),
      label: labels[r.issueType] ?? r.issueType,
    }))
  );
});

// GET /api/analytics/issues-over-time
router.get("/issues-over-time", async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const results = await db
    .select({
      date: sql<string>`date_trunc('day', created_at)::date::text`,
      count: count(),
    })
    .from(issuesTable)
    .where(gte(issuesTable.createdAt, thirtyDaysAgo))
    .groupBy(sql`date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at) asc`);

  res.json(results.map((r) => ({ date: r.date, count: Number(r.count) })));
});

// GET /api/analytics/recent-activity
router.get("/recent-activity", async (req, res) => {
  const limitParam = req.query.limit ? Number(req.query.limit) : 10;
  const limit = isNaN(limitParam) ? 10 : Math.min(limitParam, 50);

  const issues = await db
    .select()
    .from(issuesTable)
    .orderBy(sql`created_at desc`)
    .limit(limit);

  const activity = issues.map((issue) => ({
    id: issue.id,
    issueId: issue.id,
    issueType: issue.issueType,
    action: issue.status === "resolved" ? "Issue resolved" : issue.status === "in_progress" ? "Work in progress" : "Issue reported",
    address: issue.address,
    status: issue.status,
    reporterName: issue.reporterName ?? null,
    createdAt: issue.createdAt,
  }));

  res.json(activity);
});

export default router;
