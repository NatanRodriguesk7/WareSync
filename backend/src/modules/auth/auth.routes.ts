import { Router } from 'express';
import { login, forgotPassword } from './auth.controller';

export const authRoutes = Router();

authRoutes.post('/login', login);
authRoutes.post('/forgot-password', forgotPassword);
