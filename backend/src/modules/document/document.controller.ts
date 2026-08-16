import type { Request, Response } from 'express';
import { DocumentService } from './document.repository.js';

export class DocumentController {
  // POST /api/documents
  static async create(req: Request, res: Response) {
    try {
      // req.user.id đã được authenticateJwt đảm bảo
      // req.body.title đã được Zod trim / validate
      const doc = await DocumentService.createDocument(req.user!.id, req.body.title);
      return res.status(201).json(doc);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/documents/my-documents
  static async getByUser(req: Request, res: Response) {
    try {
      const docs = await DocumentService.getDocumentsByUser(req.user!.id);
      return res.json(docs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/documents/:id
  static async getById(req: Request, res: Response) {
    try {
      // req.params.id đã được Zod đảm bảo là UUID / string hợp lệ
      const doc = await DocumentService.getDocumentById(req.params.id as string);
      return res.json(doc);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH /api/documents/:id
  static async update(req: Request, res: Response) {
    try {
      // req.params.id và req.body (có ít nhất 1 field) đã được Zod validate 100%
      const updated = await DocumentService.updateDocument(req.params.id as string, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/documents/:id
  static async remove(req: Request, res: Response) {
    try {
      await DocumentService.deleteDocument(req.params.id as string);
      return res.json({ message: 'Document deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}