import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/http/types';
import { getAuditLogsUseCase } from '../../container';

export const auditController = {
    getLogs: async (req: AuthRequest, res: Response): Promise<void> => {
        const filter = {
            ...req.query,
            page: req.query.page ? Number(req.query.page) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            userId: req.user!.role === 'ADMIN' ? undefined : req.user!.userId,
        };
        const result = await getAuditLogsUseCase(filter);
        res.status(200).json(result);
    },
};
