import { UserRole } from "../../domain/auth/entities/user.entity";
import { err, ok, Result } from "../../domain/shared/result";
import { WebhookRepository } from "../../domain/webhook/repositories/webhook.repository";

export const makeDeleteWebhookUseCase =
    (webhookRepo: WebhookRepository) =>
        async (
            id: string,
            requesterId: string,
            requesterRole: UserRole
        ): Promise<Result<{ message: string }>> => {
            const webhook = await webhookRepo.findById(id);
            if (!webhook) return err('Webhook không tìm thấy');

            if (requesterRole !== 'ADMIN' && webhook.userId !== requesterId) {
                return err('Bạn không có quyền xóa webhook này');
            }

            await webhookRepo.delete(id);
            return ok({ message: 'Xóa webhook thành công' });
        };