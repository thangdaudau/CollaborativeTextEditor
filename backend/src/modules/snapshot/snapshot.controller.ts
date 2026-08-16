import type { Request, Response } from 'express';
import { SnapshotService } from './snapshot.service.js';

export class SnapshotController {
  static async create(req: Request, res: Response) {
    try {
      const docId = req.params.id as string;
      const snapshot = await SnapshotService.createSnapshot(docId);
      return res.status(201).json(snapshot);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const docId = req.params.id as string;
      const snapshots = await SnapshotService.getSnapshots(docId);
      return res.json(snapshots);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const docId = req.params.id as string;
      const snapshotId = req.params.snapshotId as string;
      const snapshot = await SnapshotService.getSnapshotById(docId, snapshotId);
      return res.json(snapshot);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  static async restore(req: Request, res: Response) {
    try {
      const docId = req.params.id as string;
      const snapshotId = req.params.snapshotId as string;
      const result = await SnapshotService.restoreSnapshot(docId, snapshotId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const docId = req.params.id as string;
      const snapshotId = req.params.snapshotId as string;
      const result = await SnapshotService.deleteSnapshot(docId, snapshotId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
