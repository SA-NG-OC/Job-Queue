import { v4 as uuidv4 } from 'uuid';
import { WebhookRepository } from '../../domain/webhook/repositories/webhook.repository';
import { buildNewWebhook, webhookToJSON } from '../../domain/webhook/entities/webhook.entity';
import { err, ok } from '../../domain/shared/result';
import { emitAudit } from '../../infrastructure/events/audit.listener';

export type RegisterWebhookCommand = {
    url: string;
    events: string[];
    userId: string;
};

export const makeRegisterWebhookUseCase =
    (webhookRepo: WebhookRepository) =>
        async (cmd: RegisterWebhookCommand) => {
            const webhookResult = buildNewWebhook(uuidv4(), cmd.url, cmd.events, cmd.userId);
            if (!webhookResult.success) return err(webhookResult.error);

            const saved = await webhookRepo.save(webhookResult.value);

            emitAudit({
                action: 'webhook.registered',
                userId: cmd.userId,
                meta: { webhookId: saved.id, url: saved.url, events: saved.events },
            });

            return ok(webhookToJSON(saved));
        }