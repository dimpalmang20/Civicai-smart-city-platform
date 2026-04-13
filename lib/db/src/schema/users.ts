import { pgTable, serial, text, integer, timestamp, pgEnum, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "authority", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  /** After OTP verification; existing rows default true so logins keep working. */
  emailVerified: boolean("email_verified").notNull().default(true),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("user"),
  department: text("department"), // for authority accounts
  points: integer("points").notNull().default(0),
  badge: text("badge"),
  totalReports: integer("total_reports").notNull().default(0),
  resolvedReports: integer("resolved_reports").notNull().default(0),
  validReports: integer("valid_reports").notNull().default(0),
  rejectedReports: integer("rejected_reports").notNull().default(0),
  trustScore: numeric("trust_score", { precision: 5, scale: 4 }).notNull().default("1.0000"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
