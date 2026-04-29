import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthRequest } from '../types';

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Missing hoặc invalid token' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);
        console.log('decoded:', decoded);

        req.user = decoded || undefined;
        next();
    } catch {
        res.status(401).json({ message: 'Token hết hạn hoặc không hợp lệ' });
    }
}

export const authorizeRoles =
    (...roles: ('USER' | 'ADMIN')[]) => (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ message: 'Chưa xác thực' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
            return;
        }
        next();
    }
