import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../config/database';
import { TrajectoryNode } from '../entities';
import { validationService } from '../services/validation.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class TrajectoryController {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const validation = await validationService.validateTrajectoryNode(req.body);
    
    if (!validation.isValid) {
      res.status(400).json({
        error: '数据验证失败',
        errors: validation.errors,
        warnings: validation.warnings,
        badDataId: validation.badDataId
      });
      return;
    }

    const trajectoryRepo = getRepository(TrajectoryNode);
    const node = trajectoryRepo.create({
      ...req.body,
      id: uuidv4(),
      createdAt: new Date()
    });

    await trajectoryRepo.save(node);
    res.status(201).json(node);
  }

  async getByDeclarationId(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { declarationId } = req.params;
    
    const trajectoryRepo = getRepository(TrajectoryNode);
    const nodes = await trajectoryRepo.find({
      where: { declarationId },
      order: { occurredAt: 'ASC' }
    });

    res.json(nodes);
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const trajectoryRepo = getRepository(TrajectoryNode);
    const node = await trajectoryRepo.findOne({ where: { id } });

    if (!node) {
      res.status(404).json({ error: '轨迹节点不存在' });
      return;
    }

    trajectoryRepo.merge(node, req.body);
    await trajectoryRepo.save(node);
    res.json(node);
  }

  async markAbnormal(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { abnormalReason } = req.body;
    
    const trajectoryRepo = getRepository(TrajectoryNode);
    const node = await trajectoryRepo.findOne({ where: { id } });

    if (!node) {
      res.status(404).json({ error: '轨迹节点不存在' });
      return;
    }

    node.isAbnormal = true;
    node.abnormalReason = abnormalReason;
    await trajectoryRepo.save(node);
    res.json(node);
  }
}

export const trajectoryController = new TrajectoryController();
