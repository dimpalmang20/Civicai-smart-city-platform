import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * Authority accounts are provisioned by admins (not self-serve).
 * Each row links a `users` row (role = authority) to a department bucket for routing complaints.
 */
export const authoritiesTable = pgTable("authorities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  /** Stable key used for routing, e.g. sanitation, electricity, pwd */
  departmentKey: text("department_key").notNull(),
  /** Human label shown in dashboards */
  organizationName: text("organization_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuthoritySchema = createInsertSchema(authoritiesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAuthority = z.infer<typeof insertAuthoritySchema>;
export type Authority = typeof authoritiesTable.$inferSelect;
