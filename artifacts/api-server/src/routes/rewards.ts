import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, rewardsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  GetUserRewardsParams,
  WithdrawRewardsBody,
} from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

// POST /api/rewards/withdraw (before /:userId)
router.post("/withdraw", async (req, res) => {
  const parseResult = WithdrawRewardsBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { userId, points, upiId } = parseResult.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }

  if (user.points < points) {
    res.status(400).json({ error: "insufficient_points", message: "Not enough points" });
    return;
  }

  const amount = points / 10; // 10 points = ₹1
  const transactionId = `TXN_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

  await db.update(usersTable).set({ points: sql`points - ${points}` }).where(eq(usersTable.id, userId));
  await db.insert(rewardsTable).values({
    userId,
    type: "withdrawn",
    points,
    description: `Withdrawal of ${points} pts (₹${amount}) to UPI: ${upiId}`,
    upiId,
    transactionId,
  });

  res.json({
    success: true,
    transactionId,
    amount,
    message: `₹${amount} will be credited to ${upiId} within 24 hours`,
  });
});

// GET /api/rewards/:userId
router.get("/:userId", async (req, res) => {
  const parseResult = GetUserRewardsParams.safeParse({ userId: Number(req.params.userId) });
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_params", message: "Invalid user ID" });
    return;
  }

  const { userId } = parseResult.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }

  const transactions = await db
    .select()
    .from(rewardsTable)
    .where(eq(rewardsTable.userId, userId))
    .orderBy(desc(rewardsTable.createdAt))
    .limit(50);

  const withdrawn = transactions
    .filter((t) => t.type === "withdrawn")
    .reduce((sum, t) => sum + t.points, 0);

  res.json({
    userId,
    totalPoints: user.points,
    cashValue: user.points / 10,
    pendingWithdrawal: 0,
    totalWithdrawn: withdrawn / 10,
    badge: user.badge,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      points: t.points,
      description: t.description,
      createdAt: t.createdAt,
    })),
  });
});

export default router;
