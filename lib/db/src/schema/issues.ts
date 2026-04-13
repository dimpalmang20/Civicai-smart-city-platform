import { pgTable, serial, integer, text, numeric, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { authoritiesTable } from "./authorities";

/** Citizen complaints are stored in the `issues` table (legacy name); API exposes them as "issues". */

export const issueTypeEnum = pgEnum("issue_type", [
  "garbage",
  "pothole",
  "water_leakage",
  "street_light",
  "plastic",
  "other",
]);

export const issueStatusEnum = pgEnum("issue_status", [
  "pending",
  "in_progress",
  "resolved",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "flagged",
  "rejected",
  "approved",
]);

export const issuesTable = pgTable("issues", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  /** Department officer account assigned at creation time from issue type routing. */
  authorityId: integer("authority_id").references(() => authoritiesTable.id),
  issueType: issueTypeEnum("issue_type").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
  reporterLatitude: numeric("reporter_latitude", { precision: 10, scale: 7 }),
  reporterLongitude: numeric("reporter_longitude", { precision: 10, scale: 7 }),
  address: text("address").notNull(),
  status: issueStatusEnum("status").notNull().default("pending"),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
  isDuplicate: boolean("is_duplicate").notNull().default(false),
  isValid: boolean("is_valid").notNull().default(true),
  validationNotes: text("validation_notes"),
  department: text("department").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }),
  resolvedImageUrl: text("resolved_image_url"),
  imageHash: text("image_hash").notNull(),
  imageMd5: text("image_md5"),
  imagePhash: text("image_phash"),
  exifTakenAt: timestamp("exif_taken_at"),
  exifLatitude: numeric("exif_latitude", { precision: 10, scale: 7 }),
  exifLongitude: numeric("exif_longitude", { precision: 10, scale: 7 }),
  reporterName: text("reporter_name"),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIssueSchema = createInsertSchema(issuesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issuesTable.$inferSelect;
