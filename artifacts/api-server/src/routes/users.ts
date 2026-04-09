import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, rewardsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  CreateUserBody,
  GetUserParams,
  LoginUserBody,
  GetLeaderboardQueryParams,
} from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// POST /api/users/login (must come before /:id)
router.post("/login", async (req, res) => {
  const parseResult = LoginUserBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { email, password } = parseResult.data;
  const hash = hashPassword(password);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user || user.passwordHash !== hash) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    return;
  }

  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token: `token_${user.id}_${Date.now()}` });
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

// POST /api/users
router.post("/", async (req, res) => {
  const parseResult = CreateUserBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { name, email, password, phone } = parseResult.data;
  const passwordHash = hashPassword(password);

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "email_exists", message: "Email already registered" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, phone: phone ?? null, role: "user" })
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
