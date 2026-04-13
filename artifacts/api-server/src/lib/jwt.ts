import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export type AccessTokenPayload = JWTPayload & {
  sub: string;
  role: "user" | "authority" | "admin";
  /** Present when role is authority */
  authorityId?: number;
  email: string;
};

function getSecret(): Uint8Array {
  const secret = process.env["JWT_SECRET"] ?? "dev-only-change-me-in-production";
  return new TextEncoder().encode(secret);
}

const issuer = "civicai-api";
const audience = "civicai-clients";

export async function signAccessToken(payload: {
  userId: number;
  role: "user" | "authority" | "admin";
  email: string;
  authorityId?: number;
}): Promise<string> {
  const jwt = new SignJWT({
    role: payload.role,
    email: payload.email,
    ...(payload.authorityId != null ? { authorityId: payload.authorityId } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(process.env["JWT_EXPIRES_IN"] ?? "7d");

  return jwt.sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer,
      audience,
    });
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}
