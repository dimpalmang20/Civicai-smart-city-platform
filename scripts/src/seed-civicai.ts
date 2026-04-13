/**
 * Seeds demo users + authority profiles (bcrypt passwords).
 * Run: `DATABASE_URL=... npx pnpm --filter @workspace/scripts exec tsx ./src/seed-civicai.ts`
 */
import { db } from "@workspace/db";
import { usersTable, authoritiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const DEMO_PASSWORD = "password123";

async function upsertUser(input: {
  name: string;
  email: string;
  role: "user" | "authority" | "admin";
  department?: string;
}) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, input.email)).limit(1);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  if (existing[0]) {
    await db
      .update(usersTable)
      .set({
        name: input.name,
        passwordHash,
        role: input.role,
        department: input.department ?? null,
        emailVerified: true,
      })
      .where(eq(usersTable.id, existing[0].id));
    return existing[0].id;
  }
  const [u] = await db
    .insert(usersTable)
    .values({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      department: input.department ?? null,
      emailVerified: true,
    })
    .returning();
  return u.id;
}

async function ensureAuthorityProfile(
  userId: number,
  departmentKey: string,
  organizationName: string,
) {
  const existing = await db.select().from(authoritiesTable).where(eq(authoritiesTable.userId, userId)).limit(1);
  if (existing[0]) {
    await db
      .update(authoritiesTable)
      .set({ departmentKey, organizationName })
      .where(eq(authoritiesTable.id, existing[0].id));
    return;
  }
  await db.insert(authoritiesTable).values({ userId, departmentKey, organizationName });
}

async function main() {
  await upsertUser({ name: "Amit Singh", email: "amit@example.com", role: "user" });
  const munUser = await upsertUser({
    name: "Municipality Officer",
    email: "municipality@civicai.in",
    role: "authority",
    department: "Sanitation Department",
  });
  const pwdUser = await upsertUser({
    name: "PWD Officer",
    email: "pwd@civicai.in",
    role: "authority",
    department: "PWD Department",
  });

  await ensureAuthorityProfile(munUser, "sanitation", "Sanitation Department");
  await ensureAuthorityProfile(pwdUser, "pwd", "PWD Department");

  // eslint-disable-next-line no-console
  console.info("Seed complete. Citizen:", amit, "Authorities provisioned for sanitation + pwd.");
  // eslint-disable-next-line no-console
  console.info(`Demo password for all: ${DEMO_PASSWORD}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
