import { Request } from 'express';

export type JWTPayload = {
    userId: string;
    email: string;
    role: string;
};


export interface AuthRequest extends Request {
    user?: JWTPayload;
}