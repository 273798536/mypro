import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../config/database';
import { SupervisorComment, CommentDecision } from '../entities';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class CommentController {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { declarationId, taxNoticeId, trajectoryNodeId, decision, comment, isManualOverride, overrideReason } = req.body;

    const commentRepo = getRepository(SupervisorComment);
    const newComment = commentRepo.create({
      id: uuidv4(),
      declarationId,
      taxNoticeId,
      trajectoryNodeId,
      supervisorId: req.user?.userId,
      supervisorName: req.user?.name,
      decision: decision as CommentDecision,
      comment,
      isManualOverride: isManualOverride || false,
      overrideReason,
      createdAt: new Date()
    });

    await commentRepo.save(newComment);
    res.status(201).json(newComment);
  }

  async getByDeclarationId(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { declarationId } = req.params;
    
    const commentRepo = getRepository(SupervisorComment);
    const comments = await commentRepo.find({
      where: { declarationId },
      order: { createdAt: 'DESC' }
    });

    res.json(comments);
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = 1, limit = 20, declarationId } = req.query;
    
    const commentRepo = getRepository(SupervisorComment);
    let query = commentRepo.createQueryBuilder('c');

    if (declarationId) {
      query = query.where('c.declarationId = :declarationId', { declarationId });
    }

    const [comments, total] = await query
      .orderBy('c.createdAt', 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .getManyAndCount();

    res.json({
      data: comments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total
      }
    });
  }
}

export const commentController = new CommentController();
