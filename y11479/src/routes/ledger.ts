import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/auth';
import {
  createDraftLedger,
  submitLedger,
  rejectLedger,
  confirmLedger,
  updateLedgerWithAudit,
  addCustomerServiceNote,
  addAccessRecord,
  setAuditOnly,
  getLedgerHistory,
  getLedgerForRole,
  batchImportLedgers
} from '../services/ledgerService';
import { getLedgerById, getAllLedgers } from '../dao/ledgerDao';
import { ImportStrategy, LedgerStatus } from '../types';

const router = Router();

router.post('/', requirePermission('ledger:create'), async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.auth!;
    const ledger = await createDraftLedger(req.body, userId, userName);
    res.json({
      success: true,
      data: ledger,
      message: '草稿创建成功'
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

router.get('/', requirePermission('ledger:read'), async (req: Request, res: Response) => {
  const { role } = req.auth!;
  const status = req.query.status as LedgerStatus | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

  let ledgers = await getAllLedgers({ status, limit, offset });
  ledgers = ledgers.map(l => getLedgerForRole(l, role));

  res.json({
    success: true,
    data: ledgers
  });
});

router.get('/:id', requirePermission('ledger:read'), async (req: Request, res: Response) => {
  const { role } = req.auth!;
  const ledger = await getLedgerById(req.params.id);

  if (!ledger) {
    res.status(404).json({
      success: false,
      error: '台账不存在'
    });
    return;
  }

  res.json({
    success: true,
    data: getLedgerForRole(ledger, role)
  });
});

router.put('/:id', requirePermission('ledger:update'), async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.auth!;
    const { updates, reason } = req.body;

    const ledger = await updateLedgerWithAudit(req.params.id, updates, userId, userName, reason || '修改台账');

    if (!ledger) {
      res.status(404).json({
        success: false,
        error: '台账不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: ledger,
      message: '更新成功'
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

router.post('/:id/submit', requirePermission('ledger:submit'), async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.auth!;
    const { reason } = req.body;

    const ledger = await submitLedger(req.params.id, userId, userName, reason);

    if (!ledger) {
      res.status(404).json({
        success: false,
        error: '台账不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: ledger,
      message: '提交成功'
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

router.post('/:id/reject', requirePermission('ledger:reject'), async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.auth!;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        error: '驳回原因不能为空'
      });
      return;
    }

    const ledger = await rejectLedger(req.params.id, userId, userName, reason);

    if (!ledger) {
      res.status(404).json({
        success: false,
        error: '台账不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: ledger,
      message: '驳回成功'
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

router.post('/:id/confirm', requirePermission('ledger:confirm'), async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.auth!;
    const { reason } = req.body;

    const ledger = await confirmLedger(req.params.id, userId, userName, reason);

    if (!ledger) {
      res.status(404).json({
        success: false,
        error: '台账不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: ledger,
      message: '确认成功'
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

router.get('/:id/history', requirePermission('ledger:read'), async (req: Request, res: Response) => {
  const history = await getLedgerHistory(req.params.id);
  res.json({
    success: true,
    data: history
  });
});

router.post('/:id/notes', requirePermission('ledger:update'), async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.auth!;
    const { note } = req.body;

    if (!note) {
      res.status(400).json({
        success: false,
        error: '备注内容不能为空'
      });
      return;
    }

    const ledger = await addCustomerServiceNote(req.params.id, note, userId, userName);

    if (!ledger) {
      res.status(404).json({
        success: false,
        error: '台账不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: ledger,
      message: '备注添加成功'
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

router.post('/:id/access', requirePermission('ledger:update'), async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.auth!;
    const ledger = await addAccessRecord(req.params.id, req.body, userId, userName);

    if (!ledger) {
      res.status(404).json({
        success: false,
        error: '台账不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: ledger,
      message: '门禁记录添加成功'
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

router.post('/:id/audit-only', requirePermission('ledger:confirm'), async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.auth!;
    const ledger = await setAuditOnly(req.params.id, userId, userName);

    if (!ledger) {
      res.status(404).json({
        success: false,
        error: '台账不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: ledger,
      message: '已设置为只读审计状态'
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

router.delete('/:id', requirePermission('ledger:delete'), async (req: Request, res: Response) => {
  try {
    const { deleteLedger } = await import('../dao/ledgerDao');
    const success = await deleteLedger(req.params.id);

    if (!success) {
      res.status(404).json({
        success: false,
        error: '台账不存在'
      });
      return;
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

router.post('/batch', requirePermission('ledger:create'), async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.auth!;
    const { ledgersData, strategy } = req.body;

    if (!Object.values(ImportStrategy).includes(strategy)) {
      res.status(400).json({
        success: false,
        error: '无效的导入策略，可选值: ignore, overwrite, append'
      });
      return;
    }

    const result = await batchImportLedgers(ledgersData, strategy, userId, userName);

    res.json({
      success: true,
      data: result,
      message: `批量导入完成: 创建 ${result.created}, 更新 ${result.updated}, 跳过 ${result.skipped}, 错误 ${result.errors.length}`
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

export default router;
