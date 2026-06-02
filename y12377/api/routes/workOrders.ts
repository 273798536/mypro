import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, runExecute, runTransaction } from '../db.js';
import type { RepairWorkOrder, RepairItem, ApiResponse } from '../../shared/types.js';

const router = Router();

function mapWorkOrderRow(row: any): RepairWorkOrder {
  return {
    id: row.id,
    workOrderNo: row.work_order_no,
    contractId: row.contract_id,
    contractNo: row.contract_no,
    instrumentNo: row.instrument_no,
    repairItems: [],
    totalCost: row.total_cost,
    hasDispute: row.has_dispute === 1,
    disputeNote: row.dispute_note,
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at
  };
}

function mapRepairItemRow(row: any): RepairItem {
  return {
    id: row.id,
    name: row.name,
    cost: row.cost,
    isDisputed: row.is_disputed === 1
  };
}

router.get('/', (req: Request, res: Response<ApiResponse<RepairWorkOrder[]>>) => {
  try {
    const { contractId, hasDispute, confirmed } = req.query;
    let sql = `
      SELECT wo.*, c.contract_no
      FROM repair_work_orders wo
      LEFT JOIN rental_contracts c ON wo.contract_id = c.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (contractId) {
      conditions.push('wo.contract_id = ?');
      params.push(contractId);
    }
    if (hasDispute !== undefined) {
      conditions.push('wo.has_dispute = ?');
      params.push(hasDispute === 'true' ? 1 : 0);
    }
    if (confirmed !== undefined) {
      if (confirmed === 'true') {
        conditions.push('wo.confirmed_at IS NOT NULL');
      } else {
        conditions.push('wo.confirmed_at IS NULL');
      }
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY wo.created_at DESC';

    const rows = runQuery(sql, params);
    const workOrders: RepairWorkOrder[] = rows.map(mapWorkOrderRow);

    for (const wo of workOrders) {
      const itemRows = runQuery('SELECT * FROM repair_items WHERE work_order_id = ?', [wo.id]);
      wo.repairItems = itemRows.map(mapRepairItemRow);
    }

    res.json({ success: true, data: workOrders });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '查询失败' });
  }
});

router.get('/:id', (req: Request, res: Response<ApiResponse<RepairWorkOrder>>) => {
  try {
    const { id } = req.params;
    const rows = runQuery(
      `SELECT wo.*, c.contract_no
       FROM repair_work_orders wo
       LEFT JOIN rental_contracts c ON wo.contract_id = c.id
       WHERE wo.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '工单不存在' });
    }

    const workOrder = mapWorkOrderRow(rows[0]);
    const itemRows = runQuery('SELECT * FROM repair_items WHERE work_order_id = ?', [id]);
    workOrder.repairItems = itemRows.map(mapRepairItemRow);

    res.json({ success: true, data: workOrder });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '查询失败' });
  }
});

router.post('/', (req: Request, res: Response<ApiResponse<RepairWorkOrder>>) => {
  try {
    const { workOrderNo, contractId, instrumentNo, repairItems, hasDispute, disputeNote } = req.body;

    if (!workOrderNo || !contractId || !instrumentNo || !repairItems || !Array.isArray(repairItems) || repairItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: '工单编号、关联合同、乐器编号、维修项目为必填项，且维修项目不能为空'
      });
    }

    const contractExists = runQuery('SELECT id, contract_no FROM rental_contracts WHERE id = ?', [contractId]);
    if (contractExists.length === 0) {
      return res.status(400).json({ success: false, error: '关联的合同不存在' });
    }

    const existing = runQuery('SELECT id FROM repair_work_orders WHERE work_order_no = ?', [workOrderNo]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: `工单编号 ${workOrderNo} 已存在` });
    }

    const id = uuidv4();
    const totalCost = repairItems.reduce((sum: number, item: any) => sum + (item.cost || 0), 0);
    const actualHasDispute = hasDispute || repairItems.some((item: any) => item.isDisputed);

    const operations: { sql: string; params: any[] }[] = [
      {
        sql: `INSERT INTO repair_work_orders 
              (id, work_order_no, contract_id, instrument_no, total_cost, has_dispute, dispute_note)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [id, workOrderNo, contractId, instrumentNo, totalCost, actualHasDispute ? 1 : 0, disputeNote || null]
      }
    ];

    for (const item of repairItems) {
      const itemId = uuidv4();
      operations.push({
        sql: `INSERT INTO repair_items (id, work_order_id, name, cost, is_disputed) VALUES (?, ?, ?, ?, ?)`,
        params: [itemId, id, item.name, item.cost || 0, item.isDisputed ? 1 : 0]
      });
    }

    runTransaction(operations);

    const newRows = runQuery(
      `SELECT wo.*, c.contract_no
       FROM repair_work_orders wo
       LEFT JOIN rental_contracts c ON wo.contract_id = c.id
       WHERE wo.id = ?`,
      [id]
    );
    const workOrder = mapWorkOrderRow(newRows[0]);
    const itemRows = runQuery('SELECT * FROM repair_items WHERE work_order_id = ?', [id]);
    workOrder.repairItems = itemRows.map(mapRepairItemRow);

    const disputeMsg = actualHasDispute ? '（含争议项目）' : '';
    res.json({ success: true, data: workOrder, message: `工单 ${workOrderNo} 创建成功${disputeMsg}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '创建失败' });
  }
});

