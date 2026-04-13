import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Stores hashed OTP codes for email (or SMS channel stored as email-shaped id) verification. */
export const emailOtpsTable = pgTable("email_otps", {
  id: serial("id").primaryKey(),
  channel: text("channel").notNull().default("email"),
  destination: text("destination").notNull(),
  codeHash: text("code_hash").notNull(),
  purpose: text("purpose").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmailOtpSchema = createInsertSchema(emailOtpsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailOtp = z.infer<typeof insertEmailOtpSchema>;
export type EmailOtpRow = typeof emailOtpsTable.$inferSelect;
