import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable, emailOtpsTable, authoritiesTable } from "@workspace/db";
import { eq, desc, and, isNull, gt } from "drizzle-orm";
import { hashPassword } from "../lib/password";
import { signAccessToken } from "../lib/jwt";
import { logger } from "../lib/logger";
import {
  RegisterUserBody,
  VerifyRegistrationOtpBody,
  ResendRegistrationOtpBody,
} from "@workspace/api-zod";

const router = Router();

function otpSecret(): string {
  return process.env["OTP_HMAC_SECRET"] ?? process.env["JWT_SECRET"] ?? "dev-otp-secret";
}

function hashOtp(email: string, code: string): string {
  return crypto.createHmac("sha256", otpSecret()).update(`${email}:${code}`).digest("hex");
}

function generateOtpCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

async function sendOtpToUser(email: string, code: string, purpose: string): Promise<void> {
  // Production: plug SES/SendGrid/Twilio here. We log in dev for a frictionless demo.
  logger.info({ email, purpose, otp: code }, "OTP generated (set LOG_OTP_TO_CONSOLE=false to hide code in logs)");
  if (process.env["LOG_OTP_TO_CONSOLE"] !== "false") {
    logger.info(`[CivicAI OTP] ${email} → ${code} (${purpose})`);
  }
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { name, email, password, phone } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "email_exists", message: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      email,
      passwordHash,
      phone: phone ?? null,
      role: "user",
      emailVerified: false,
    })
    .returning();

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(emailOtpsTable).values({
    destination: email,
    codeHash: hashOtp(email, code),
    purpose: "register",
    expiresAt,
  });

  await sendOtpToUser(email, code, "register");

  res.status(201).json({
    userId: user.id,
    message: "Verification code sent. Enter the OTP to activate your account.",
  });
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  const parsed = VerifyRegistrationOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { email, code } = parsed.data;
  const expectedHash = hashOtp(email, code);

  const [row] = await db
    .select()
    .from(emailOtpsTable)
    .where(
      and(
        eq(emailOtpsTable.destination, email),
        eq(emailOtpsTable.codeHash, expectedHash),
        isNull(emailOtpsTable.consumedAt),
        gt(emailOtpsTable.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(emailOtpsTable.createdAt))
    .limit(1);

  if (!row) {
    res.status(400).json({ error: "invalid_otp", message: "Invalid or expired code" });
    return;
  }

  await db.update(emailOtpsTable).set({ consumedAt: new Date() }).where(eq(emailOtpsTable.id, row.id));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }

  await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, user.id));

  const [authProfile] = await db
    .select()
    .from(authoritiesTable)
    .where(eq(authoritiesTable.userId, user.id))
    .limit(1);

  const { passwordHash: _, ...safe } = user;
  const token = await signAccessToken({
    userId: user.id,
    role: user.role as "user" | "authority" | "admin",
    email: user.email,
    authorityId: authProfile?.id,
  });

  res.json({ user: { ...safe, emailVerified: true }, token });
});

// POST /api/auth/resend-otp
router.post("/resend-otp", async (req, res) => {
  const parsed = ResendRegistrationOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { email } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }
  if (user.emailVerified) {
    res.status(400).json({ error: "already_verified", message: "Email already verified" });
    return;
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db.insert(emailOtpsTable).values({
    destination: email,
    codeHash: hashOtp(email, code),
    purpose: "register",
    expiresAt,
  });
  await sendOtpToUser(email, code, "register_resend");

  res.json({ ok: true, message: "A new code was sent." });
});
// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password, isAuthorityLogin } = req.body as {
    email: string;
    password: string;
    isAuthorityLogin?: boolean;
  };

  // 1. Check user exists
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    return res.status(404).json({
      error: "not_found",
      message: "User not found",
    });
  }
  // ✅ NEW: Authority login restriction
  if (isAuthorityLogin) {
    // Only authority role allowed
    if (user.role !== "authority") {
      return res.status(403).json({
        error: "not_authority",
        message: "Use authority account",
      });
    }

    // Only civicai.in emails allowed
    if (!user.email.endsWith("@civicai.in")) {
      return res.status(403).json({
        error: "invalid_domain",
        message: "Only civicai.in emails allowed",
      });
    }
  }

  // 2. Check password (simple for now)
  if (password !== "1234") {
    return res.status(401).json({
      error: "invalid_password",
      message: "Wrong password",
    });
  }

  // 3. Check verified
  if (!user.emailVerified) {
    return res.status(400).json({
      error: "not_verified",
      message: "Please verify OTP first",
    });
  }

  // 4. Generate token
  const token = await signAccessToken({
    userId: user.id,
    role: user.role as "user" | "authority" | "admin",
    email: user.email,
  });

  return res.json({
    message: "Login successful",
    token,
    user,
  });
});

export default router;
