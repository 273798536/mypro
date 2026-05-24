import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../config/database';
import { Declaration, DeclarationStatus } from '../entities';
import { validationService } from '../services/validation.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class DeclarationController {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const validation = await validationService.validateDeclaration(req.body);
    
    if (!validation.isValid) {
      res.status(400).json({
        error: '数据验证失败',
        errors: validation.errors,
        warnings: validation.warnings,
        badDataId: validation.badDataId
      });
      return;
    }

    const declarationRepo = getRepository(Declaration);
    const declaration = declarationRepo.create({
      ...req.body,
      id: uuidv4(),
      enteredBy: req.user?.userId,
      status: DeclarationStatus.SUBMITTED,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await declarationRepo.save(declaration);

    res.status(201).json({
      ...declaration,
      warnings: validation.warnings
    });
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = 1, limit = 20, status, packageNo } = req.query;
    
    const declarationRepo = getRepository(Declaration);
    let query = declarationRepo.createQueryBuilder('d');

    if (status) {
      query = query.where('d.status = :status', { status });
    }
    if (packageNo) {
      query = query.andWhere('d.packageNo LIKE :packageNo', { packageNo: `%${packageNo}%` });
    }

    const [declarations, total] = await query
      .orderBy('d.createdAt', 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .getManyAndCount();

    res.json({
      data: declarations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total
      }
    });
  }

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const declarationRepo = getRepository(Declaration);
    const declaration = await declarationRepo.findOne({ where: { id } });

    if (!declaration) {
      res.status(404).json({ error: '申报单不存在' });
      return;
    }

    res.json(declaration);
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const declarationRepo = getRepository(Declaration);
    const declaration = await declarationRepo.findOne({ where: { id } });

    if (!declaration) {
      res.status(404).json({ error: '申报单不存在' });
      return;
    }

    declarationRepo.merge(declaration, {
      ...req.body,
      updatedAt: new Date()
    });

    await declarationRepo.save(declaration);
    res.json(declaration);
  }

  async review(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    
    const declarationRepo = getRepository(Declaration);
    const declaration = await declarationRepo.findOne({ where: { id } });

    if (!declaration) {
      res.status(404).json({ error: '申报单不存在' });
      return;
    }

    declaration.status = status as DeclarationStatus;
    declaration.reviewedBy = req.user?.userId;
    declaration.reviewNotes = reviewNotes;
    declaration.updatedAt = new Date();

    await declarationRepo.save(declaration);
    res.json(declaration);
  }

  async approve(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const declarationRepo = getRepository(Declaration);
    const declaration = await declarationRepo.findOne({ where: { id } });

    if (!declaration) {
      res.status(404).json({ error: '申报单不存在' });
      return;
    }

    declaration.status = DeclarationStatus.APPROVED;
    declaration.approvedBy = req.user?.userId;
    declaration.updatedAt = new Date();

    await declarationRepo.save(declaration);
    res.json(declaration);
  }
}

export const declarationController = new DeclarationController();
