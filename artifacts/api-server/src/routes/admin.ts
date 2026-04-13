import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, authoritiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/password";
import { AdminCreateAuthorityBody } from "@workspace/api-zod";

const router = Router();

function assertAdmin(req: { headers: { [k: string]: string | string[] | undefined } }): boolean {
  const key = process.env["ADMIN_PROVISION_KEY"];
  if (!key) return false;
  const provided = req.headers["x-admin-key"];
  return typeof provided === "string" && provided === key;
}

/**
 * Provision an authority login (manual / admin-controlled).
 * Requires `ADMIN_PROVISION_KEY` env and matching `X-Admin-Key` header.
 */
router.post("/authorities", async (req, res) => {
  if (!assertAdmin(req)) {
    res.status(403).json({ error: "forbidden", message: "Admin key missing or invalid" });
    return;
  }

  const parsed = AdminCreateAuthorityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", message: "Invalid request body" });
    return;
  }

  const { name, email, password, departmentKey, organizationName, phone } = parsed.data;

  const dup = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (dup.length > 0) {
    res.status(409).json({ error: "email_exists", message: "Email already in use" });
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
      role: "authority",
      department: organizationName,
      emailVerified: true,
    })
    .returning();

  const [authority] = await db
    .insert(authoritiesTable)
    .values({
      userId: user.id,
      departmentKey,
      organizationName,
    })
    .returning();

  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ user: safeUser, authority });
});

export default router;
