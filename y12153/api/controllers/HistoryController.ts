import type { Request, Response } from 'express';
import {
  getHistoryList,
  getHistoryDetail,
  deleteHistoryRecord,
} from '../repositories/CalculationRepository';

export async function handleGetHistoryList(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = getHistoryList(Math.min(limit, 200));
    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      error: '获取历史记录失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
}

export async function handleGetHistoryDetail(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const detail = getHistoryDetail(id);

    if (!detail) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }

    res.json(detail);
  } catch (error) {
    console.error('Get history detail error:', error);
    res.status(500).json({
      error: '获取历史记录详情失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
}

export async function handleDeleteHistory(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = deleteHistoryRecord(id);

    if (!deleted) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }

    res.json({ success: true, message: '记录已删除' });
  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({
      error: '删除历史记录失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
}
