import { Router, Request, Response } from 'express';
import { performVerification, reverseVerification } from '../services/verificationService';
import { performRedFlush } from '../services/redFlushService';
import { splitWarehouseReceipt } from '../services/warehouseSplitService';
import { applyPenalty } from '../services/penaltyService';
import { VerificationRequest, RedFlushRequest, WarehouseSplitRequest, PenaltyRequest } from '../types';

const router = Router();

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const request: VerificationRequest = req.body;
    const result = await performVerification(request);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '核销操作失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

router.post('/verify/:id/reverse', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reversedBy, reason } = req.body;
    
    if (!reversedBy || !reason) {
      return res.status(400).json({
        success: false,
        errors: ['操作人(reversedBy)和原因(reason)不能为空']
      });
    }
    
    const result = await reverseVerification(id, reversedBy, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '核销冲销失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

router.post('/red-flush', async (req: Request, res: Response) => {
  try {
    const request: RedFlushRequest = req.body;
    const result = await performRedFlush(request);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '发票红冲失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

router.post('/split-warehouse', async (req: Request, res: Response) => {
  try {
    const request: WarehouseSplitRequest = req.body;
    const result = await splitWarehouseReceipt(request);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '入库单拆分失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

router.post('/penalty', async (req: Request, res: Response) => {
  try {
    const request: PenaltyRequest = req.body;
    const result = await applyPenalty(request);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '扣罚操作失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
