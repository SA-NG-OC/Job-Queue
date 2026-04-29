import { WebhookEntity, WebhookEvent } from '../entities/webhook.entity';

export type WebhookRepository = {
    findById: (id: string) => Promise<WebhookEntity | null>;
    findByUserId: (userId: string) => Promise<WebhookEntity[]>;
    findByEvent: (event: WebhookEvent) => Promise<WebhookEntity[]>;
    save: (webhook: WebhookEntity) => Promise<WebhookEntity>;
    delete: (id: string) => Promise<void>;
};