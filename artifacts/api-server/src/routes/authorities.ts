import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, issuesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  AuthorityLoginBody,
  GetAuthorityIssuesQueryParams,
} from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// POST /api/authorities/login
router.post("/login", async (req, res) => {
  const parseResult = AuthorityLoginBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { email, password } = parseResult.data;
  const hash = hashPassword(password);

  const [authority] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!authority || authority.passwordHash !== hash || authority.role !== "authority") {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid credentials or not an authority account" });
    return;
  }

  const { passwordHash: _, ...safeAuthority } = authority;
  res.json({
    authority: safeAuthority,
    token: `auth_token_${authority.id}_${Date.now()}`,
    department: authority.department ?? "Municipality",
  });
});

// GET /api/authorities/issues
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
