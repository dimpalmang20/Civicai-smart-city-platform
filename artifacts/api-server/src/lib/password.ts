import crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/** New passwords use bcrypt. Legacy installs may still have SHA-256 hex digests. */
export function isLegacySha256Hash(stored: string): boolean {
  return /^[a-f0-9]{64}$/i.test(stored);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isLegacySha256Hash(stored)) {
    const legacy = crypto.createHash("sha256").update(plain).digest("hex");
    return legacy.toLowerCase() === stored.toLowerCase();
  }
  return bcrypt.compare(plain, stored);
}
