import { Response } from 'express';
import { getRepository } from '../config/database';
import { ReconciliationResult, ReconciliationStatus } from '../entities';
import { ReconciliationService } from '../services/reconciliation.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class ReconciliationController {
  async runReconciliation(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { declarationIds, packageNos, strictMode } = req.body;
    
    const service = new ReconciliationService();
    const stats = await service.runReconciliation({
      declarationIds,
      packageNos,
      strictMode
    });

    res.json({
      batchNo: service['batchNo'],
      stats
    });
  }

  async listResults(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = 1, limit = 20, status, batchNo, packageNo } = req.query;
    
    const resultRepo = getRepository(ReconciliationResult);
    let query = resultRepo.createQueryBuilder('r');

    if (status) {
      query = query.where('r.status = :status', { status });
    }
    if (batchNo) {
      query = query.andWhere('r.batchNo = :batchNo', { batchNo });
    }
    if (packageNo) {
      query = query.andWhere('r.packageNo LIKE :packageNo', { packageNo: `%${packageNo}%` });
    }

    const [results, total] = await query
      .orderBy('r.createdAt', 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .getManyAndCount();

    res.json({
      data: results,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total
      }
    });
  }

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const resultRepo = getRepository(ReconciliationResult);
    const result = await resultRepo.findOne({ where: { id } });

    if (!result) {
      res.status(404).json({ error: '对账结果不存在' });
      return;
    }

    res.json(result);
  }

  async getPlaybackChain(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { declarationId } = req.params;
    
    const service = new ReconciliationService();
    const chain = await service.getPlaybackChain(declarationId);

    if (!chain) {
      res.status(404).json({ error: '回放链路不存在' });
      return;
    }

    res.json(chain);
  }

  async resolve(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    
    const resultRepo = getRepository(ReconciliationResult);
    const result = await resultRepo.findOne({ where: { id } });

    if (!result) {
      res.status(404).json({ error: '对账结果不存在' });
      return;
    }

    result.status = ReconciliationStatus.RESOLVED;
    result.resolvedBy = req.user?.userId;
    result.resolvedAt = new Date();
    result.resolutionNotes = resolutionNotes;

    await resultRepo.save(result);
    res.json(result);
  }
}

export const reconciliationController = new ReconciliationController();
