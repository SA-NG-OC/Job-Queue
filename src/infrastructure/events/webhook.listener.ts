import { appEmitter } from './event-emitter';
import { dispatchWebhookUseCase } from '../../container';
import { WebhookEvent } from '../../domain/webhook/entities/webhook.entity';

export type WebhookEmitEvent = {
    event: WebhookEvent;
    jobId: string;
    data: Record<string, unknown>;
};

export const registerWebhookListeners = (): void => {
    appEmitter.on('webhook.dispatch', async (payload: WebhookEmitEvent) => {
        try {
            await dispatchWebhookUseCase(payload);
        } catch (err) {
            console.error('[Webhook Listener] Failed to dispatch:', err);
        }
    });

    console.log('[Webhook Listener] Registered');
};

export const emitWebhook = (payload: WebhookEmitEvent): void => {
    appEmitter.emit('webhook.dispatch', payload);
};