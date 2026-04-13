import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { pushToUser } from "../realtime";

export async function createUserNotification(input: {
  userId: number;
  category: string;
  title: string;
  body: string;
  issueId?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(notificationsTable).values({
    userId: input.userId,
    category: input.category,
    title: input.title,
    body: input.body,
    issueId: input.issueId ?? null,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
  });

  pushToUser(input.userId, {
    type: "notification",
    category: input.category,
    title: input.title,
    body: input.body,
    issueId: input.issueId,
    at: new Date().toISOString(),
  });
}
