import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../config/database';
import { TaxNotice, TaxNoticeStatus } from '../entities';
import { validationService } from '../services/validation.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class TaxController {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const validation = await validationService.validateTaxNotice(req.body);
    
    if (!validation.isValid) {
      res.status(400).json({
        error: '数据验证失败',
        errors: validation.errors,
        warnings: validation.warnings,
        badDataId: validation.badDataId
      });
      return;
    }

    const taxRepo = getRepository(TaxNotice);
    const notice = taxRepo.create({
      ...req.body,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await taxRepo.save(notice);
    res.status(201).json(notice);
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = 1, limit = 20, status, packageNo } = req.query;
    
    const taxRepo = getRepository(TaxNotice);
    let query = taxRepo.createQueryBuilder('t');

    if (status) {
      query = query.where('t.status = :status', { status });
    }
    if (packageNo) {
      query = query.andWhere('t.packageNo LIKE :packageNo', { packageNo: `%${packageNo}%` });
    }

    const [notices, total] = await query
      .orderBy('t.createdAt', 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .getManyAndCount();

    res.json({
      data: notices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total
      }
    });
  }

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const taxRepo = getRepository(TaxNotice);
    const notice = await taxRepo.findOne({ where: { id } });

    if (!notice) {
      res.status(404).json({ error: '补税通知不存在' });
      return;
    }

    res.json(notice);
  }

  async getByDeclarationId(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { declarationId } = req.params;
    
    const taxRepo = getRepository(TaxNotice);
    const notices = await taxRepo.find({
      where: { declarationId },
      order: { issueDate: 'DESC' }
    });

    res.json(notices);
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const taxRepo = getRepository(TaxNotice);
    const notice = await taxRepo.findOne({ where: { id } });

    if (!notice) {
      res.status(404).json({ error: '补税通知不存在' });
      return;
    }

    taxRepo.merge(notice, { ...req.body, updatedAt: new Date() });
    await taxRepo.save(notice);
    res.json(notice);
  }

  async markPaid(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { paymentReference } = req.body;
    
    const taxRepo = getRepository(TaxNotice);
    const notice = await taxRepo.findOne({ where: { id } });

    if (!notice) {
      res.status(404).json({ error: '补税通知不存在' });
      return;
    }

    notice.status = TaxNoticeStatus.PAID;
    notice.paymentDate = new Date();
    notice.paymentReference = paymentReference;
    notice.updatedAt = new Date();

    await taxRepo.save(notice);
    res.json(notice);
  }

  async waive(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    
    const taxRepo = getRepository(TaxNotice);
    const notice = await taxRepo.findOne({ where: { id } });

    if (!notice) {
      res.status(404).json({ error: '补税通知不存在' });
      return;
    }

    notice.status = TaxNoticeStatus.WAIVED;
    notice.resolutionNotes = resolutionNotes;
    notice.resolvedBy = req.user?.userId;
    notice.updatedAt = new Date();

    await taxRepo.save(notice);
    res.json(notice);
  }
}

export const taxController = new TaxController();
