import { Router } from 'express';
import { authController } from '../../../application/auth/auth.controller';

const authRouters = Router();

authRouters.post('/register', authController.register);
authRouters.post('/login', authController.login);
authRouters.post('/refresh', authController.refresh);
authRouters.post('/logout', authController.logout);


authRouters.get('/me', authController.getMe);

export default authRouters;