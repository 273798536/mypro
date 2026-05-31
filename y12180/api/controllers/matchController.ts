import { Request, Response } from 'express';
import MatchService from '../services/matchService';
import ConflictRepository from '../repositories/conflictRepository';
import ReviewRepository from '../repositories/reviewRepository';
import AuditService from '../services/auditService';

const matchService = new MatchService();
const conflictRepo = new ConflictRepository();
const reviewRepo = new ReviewRepository();
const auditService = new AuditService();

const currentUser = 'admin';

export const runMatching = async (_req: Request, res: Response) => {
  try {
    const result = await matchService.runMatching();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '匹配失败', message: (error as Error).message });
  }
};

export const getMatches = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, riskLevel, matchStatus, search, artist } = req.query;
    const params = {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      riskLevel: riskLevel as 'high' | 'medium' | 'low' | 'none' | undefined,
      matchStatus: matchStatus as 'full' | 'partial' | 'none' | 'conflict' | undefined,
      search: search as string | undefined,
      artist: artist as string | undefined,
    };
    const result = matchService.getAllMatches(params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取匹配结果失败', message: (error as Error).message });
  }
};

export const getMatch = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const match = matchService.getMatchById(id);
    if (!match) {
      return res.status(404).json({ error: '匹配记录不存在' });
    }
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: '获取匹配详情失败', message: (error as Error).message });
  }
};

export const getMatchStats = async (_req: Request, res: Response) => {
  try {
    const stats = matchService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: '获取统计数据失败', message: (error as Error).message });
  }
};

export const getConflicts = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, status } = req.query;
    const params = {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status: status as string | undefined,
    };
    const result = conflictRepo.findAll(params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取冲突列表失败', message: (error as Error).message });
  }
};

export const getConflict = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conflict = conflictRepo.findById(id);
    if (!conflict) {
      return res.status(404).json({ error: '冲突记录不存在' });
    }
    res.json(conflict);
  } catch (error) {
    res.status(500).json({ error: '获取冲突详情失败', message: (error as Error).message });
  }
};

export const resolveConflict = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    
    if (!status || !resolution) {
      return res.status(400).json({ error: '状态和解决方案不能为空' });
    }

    const validStatuses = ['resolved_playlist', 'resolved_copyright', 'resolved_custom'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }

    const conflict = conflictRepo.resolve(id, {
      status: status as 'resolved_playlist' | 'resolved_copyright' | 'resolved_custom',
      resolution,
      resolvedBy: currentUser,
    });

    if (!conflict) {
      return res.status(404).json({ error: '冲突记录不存在' });
    }

    auditService.log('conflict_resolve', 'conflict', id, currentUser, `解决冲突：${status} - ${resolution}`);

    res.json(conflict);
  } catch (error) {
    res.status(500).json({ error: '解决冲突失败', message: (error as Error).message });
  }
};

export const getReviews = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, status } = req.query;
    const params = {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status: status as string | undefined,
    };
    const result = reviewRepo.findAll(params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取审核列表失败', message: (error as Error).message });
  }
};

export const createReview = async (req: Request, res: Response) => {
  try {
    const { matchResultId, status, comments, riskLevelOverride } = req.body;
    
    if (!matchResultId || !status) {
      return res.status(400).json({ error: '匹配结果ID和审核状态不能为空' });
    }

    const validStatuses = ['approved', 'rejected', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的审核状态' });
    }

    const review = reviewRepo.create({
      matchResultId,
      reviewer: currentUser,
      status: status as 'approved' | 'rejected' | 'pending',
      comments,
      riskLevelOverride: riskLevelOverride as 'high' | 'medium' | 'low' | 'none' | undefined,
    });

    auditService.log('review_create', 'review', review.id, currentUser, `审核：${status}${comments ? ` - ${comments}` : ''}`);

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: '创建审核记录失败', message: (error as Error).message });
  }
};

export const updateReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comments, riskLevelOverride } = req.body;

    const review = reviewRepo.update(id, {
      status: status as 'approved' | 'rejected' | 'pending' | undefined,
      comments,
      riskLevelOverride: riskLevelOverride as 'high' | 'medium' | 'low' | 'none' | undefined,
    });

    if (!review) {
      return res.status(404).json({ error: '审核记录不存在' });
    }

    auditService.log('review_update', 'review', id, currentUser, `更新审核：${status}`);

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: '更新审核记录失败', message: (error as Error).message });
  }
};
