import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/http/types';
import { createScheduleUseCase, deleteScheduleUseCase, getSchedulesUseCase, toggleScheduleUseCase, updateScheduleUseCase } from '../../container';

export const scheduleController = {
    create: async (req: AuthRequest, res: Response): Promise<void> => {
        console.log('[Controller] res.json() called');
        const result = await createScheduleUseCase({ ...req.body, userId: req.user!.userId });
        console.log('[Controller] after res.json()');
        if (!result.success) {
            res.status(400).json({ message: result.error });
            return;
        }
        res.status(201).json({ message: 'Tạo schedule thành công', schedule: result.value });
    },

    getAll: async (req: AuthRequest, res: Response): Promise<void> => {
        const result = await getSchedulesUseCase({
            userId: req.user!.role === 'ADMIN' ? undefined : req.user!.userId,
            isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
            page: req.query.page ? Number(req.query.page) : 1,
            limit: req.query.limit ? Number(req.query.limit) : 10,
        });
        if (!result.success) { res.status(400).json({ message: result.error }); return; }
        res.status(200).json(result.value);
    },

    update: async (req: AuthRequest, res: Response): Promise<void> => {
        const result = await updateScheduleUseCase({
            ...req.body,
            id: req.params.id,
            requesterId: req.user!.userId,
            requesterRole: req.user!.role,
        });
        if (!result.success) { res.status(400).json({ message: result.error }); return; }
        res.status(200).json({ message: 'Cập nhật thành công', data: result.value });
    },

    toggle: async (req: AuthRequest, res: Response): Promise<void> => {
        const idParam = req.params.id;

        if (Array.isArray(idParam)) {
            res.status(400).json({ message: 'Invalid id' });
            return;
        }

        const result = await toggleScheduleUseCase(
            idParam,
            req.user!.userId,
            req.user!.role
        );

        if (!result.success) {
            res.status(400).json({ message: result.error });
            return;
        }

        res.status(200).json({
            message: `Schedule đã ${result.value.isActive ? 'bật' : 'tắt'}`,
            data: result.value
        });
    },

    delete: async (req: AuthRequest, res: Response): Promise<void> => {
        const idParam = req.params.id;

        if (Array.isArray(idParam)) {
            res.status(400).json({ message: 'Invalid id' });
            return;
        }
        const result = await deleteScheduleUseCase(idParam, req.user!.userId, req.user!.role);
        if (!result.success) { res.status(400).json({ message: result.error }); return; }
        res.status(200).json(result.value);
    },
};