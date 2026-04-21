import { Request } from 'express';

export type JWTPayload = {
    userId: string;
    email: string;
    role: 'USER' | 'ADMIN';
};


export interface AuthRequest extends Request {
    user?: JWTPayload;
}