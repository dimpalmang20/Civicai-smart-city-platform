import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, issuesTable, authoritiesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  CreateUserBody,
  GetUserParams,
  LoginUserBody,
  GetLeaderboardQueryParams,
} from "@workspace/api-zod";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken } from "../lib/jwt";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

const router = Router();

// GET /api/users/me
router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.auth!.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }
  const { passwordHash: _, ...safe } = user;
  res.json(safe);
});

// POST /api/users/login (must come before /:id)
router.post("/login", async (req, res) => {
  const parseResult = LoginUserBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { email, password } = parseResult.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    return;
  }

  if (!user.emailVerified) {
    res.status(403).json({
      error: "email_not_verified",
      message: "Please verify your email with the OTP sent during registration.",
    });
    return;
  }

  const [authProfile] = await db
    .select()
    .from(authoritiesTable)
    .where(eq(authoritiesTable.userId, user.id))
    .limit(1);

  const token = await signAccessToken({
    userId: user.id,
    role: user.role as "user" | "authority" | "admin",
    email: user.email,
    authorityId: authProfile?.id,
  });

  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

// GET /api/users/leaderboard (must come before /:id)
router.get("/leaderboard", async (req, res) => {
  const parseResult = GetLeaderboardQueryParams.safeParse(req.query);
  const limit = parseResult.success ? (parseResult.data.limit ?? 10) : 10;

  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.points))
    .limit(limit);

  const leaderboard = users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    name: u.name,
    points: u.points,
    badge: u.badge,
    totalReports: u.totalReports,
    resolvedReports: u.resolvedReports,
  }));

  res.json(leaderboard);
});

// GET /api/users/:id/issues  (must come before /:id)
router.get("/:id/issues", async (req, res) => {
  const parseResult = GetUserParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_params", message: "Invalid user ID" });
    return;
  }

  const issues = await db
    .select()
    .from(issuesTable)
    .where(eq(issuesTable.userId, parseResult.data.id))
    .orderBy(desc(issuesTable.createdAt))
    .limit(100);

  res.json(issues);
});

// POST /api/users — legacy quick-register (verified). Prefer /auth/register + OTP for production.
router.post("/", async (req, res) => {
  const parseResult = CreateUserBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { name, email, password, phone } = parseResult.data;
  const passwordHash = await hashPassword(password);

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "email_exists", message: "Email already registered" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, phone: phone ?? null, role: "user", emailVerified: true })
    .returning();

  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json(safeUser);
});

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  const parseResult = GetUserParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_params", message: "Invalid user ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseResult.data.id));
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }

  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

export default router;
