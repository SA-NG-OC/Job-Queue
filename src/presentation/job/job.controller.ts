import { cancelJobUseCase, createJobUseCase, getJobByIdUseCase, getJobsUseCase, retryJobUseCase } from "../../container";
import { AuthRequest } from "../../infrastructure/http/types";
import { Response, Request } from "express";

export const jobController = {
    createJob: async (req: AuthRequest, res: Response): Promise<void> => {
        const result = await createJobUseCase({
            ...req.body,
            userId: req.user!.userId,
        });
        if (!result.success) { res.status(400).json({ message: result.error }); return; }
        res.status(201).json({ message: 'Job đã được tạo', data: result.value });
    },

    getJobs: async (req: AuthRequest, res: Response): Promise<void> => {
        const result = await getJobsUseCase({
            userId: req.user!.userId,
            page: req.query.page ? Math.max(1, Number(req.query.page)) : 1,
            limit: req.query.limit ? Math.min(Number(req.query.limit), 100) : 10,
            status: req.query.status as any,
            type: req.query.type as any,
        });
        if (!result.success) { res.status(400).json({ message: result.error }); return; }
        res.status(200).json(result.value);
    },

    getJobById: async (req: AuthRequest, res: Response): Promise<void> => {
        const result = await getJobByIdUseCase(req.params.id as string, req.user!.userId);
        if (!result.success) { res.status(404).json({ message: result.error }); return; }
        res.status(200).json(result.value);
    },

    cancelJob: async (req: AuthRequest, res: Response): Promise<void> => {
        const result = await cancelJobUseCase(req.params.id as string, req.user!.userId);
        if (!result.success) { res.status(400).json({ message: result.error }); return; }
        res.status(200).json({ message: 'Job đã bị cancel', data: result.value });
    },

    retryJob: async (req: AuthRequest, res: Response): Promise<void> => {
        const result = await retryJobUseCase(req.params.id as string, req.user!.userId);
        if (!result.success) { res.status(400).json({ message: result.error }); return; }
        res.status(200).json({ message: 'Job đã được retry', data: result.value });
    },
};