import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisConnection } from '../../queue/bullmq/client';
import { Request, Response } from 'express';
import type { RedisReply } from 'rate-limit-redis';

const createLimiter = (
    windowMs: number,
    max: number,
    message: string,
    keyPrefix: string
) =>
    rateLimit({
        windowMs,
        max,
        message: { message },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: Request) => {
            const user = (req as any).user;
            return user ? `${keyPrefix}:user:${user.userId}` : `${keyPrefix}:ip:${req.ip}`;
        },
        store: new RedisStore({
            sendCommand: (...args: string[]): Promise<RedisReply> =>
                redisConnection.call(...args as [string, ...string[]]) as Promise<RedisReply>,
            prefix: keyPrefix,
        }),
        handler: (_req: Request, res: Response) => {
            res.status(429).json({ message });
        },
    });

export const globalRateLimiter = createLimiter(
    15 * 60 * 1000,
    200,
    'Quá nhiều request. Vui lòng thử lại sau 15 phút.',
    'rl:global'
);


export const authRateLimiter = createLimiter(
    15 * 60 * 1000,
    10,
    'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.',
    'rl:auth'
);


export const jobRateLimiter = createLimiter(
    60 * 1000,
    30,
    'Bạn đang tạo job quá nhanh. Vui lòng thử lại sau.',
    'rl:job'
);