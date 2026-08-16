import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticateJwt } from '../../shared/middlewares/auth.middleware.js';
import { validate } from '../../shared/middlewares/validate.middleware.js';
import { loginSchema, registerSchema } from './auth.schema.js';

const authRouter = Router();

authRouter.post('/register', validate(registerSchema), AuthController.register);
authRouter.post('/login', validate(loginSchema), AuthController.login);
authRouter.get('/me', authenticateJwt, AuthController.me);

export default authRouter;