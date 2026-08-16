import { Router } from 'express';
import { DocumentController } from './document.controller.js';
import { authenticateJwt, optionalJwt } from '../../shared/middlewares/auth.middleware.js';
import { requireDocPermission } from '../../shared/middlewares/permission.middleware.js';
import { validate } from '../../shared/middlewares/validate.middleware.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentIdParamSchema,
} from './document.schema.js';

const documentRouter = Router();

documentRouter.post(
  '/',
  authenticateJwt,
  validate(createDocumentSchema),
  DocumentController.create
);

documentRouter.get('/my-documents', authenticateJwt, DocumentController.getByUser);

documentRouter.get(
  '/:id',
  optionalJwt,
  validate(documentIdParamSchema),
  requireDocPermission('VIEWER'),
  DocumentController.getById
);

documentRouter.patch(
  '/:id',
  optionalJwt,
  validate(updateDocumentSchema),
  requireDocPermission('EDITOR'),
  DocumentController.update
);

documentRouter.delete(
  '/:id',
  authenticateJwt,
  validate(documentIdParamSchema),
  requireDocPermission('OWNER'),
  DocumentController.remove
);

export default documentRouter;
