import { Router, Request, Response } from 'express';
import { findAllPrepaymentFlows, findPrepaymentFlowById } from '../dao/prepaymentFlowDao';
import { findInvoicesByPrepaymentFlowId } from '../dao/invoiceDao';
import { findWarehouseReceiptsByPrepaymentFlowId } from '../dao/warehouseDao';
import { findVerificationsByPrepaymentFlowId } from '../dao/verificationDao';
import { findPenaltiesByPrepaymentFlowId } from '../dao/penaltyDao';
import { findLedgersByPrepaymentFlowId } from '../dao/ledgerDao';
import { getVerificationSummary } from '../services/verificationService';

const router = Router();

router.get('/flows', async (req: Request, res: Response) => {
  try {
    const flows = await findAllPrepaymentFlows();
    res.json({
      success: true,
      data: flows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取预付款流水列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

router.get('/flows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const flow = await findPrepaymentFlowById(id);
    
    if (!flow) {
      return res.status(404).json({
        success: false,
        message: '预付款流水不存在'
      });
    }

    res.json({
      success: true,
      data: flow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取预付款流水失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

router.get('/flows/:id/summary', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await getVerificationSummary(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取核销汇总失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

router.get('/flows/:id/invoices', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoices = await findInvoicesByPrepaymentFlowId(id);
    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取发票列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

router.get('/flows/:id/receipts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const receipts = await findWarehouseReceiptsByPrepaymentFlowId(id);
    res.json({
      success: true,
      data: receipts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取入库单列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

router.get('/flows/:id/verifications', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const verifications = await findVerificationsByPrepaymentFlowId(id);
    res.json({
      success: true,
      data: verifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取核销记录失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

router.get('/flows/:id/penalties', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const penalties = await findPenaltiesByPrepaymentFlowId(id);
    res.json({
      success: true,
      data: penalties
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取扣罚记录失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

router.get('/flows/:id/ledgers', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ledgers = await findLedgersByPrepaymentFlowId(id);
    res.json({
      success: true,
      data: ledgers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取预付款账本失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
