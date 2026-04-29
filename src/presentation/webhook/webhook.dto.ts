import { WEBHOOK_EVENTS } from '../../domain/webhook/entities/webhook.entity';
import z from 'zod';

export const registerWebhookSchema = z.object({
    body: z.object({
        url: z.string().url('URL không hợp lệ'),
        events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, 'Cần ít nhất 1 event'),
    }),
});

export const webhookIdSchema = z.object({
    params: z.object({ id: z.string().uuid('Webhook ID không hợp lệ') }),
});