import { deleteWebhookUseCase, getWebhooksUseCase, registerWebhookUseCase } from "../../container";
import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/http/types';

export const webhookController = {
    register: async (req: AuthRequest, res: Response): Promise<void> => {
        const result = await registerWebhookUseCase({ ...req.body, userId: req.user!.userId });
        if (!result.success) { res.status(400).json({ message: result.error }); return; }
        res.status(201).json({ message: 'Webhook đã đăng ký', data: result.value });
    },

    getAll: async (req: AuthRequest, res: Response): Promise<void> => {
        const webhooks = await getWebhooksUseCase(req.user!.userId);
        res.status(200).json(webhooks);
    },

    delete: async (req: AuthRequest, res: Response): Promise<void> => {
        const idParam = req.params.id;

        if (Array.isArray(idParam)) {
            res.status(400).json({ message: 'Invalid id' });
            return;
        }
        const result = await deleteWebhookUseCase(idParam, req.user!.userId, req.user!.role);
        if (!result.success) { res.status(400).json({ message: result.error }); return; }
        res.status(200).json(result.value);
    },
};