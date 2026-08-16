import { Router } from 'express';
import { PermissionController } from './permission.controller.js';
import { authenticateJwt } from '../../shared/middlewares/auth.middleware.js';
import { requireDocPermission } from '../../shared/middlewares/permission.middleware.js';
import { validate } from '../../shared/middlewares/validate.middleware.js';
import {
  listPermissionsSchema,
  addPermissionSchema,
  deletePermissionSchema,
} from './permission.schema.js';

const permissionRouter = Router({ mergeParams: true });

permissionRouter.get(
  '/',
  authenticateJwt,
  validate(listPermissionsSchema),
  requireDocPermission('VIEWER'),
  PermissionController.list
);

permissionRouter.post(
  '/',
  authenticateJwt,
  validate(addPermissionSchema),
  requireDocPermission('OWNER'),
  PermissionController.grant
);

permissionRouter.delete(
  '/:userId',
  authenticateJwt,
  validate(deletePermissionSchema),
  requireDocPermission('OWNER'),
  PermissionController.revoke
);

export default permissionRouter;
