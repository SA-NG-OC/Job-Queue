import { v4 as uuidv4 } from 'uuid';
import { WebhookRepository } from '../../domain/webhook/repositories/webhook.repository';
import { buildNewWebhook, webhookToJSON } from '../../domain/webhook/entities/webhook.entity';
import { err, ok } from '../../domain/shared/result';

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
            return ok(webhookToJSON(saved));
        }