import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { webhooks } from "../../../db/schema";
import { createWebhookEntity, WebhookEntity, WebhookEvent } from "../entities/webhook.entity";
import { WebhookRepository } from "./webhook.repository";

const toEntity = (row: typeof webhooks.$inferSelect): WebhookEntity => createWebhookEntity(row.id, {
    url: row.url,
    events: row.events as WebhookEvent[],
    isActive: row.isActive,
    userId: row.userId,
    createdAt: row.createdAt,
});

export const webhookDrizzleRepository: WebhookRepository = {
    findById: async (id) => {
        const row = await db.query.webhooks.findFirst({ where: eq(webhooks.id, id) });
        return row ? toEntity(row) : null;
    },

    findByUserId: async (userId) => {
        const rows = await db.query.webhooks.findMany({
            where: eq(webhooks.userId, userId),
        });
        return rows.map(toEntity);
    },

    findByEvent: async (event) => {
        const rows = await db.query.webhooks.findMany({
            where: eq(webhooks.isActive, true),
        });
        return rows
            .filter((row) => (row.events as string[]).includes(event))
            .map(toEntity);
    },

    save: async (webhook) => {
        const [row] = await db
            .insert(webhooks)
            .values({
                id: webhook.id,
                url: webhook.url,
                events: webhook.events,
                isActive: webhook.isActive,
                userId: webhook.userId,
                createdAt: webhook.createdAt,
            })
            .returning();
        return toEntity(row);
    },

    delete: async (id) => {
        await db.delete(webhooks).where(eq(webhooks.id, id));
    },
}