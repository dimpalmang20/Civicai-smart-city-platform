import { pgTable, serial, integer, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

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

export const issuesTable = pgTable("issues", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  issueType: issueTypeEnum("issue_type").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
  address: text("address").notNull(),
  status: issueStatusEnum("status").notNull().default("pending"),
  department: text("department").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }),
  resolvedImageUrl: text("resolved_image_url"),
  imageHash: text("image_hash").notNull(),
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
