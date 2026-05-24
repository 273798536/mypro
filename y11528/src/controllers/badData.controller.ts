import { Response } from 'express';
import { getRepository } from '../config/database';
import { BadDataRecord, BadDataStatus } from '../entities';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class BadDataController {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = 1, limit = 20, status, errorType, sourceType } = req.query;
    
    const badDataRepo = getRepository(BadDataRecord);
    let query = badDataRepo.createQueryBuilder('b');

    if (status) {
      query = query.where('b.status = :status', { status });
    }
    if (errorType) {
      query = query.andWhere('b.errorType = :errorType', { errorType });
    }
    if (sourceType) {
      query = query.andWhere('b.sourceType = :sourceType', { sourceType });
    }

    const [records, total] = await query
      .orderBy('b.createdAt', 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .getManyAndCount();

    res.json({
      data: records,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total
      }
    });
  }

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const badDataRepo = getRepository(BadDataRecord);
    const record = await badDataRepo.findOne({ where: { id } });

    if (!record) {
      res.status(404).json({ error: '坏数据记录不存在' });
      return;
    }

    res.json(record);
  }

  async fix(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { fixNotes, correctionRecordId } = req.body;
    
    const badDataRepo = getRepository(BadDataRecord);
    const record = await badDataRepo.findOne({ where: { id } });

    if (!record) {
      res.status(404).json({ error: '坏数据记录不存在' });
      return;
    }

    record.status = BadDataStatus.FIXED;
    record.fixedBy = req.user?.userId;
    record.fixedAt = new Date();
    record.fixNotes = fixNotes;
    record.correctionRecordId = correctionRecordId;

    await badDataRepo.save(record);
    res.json(record);
  }

  async discard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { fixNotes } = req.body;
    
    const badDataRepo = getRepository(BadDataRecord);
    const record = await badDataRepo.findOne({ where: { id } });

    if (!record) {
      res.status(404).json({ error: '坏数据记录不存在' });
      return;
    }

    record.status = BadDataStatus.DISCARDED;
    record.fixedBy = req.user?.userId;
    record.fixedAt = new Date();
    record.fixNotes = fixNotes;

    await badDataRepo.save(record);
    res.json(record);
  }
}

export const badDataController = new BadDataController();
