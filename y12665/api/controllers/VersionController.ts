import type { Request, Response, NextFunction } from 'express';
import { versionService } from '../services/index.js';

export class VersionController {
  async getList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { exerciseId } = req.params;
      const versions = versionService.getVersions(exerciseId);
      res.json({ success: true, data: versions });
    } catch (err) {
      next(err);
    }
  }

  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { exerciseId, versionId } = req.params;
      const version = versionService.getVersionDetail(exerciseId, versionId);
      if (!version) {
        res.status(404).json({ success: false, error: 'Version not found' });
        return;
      }
      res.json({ success: true, data: version });
    } catch (err) {
      next(err);
    }
  }

  async rollback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { exerciseId, versionId } = req.params;
      const rolledBack = versionService.rollbackToVersion(exerciseId, versionId);
      if (!rolledBack) {
        res.status(404).json({ success: false, error: 'Exercise or version not found' });
        return;
      }
      res.json({ success: true, data: rolledBack });
    } catch (err) {
      next(err);
    }
  }
}

export const versionController = new VersionController();
