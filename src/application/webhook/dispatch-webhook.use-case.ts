import { WebhookEvent } from "../../domain/webhook/entities/webhook.entity";
import { WebhookRepository } from "../../domain/webhook/repositories/webhook.repository";

export type WebhookDispatchPayload = {
    event: WebhookEvent;
    jobId: string;
    data: Record<string, unknown>;
}

const deliverWebhook = async (url: string, payload: WebhookDispatchPayload): Promise<void> => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Event': payload.event },
            body: JSON.stringify({ event: payload.event, jobId: payload.jobId, data: payload.data, timestamp: new Date().toISOString() }),
        });
        if (!response.ok) {
            console.error(`[Webhook] Delivery failed to ${url}: ${response.status}`);
        }
    } catch (err) {
        console.error(`[Webhook] Network error delivering to ${url}:`, err);
    }
}

export const makeDispatchWebhookUseCase =
    (webhookRepo: WebhookRepository) =>
        async (payload: WebhookDispatchPayload): Promise<void> => {
            const webhooks = await webhookRepo.findByEvent(payload.event);
            await Promise.allSettled(webhooks.map((w) => deliverWebhook(w.url, payload)));
        };