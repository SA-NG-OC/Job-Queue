import { Request, Response } from 'express';
import { registerUseCase, loginUseCase, refreshTokenUseCase } from '../../container';
import { AuthRequest } from '../../infrastructure/http/types';

export const authController = {
    register: async (req: Request, res: Response): Promise<void> => {
        const result = await registerUseCase(req.body);
        if (!result.success) { res.status(400).json({ message: result.error }); return; }
        res.status(201).json({ message: 'Đăng ký thành công', ...result.value });
    },

    login: async (req: Request, res: Response): Promise<void> => {
        const result = await loginUseCase(req.body);
        if (!result.success) { res.status(401).json({ message: result.error }); return; }
        res.status(200).json({ message: 'Đăng nhập thành công', ...result.value });
    },

    refresh: async (req: Request, res: Response): Promise<void> => {
        const result = await refreshTokenUseCase(req.body);
        if (!result.success) { res.status(401).json({ message: result.error }); return; }
        res.status(200).json(result.value);
    },

    logout: async (_req: Request, res: Response): Promise<void> => {
        res.status(200).json({ message: 'Đăng xuất thành công' });
    },

    getMe: async (req: AuthRequest, res: Response): Promise<void> => {
        res.status(200).json(req.user);
    },
};