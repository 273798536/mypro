import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, runExecute, runTransaction } from '../db.js';
import type { RentalContract, InstrumentChangeRecord, ApiResponse } from '../../shared/types.js';

const router = Router();

function mapContractRow(row: any): RentalContract {
  return {
    id: row.id,
    contractNo: row.contract_no,
    instrumentNo: row.instrument_no,
    customerName: row.customer_name,
    startDate: row.start_date,
    endDate: row.end_date,
    depositAmount: row.deposit_amount,
    monthlyRent: row.monthly_rent,
    actualDepositReceived: row.actual_deposit_received,
    status: row.status,
    instrumentChangeHistory: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapChangeRow(row: any): InstrumentChangeRecord {
  return {
    id: row.id,
    contractId: row.contract_id,
    oldInstrumentNo: row.old_instrument_no,
    newInstrumentNo: row.new_instrument_no,
    relatedWorkOrderId: row.work_order_id,
    reason: row.reason,
    operator: row.operator,
    operatedAt: row.operated_at
  };
}

router.get('/', (req: Request, res: Response<ApiResponse<RentalContract[]>>) => {
  try {
    const { status, contractNo } = req.query;
    let sql = `
      SELECT c.*,
             json_group_array(json_object(
               'id', ic.id,
               'contract_id', ic.contract_id,
               'old_instrument_no', ic.old_instrument_no,
               'new_instrument_no', ic.new_instrument_no,
               'work_order_id', ic.work_order_id,
               'reason', ic.reason,
               'operator', ic.operator,
               'operated_at', ic.operated_at
             )) as changes_json
      FROM rental_contracts c
      LEFT JOIN instrument_changes ic ON c.id = ic.contract_id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }
    if (contractNo) {
      conditions.push('c.contract_no LIKE ?');
      params.push(`%${contractNo}%`);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' GROUP BY c.id ORDER BY c.created_at DESC';

    const rows = runQuery(sql, params);
    const contracts: RentalContract[] = rows.map((row: any) => {
      const contract = mapContractRow(row);
      try {
        const changes = JSON.parse(row.changes_json || '[]');
        contract.instrumentChangeHistory = changes
          .filter((c: any) => c.id)
          .map(mapChangeRow)
          .sort((a: any, b: any) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime());
      } catch (e) {
        contract.instrumentChangeHistory = [];
      }
      return contract;
    });

    res.json({ success: true, data: contracts });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '查询失败' });
  }
});

router.get('/:id', (req: Request, res: Response<ApiResponse<RentalContract>>) => {
  try {
    const { id } = req.params;
    const rows = runQuery('SELECT * FROM rental_contracts WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '合同不存在' });
    }
    const contract = mapContractRow(rows[0]);

    const changeRows = runQuery(
      `SELECT ic.*, wo.work_order_no 
       FROM instrument_changes ic 
       LEFT JOIN repair_work_orders wo ON ic.work_order_id = wo.id
       WHERE ic.contract_id = ? 
       ORDER BY ic.operated_at DESC`,
      [id]
    );
    contract.instrumentChangeHistory = changeRows.map((row: any) => ({
      ...mapChangeRow(row),
      relatedWorkOrderNo: row.work_order_no
    }));

    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '查询失败' });
  }
});

router.post('/', (req: Request, res: Response<ApiResponse<RentalContract>>) => {
  try {
    const { contractNo, instrumentNo, customerName, startDate, depositAmount, monthlyRent, actualDepositReceived } = req.body;

    if (!contractNo || !instrumentNo || !customerName || !startDate) {
      return res.status(400).json({ success: false, error: '合同编号、乐器编号、客户名称、起租日期为必填项' });
    }

    const existing = runQuery('SELECT id FROM rental_contracts WHERE contract_no = ?', [contractNo]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: `合同编号 ${contractNo} 已存在` });
    }

    const id = uuidv4();
    runExecute(
      `INSERT INTO rental_contracts 
       (id, contract_no, instrument_no, customer_name, start_date, deposit_amount, monthly_rent, actual_deposit_received, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, contractNo, instrumentNo, customerName, startDate, depositAmount || 0, monthlyRent || 0, actualDepositReceived ?? null, 'PENDING']
    );

    const newRows = runQuery('SELECT * FROM rental_contracts WHERE id = ?', [id]);
    res.json({ success: true, data: mapContractRow(newRows[0]), message: '合同创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '创建失败' });
  }
});

router.put('/:id', (req: Request, res: Response<ApiResponse<RentalContract>>) => {
  try {
    const { id } = req.params;
    const { instrumentNo, customerName, startDate, endDate, depositAmount, monthlyRent, actualDepositReceived } = req.body;

    const existing = runQuery('SELECT id FROM rental_contracts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: '合同不存在' });
    }

    runExecute(
      `UPDATE rental_contracts SET 
       instrument_no = COALESCE(?, instrument_no),
       customer_name = COALESCE(?, customer_name),
       start_date = COALESCE(?, start_date),
       end_date = ?,
       deposit_amount = COALESCE(?, deposit_amount),
       monthly_rent = COALESCE(?, monthly_rent),
       actual_deposit_received = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [instrumentNo, customerName, startDate, endDate ?? null, depositAmount, monthlyRent, actualDepositReceived ?? null, id]
    );

    const updatedRows = runQuery('SELECT * FROM rental_contracts WHERE id = ?', [id]);
    res.json({ success: true, data: mapContractRow(updatedRows[0]), message: '合同更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '更新失败' });
  }
});

router.patch('/:id/status', (req: Request, res: Response<ApiResponse<RentalContract>>) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'ACTIVE', 'ENDED'].includes(status)) {
      return res.status(400).json({ success: false, error: '无效的状态值，必须为 PENDING、ACTIVE 或 ENDED' });
    }

    const existing = runQuery('SELECT id, status FROM rental_contracts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: '合同不存在' });
    }

    const statusMap: Record<string, string> = {
      PENDING: '待起租',
      ACTIVE: '租赁中',
      ENDED: '已退租'
    };

    runExecute('UPDATE rental_contracts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);

    const updatedRows = runQuery('SELECT * FROM rental_contracts WHERE id = ?', [id]);
    res.json({
      success: true,
      data: mapContractRow(updatedRows[0]),
      message: `状态已变更为：${statusMap[status]}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '状态变更失败' });
  }
});

router.post('/:id/change-instrument', (req: Request, res: Response<ApiResponse<InstrumentChangeRecord>>) => {
  try {
    const { id } = req.params;
    const { oldInstrumentNo, newInstrumentNo, relatedWorkOrderId, reason, operator } = req.body;

    if (!oldInstrumentNo || !newInstrumentNo || !operator) {
      return res.status(400).json({ success: false, error: '原乐器号、新乐器号、操作人为必填项' });
    }

    const existing = runQuery('SELECT id, contract_no, instrument_no FROM rental_contracts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: '合同不存在' });
    }

    const contract = existing[0];
    if (oldInstrumentNo !== contract.instrument_no) {
      return res.status(400).json({
        success: false,
        error: `原乐器号不匹配：合同当前乐器号为 ${contract.instrument_no}，输入为 ${oldInstrumentNo}`
      });
    }

    if (relatedWorkOrderId) {
      const woExists = runQuery('SELECT id, work_order_no FROM repair_work_orders WHERE id = ?', [relatedWorkOrderId]);
      if (woExists.length === 0) {
        return res.status(400).json({ success: false, error: `关联的维修工单不存在` });
      }
    }

    const changeId = uuidv4();
    runTransaction([
      {
        sql: `INSERT INTO instrument_changes 
              (id, contract_id, old_instrument_no, new_instrument_no, work_order_id, reason, operator)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [changeId, id, oldInstrumentNo, newInstrumentNo, relatedWorkOrderId || null, reason || null, operator]
      },
      {
        sql: 'UPDATE rental_contracts SET instrument_no = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        params: [newInstrumentNo, id]
      }
    ]);

    const changeRows = runQuery(
      `SELECT ic.*, wo.work_order_no 
       FROM instrument_changes ic 
       LEFT JOIN repair_work_orders wo ON ic.work_order_id = wo.id
       WHERE ic.id = ?`,
      [changeId]
    );
    const record: InstrumentChangeRecord = {
      ...mapChangeRow(changeRows[0]),
      relatedWorkOrderNo: changeRows[0].work_order_no
    };

    res.json({
      success: true,
      data: record,
      message: `乐器换号已记录：${oldInstrumentNo} → ${newInstrumentNo}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '换号记录失败' });
  }
});

export default router;
