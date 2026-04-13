import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt";

export type AuthedRequest = Request & {
  auth?: AccessTokenPayload & { userId: number; authorityId?: number };
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  if (!token) {
    res.status(401).json({ error: "unauthorized", message: "Missing bearer token" });
    return;
  }
  const payload = await verifyAccessToken(token);
  if (!payload?.sub) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
    return;
  }
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) {
    res.status(401).json({ error: "unauthorized", message: "Invalid token subject" });
    return;
  }
  const authorityId =
    typeof payload.authorityId === "number"
      ? payload.authorityId
      : payload.authorityId != null
        ? Number(payload.authorityId)
        : undefined;

  req.auth = {
    ...payload,
    userId,
    authorityId: Number.isFinite(authorityId) ? authorityId : undefined,
  };
  next();
}

export function requireRole(...roles: Array<"user" | "authority" | "admin">) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role || !roles.includes(role)) {
      res.status(403).json({ error: "forbidden", message: "Insufficient role" });
      return;
    }
    next();
  };
}
