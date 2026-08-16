import { Router } from 'express';
import { SnapshotController } from './snapshot.controller.js';
import { authenticateJwt, optionalJwt } from '../../shared/middlewares/auth.middleware.js';
import { requireDocPermission } from '../../shared/middlewares/permission.middleware.js';
import { validate } from '../../shared/middlewares/validate.middleware.js';
import {
  createSnapshotSchema,
  listSnapshotsSchema,
  getSnapshotSchema,
  restoreSnapshotSchema,
  deleteSnapshotSchema,
} from './snapshot.schema.js';

const snapshotRouter = Router({ mergeParams: true });

snapshotRouter.post(
  '/',
  authenticateJwt,
  validate(createSnapshotSchema),
  requireDocPermission('EDITOR'),
  SnapshotController.create
);

snapshotRouter.get(
  '/',
  optionalJwt,
  validate(listSnapshotsSchema),
  requireDocPermission('VIEWER'),
  SnapshotController.list
);

snapshotRouter.get(
  '/:snapshotId',
  optionalJwt,
  validate(getSnapshotSchema),
  requireDocPermission('VIEWER'),
  SnapshotController.getById
);

snapshotRouter.post(
  '/:snapshotId/restore',
  authenticateJwt,
  validate(restoreSnapshotSchema),
  requireDocPermission('EDITOR'),
  SnapshotController.restore
);

snapshotRouter.delete(
  '/:snapshotId',
  authenticateJwt,
  validate(deleteSnapshotSchema),
  requireDocPermission('OWNER'),
  SnapshotController.remove
);

export default snapshotRouter;
