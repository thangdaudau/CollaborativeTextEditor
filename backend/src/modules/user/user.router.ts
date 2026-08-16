import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticateJwt } from '../../shared/middlewares/auth.middleware.js';
import { validate } from '../../shared/middlewares/validate.middleware.js';
import { searchUserSchema } from './user.schema.js';

const userRouter = Router();

userRouter.get(
  '/search',
  authenticateJwt,
  validate(searchUserSchema),
  UserController.search
);

export default userRouter;
