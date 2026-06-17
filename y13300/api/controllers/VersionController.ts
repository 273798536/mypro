import type { Request, Response, NextFunction } from 'express';
import { VersionService, DiffService } from '../services/index.js';
import type { EvidenceSource, TicketStatus } from '../../shared/types.js';

export class VersionController {
  private versionService: VersionService;
  private diffService: DiffService;

  constructor() {
    this.versionService = new VersionService();
    this.diffService = new DiffService();
  }

  listVersions = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID is required',
        });
        return;
      }

      const versions = this.versionService.listVersions(id);

      res.status(200).json({
        success: true,
        data: versions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version list',
      });
    }
  };

  createVersion = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { evidences, changeNote, modelVersion } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID is required',
        });
        return;
      }

      if (!modelVersion) {
        res.status(400).json({
          success: false,
          error: 'modelVersion is required',
        });
        return;
      }

      if (!changeNote) {
        res.status(400).json({
          success: false,
          error: 'changeNote is required',
        });
        return;
      }

      if (!evidences || !Array.isArray(evidences)) {
        res.status(400).json({
          success: false,
          error: 'evidences array is required',
        });
        return;
      }

      const validSources: EvidenceSource[] = ['import', 'supplement', 'auto', 'manual'];
      for (let i = 0; i < evidences.length; i++) {
        const evidence = evidences[i];
        if (!evidence.content) {
          res.status(400).json({
            success: false,
            error: `Evidence at index ${i} is missing content`,
          });
          return;
        }
        if (!validSources.includes(evidence.source as EvidenceSource)) {
          res.status(400).json({
            success: false,
            error: `Evidence at index ${i} has invalid source`,
          });
          return;
        }
      }

      const createdBy = req.body.createdBy || 'system';

      const newVersion = this.versionService.createVersion({
        ticketId: id,
        modelVersion,
        summary: req.body.summary || '',
        status: (req.body.status as TicketStatus) || 'processing',
        createdBy,
        changeNote,
        evidences: evidences.map(e => ({
          content: e.content,
          source: e.source as EvidenceSource,
          isSampleLeak: e.isSampleLeak ?? false,
          importBatch: e.importBatch || '',
        })),
      });

      res.status(201).json({
        success: true,
        data: newVersion,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('工单不存在')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create version',
      });
    }
  };

  lockVersion = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { version, operator } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID is required',
        });
        return;
      }

      if (version === undefined || version === null) {
        res.status(400).json({
          success: false,
          error: 'Version is required',
        });
        return;
      }

      if (!operator) {
        res.status(400).json({
          success: false,
          error: 'Operator is required',
        });
        return;
      }

      const versionNum = typeof version === 'number' ? version : parseInt(version as string, 10);

      if (isNaN(versionNum) || versionNum < 1) {
        res.status(400).json({
          success: false,
          error: 'Invalid version number',
        });
        return;
      }

      const lockedVersion = this.versionService.lockVersion(id, versionNum, operator);

      res.status(200).json({
        success: true,
        data: lockedVersion,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('工单不存在') || error.message.includes('版本不存在')) {
          res.status(404).json({
            success: false,
            error: error.message,
          });
          return;
        }
        if (error.message.includes('已锁定')) {
          res.status(400).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to lock version',
      });
    }
  };

  unlockVersion = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { operator } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID is required',
        });
        return;
      }

      if (!operator) {
        res.status(400).json({
          success: false,
          error: 'Operator is required',
        });
        return;
      }

      const unlockedVersion = this.versionService.unlockVersion(id, operator);

      res.status(200).json({
        success: true,
        data: unlockedVersion,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('工单不存在') || error.message.includes('锁定版本不存在')) {
          res.status(404).json({
            success: false,
            error: error.message,
          });
          return;
        }
        if (error.message.includes('没有锁定版本')) {
          res.status(400).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlock version',
      });
    }
  };

  compareVersions = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { v1, v2 } = req.query;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID is required',
        });
        return;
      }

      if (!v1 || !v2) {
        res.status(400).json({
          success: false,
          error: 'Both v1 and v2 version parameters are required',
        });
        return;
      }

      const version1 = parseInt(v1 as string, 10);
      const version2 = parseInt(v2 as string, 10);

      if (isNaN(version1) || isNaN(version2) || version1 < 1 || version2 < 1) {
        res.status(400).json({
          success: false,
          error: 'Invalid version numbers',
        });
        return;
      }

      const diffResult = this.diffService.compareVersions(id, version1, version2);

      res.status(200).json({
        success: true,
        data: {
          v1: version1,
          v2: version2,
          diff: diffResult,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare versions',
      });
    }
  };

  getVersionDetail = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const { id, version } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID is required',
        });
        return;
      }

      if (!version) {
        res.status(400).json({
          success: false,
          error: 'Version number is required',
        });
        return;
      }

      const versionNum = parseInt(version, 10);

      if (isNaN(versionNum) || versionNum < 1) {
        res.status(400).json({
          success: false,
          error: 'Invalid version number',
        });
        return;
      }

      const versionData = this.versionService.getVersion(id, versionNum);

      if (!versionData) {
        res.status(404).json({
          success: false,
          error: 'Version not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: versionData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version detail',
      });
    }
  };
}