router.patch('/:id/dispute', (req: Request, res: Response<ApiResponse<RepairWorkOrder>>) => {
  try {
    const { id } = req.params;
    const { repairItemId, isDisputed, disputeNote } = req.body;

    const existing = runQuery('SELECT * FROM repair_work_orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: '工单不存在' });
    }

    const workOrder = existing[0];
    let message = '';

    if (repairItemId !== undefined) {
      const itemExists = runQuery('SELECT * FROM repair_items WHERE id = ? AND work_order_id = ?', [repairItemId, id]);
      if (itemExists.length === 0) {
        return res.status(400).json({ success: false, error: '维修项目不存在' });
      }

      runExecute('UPDATE repair_items SET is_disputed = ? WHERE id = ?', [isDisputed ? 1 : 0, repairItemId]);
      const item = itemExists[0];
      const status = isDisputed ? '标记为争议' : '取消争议标记';
      message = `工单${workOrder.work_order_no}维修项目"${item.name}"已${status}`;
    }

    const allItems = runQuery('SELECT is_disputed FROM repair_items WHERE work_order_id = ?', [id]);
    const hasDispute = allItems.some((item: any) => item.is_disputed === 1);

    if (disputeNote !== undefined) {
      runExecute(
        'UPDATE repair_work_orders SET has_dispute = ?, dispute_note = ? WHERE id = ?',
        [hasDispute ? 1 : 0, disputeNote, id]
      );
      if (!message) {
        message = `工单${workOrder.work_order_no}争议备注已更新`;
      }
    } else {
      runExecute('UPDATE repair_work_orders SET has_dispute = ? WHERE id = ?', [hasDispute ? 1 : 0, id]);
    }

    const updatedRows = runQuery(
      `SELECT wo.*, c.contract_no
       FROM repair_work_orders wo
       LEFT JOIN rental_contracts c ON wo.contract_id = c.id
       WHERE wo.id = ?`,
      [id]
    );
    const updated = mapWorkOrderRow(updatedRows[0]);
    const itemRows = runQuery('SELECT * FROM repair_items WHERE work_order_id = ?', [id]);
    updated.repairItems = itemRows.map(mapRepairItemRow);

    res.json({ success: true, data: updated, message });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '更新失败' });
  }
});

router.patch('/:id/confirm', (req: Request, res: Response<ApiResponse<RepairWorkOrder>>) => {
  try {
    const { id } = req.params;
    const { confirmedBy } = req.body;

    if (!confirmedBy) {
      return res.status(400).json({ success: false, error: '确认人为必填项' });
    }

    const existing = runQuery('SELECT * FROM repair_work_orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: '工单不存在' });
    }

    const workOrder = existing[0];
    if (workOrder.has_dispute === 1) {
      return res.status(400).json({
        success: false,
        error: `工单${workOrder.work_order_no}存在争议，需先处理争议后才能确认`
      });
    }

    runExecute(
      'UPDATE repair_work_orders SET confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [confirmedBy, id]
    );

    const updatedRows = runQuery(
      `SELECT wo.*, c.contract_no
       FROM repair_work_orders wo
       LEFT JOIN rental_contracts c ON wo.contract_id = c.id
       WHERE wo.id = ?`,
      [id]
    );
    const updated = mapWorkOrderRow(updatedRows[0]);
    const itemRows = runQuery('SELECT * FROM repair_items WHERE work_order_id = ?', [id]);
    updated.repairItems = itemRows.map(mapRepairItemRow);

    res.json({ success: true, data: updated, message: `工单${workOrder.work_order_no}已确认，确认人：${confirmedBy}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '确认失败' });
  }
});

export default router;
