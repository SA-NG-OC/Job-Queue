import { BaseEntity } from '../../shared/entity.base';
import { Result, ok, err } from '../../shared/result';

export const WEBHOOK_EVENTS = [
    'job.completed',
    'job.failed',
    'job.cancelled',
    'job.retried',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export type WebhookEntity = BaseEntity & {
    url: string;
    events: WebhookEvent[];
    isActive: boolean;
    userId: string;
    createdAt: Date;
};

export const createWebhookEntity = (
    id: string,
    props: Omit<WebhookEntity, 'id'>
): WebhookEntity => ({ id, ...props });

export const buildNewWebhook = (
    id: string,
    url: string,
    events: string[],
    userId: string
): Result<WebhookEntity> => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return err('URL webhook phải bắt đầu bằng http:// hoặc https://');
    }

    const validEvents = events.filter((e): e is WebhookEvent =>
        WEBHOOK_EVENTS.includes(e as WebhookEvent)
    );

    if (validEvents.length === 0) {
        return err(`Cần ít nhất 1 event hợp lệ. Các event hợp lệ: ${WEBHOOK_EVENTS.join(', ')}`);
    }

    return ok(createWebhookEntity(id, {
        url: url.trim(),
        events: validEvents,
        isActive: true,
        userId,
        createdAt: new Date(),
    }))
}

export const webhookToJSON = (w: WebhookEntity) => ({
    id: w.id,
    url: w.url,
    events: w.events,
    isActive: w.isActive,
    userId: w.userId,
    createdAt: w.createdAt,
});