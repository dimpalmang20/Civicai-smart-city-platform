import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, issuesTable, authoritiesTable } from "@workspace/db";
import { eq, and, desc, or, isNull, type SQL } from "drizzle-orm";
import { AuthorityLoginBody, GetAuthorityIssuesQueryParams } from "@workspace/api-zod";
import { verifyPassword } from "../lib/password";
import { signAccessToken } from "../lib/jwt";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";

const router = Router();

// POST /api/authorities/login
router.post("/login", async (req, res) => {
  const parseResult = AuthorityLoginBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { email, password } = parseResult.data;

  const [authorityUser] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (!authorityUser || !(await verifyPassword(password, authorityUser.passwordHash)) || authorityUser.role !== "authority") {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid credentials or not an authority account" });
    return;
  }

  if (!authorityUser.emailVerified) {
    res.status(403).json({ error: "email_not_verified", message: "Authority account is not active" });
    return;
  }

  const [authRow] = await db
    .select()
    .from(authoritiesTable)
    .where(eq(authoritiesTable.userId, authorityUser.id))
    .limit(1);

  if (!authRow) {
    res.status(403).json({ error: "misconfigured", message: "Authority profile missing — contact admin" });
    return;
  }

  const token = await signAccessToken({
    userId: authorityUser.id,
    role: "authority",
    email: authorityUser.email,
    authorityId: authRow.id,
  });

  const { passwordHash: _, ...safeAuthority } = authorityUser;
  res.json({
    authority: safeAuthority,
    token,
    department: authorityUser.department ?? authRow.organizationName,
    departmentKey: authRow.departmentKey,
    authorityId: authRow.id,
  });
});

function issueTypesForDepartmentKey(key: string): string[] {
  const map: Record<string, string[]> = {
    sanitation: ["garbage", "plastic"],
    electricity: ["street_light"],
    pwd: ["pothole"],
    water: ["water_leakage"],
    recycling: ["plastic"],
    municipality: ["garbage", "plastic", "pothole", "water_leakage", "street_light", "other"],
  };
  return map[key] ?? ["other"];
}

// GET /api/authorities/assigned — JWT-scoped list for the logged-in authority
router.get("/assigned", requireAuth, requireRole("authority", "admin"), async (req: AuthedRequest, res) => {
  const auth = req.auth!;
  if (auth.role === "admin") {
    const rows = await db.select().from(issuesTable).orderBy(desc(issuesTable.createdAt)).limit(200);
    res.json(rows);
    return;
  }

  const aid = auth.authorityId;
  if (aid == null) {
    res.status(403).json({ error: "forbidden", message: "Missing authority scope" });
    return;
  }

  const [authRow] = await db.select().from(authoritiesTable).where(eq(authoritiesTable.id, aid)).limit(1);
  if (!authRow) {
    res.status(404).json({ error: "not_found", message: "Authority record not found" });
    return;
  }

  const types = issueTypesForDepartmentKey(authRow.departmentKey);
  const typeOr = (
    types.length === 1
      ? eq(issuesTable.issueType, types[0] as any)
      : or(...types.map((t) => eq(issuesTable.issueType, t as any)))
  ) as SQL;

  const status = typeof req.query["status"] === "string" ? req.query["status"] : undefined;

  const baseOr = or(eq(issuesTable.authorityId, aid), and(isNull(issuesTable.authorityId), typeOr));

  const rows = await db
    .select()
    .from(issuesTable)
    .where(status ? and(baseOr, eq(issuesTable.status, status as any)) : baseOr)
    .orderBy(desc(issuesTable.createdAt))
    .limit(200);

  res.json(rows);
});

// GET /api/authorities/issues — query by department label (backward compatible)
router.get("/issues", async (req, res) => {
  const parseResult = GetAuthorityIssuesQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_query", message: "Invalid query parameters" });
    return;
  }

  const { department, status } = parseResult.data;
  const conditions = [eq(issuesTable.department, department)];
  if (status) conditions.push(eq(issuesTable.status, status as any));

  const issues = await db
    .select()
    .from(issuesTable)
    .where(and(...conditions))
    .orderBy(desc(issuesTable.createdAt));

  res.json(issues);
});

export default router;
