import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, runExecute } from '../db.js';
import type { ReconciliationStatement, ApiResponse } from '../../shared/types.js';

const router = Router();

function mapStatementRow(row: any): ReconciliationStatement {
  return {
    id: row.id,
    period: row.period,
    contractNo: row.contract_no,
    instrumentNo: row.instrument_no,
    rentAmount: row.rent_amount,
    repairCost: row.repair_cost,
    depositDeduction: row.deposit_deduction,
    actualReceived: row.actual_received,
    createdAt: row.created_at
  };
}

router.get('/', (req: Request, res: Response<ApiResponse<ReconciliationStatement[]>>) => {
  try {
    const { period, contractNo } = req.query;
    let sql = 'SELECT * FROM reconciliation_statements';
    const params: any[] = [];
    const conditions: string[] = [];

    if (period) {
      conditions.push('period = ?');
      params.push(period);
    }
    if (contractNo) {
      conditions.push('contract_no LIKE ?');
      params.push(`%${contractNo}%`);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY period DESC, created_at DESC';

    const rows = runQuery(sql, params);
    const statements = rows.map(mapStatementRow);

    res.json({ success: true, data: statements });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '查询失败' });
  }
});

router.post('/', (req: Request, res: Response<ApiResponse<ReconciliationStatement | ReconciliationStatement[]>>) => {
  try {
    const { statements } = req.body;

    if (statements && Array.isArray(statements) && statements.length > 0) {
      const results: ReconciliationStatement[] = [];
      let successCount = 0;
      let skipCount = 0;

      for (const stmt of statements) {
        const { period, contractNo, instrumentNo, rentAmount, repairCost, depositDeduction, actualReceived } = stmt;

        if (!period || !contractNo) {
          skipCount++;
          continue;
        }

        const id = uuidv4();
        runExecute(
          `INSERT INTO reconciliation_statements 
           (id, period, contract_no, instrument_no, rent_amount, repair_cost, deposit_deduction, actual_received)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            period,
            contractNo,
            instrumentNo || '',
            rentAmount || 0,
            repairCost || 0,
            depositDeduction || 0,
            actualReceived || 0
          ]
        );

        const newRows = runQuery('SELECT * FROM reconciliation_statements WHERE id = ?', [id]);
        results.push(mapStatementRow(newRows[0]));
        successCount++;
      }

      const skipMsg = skipCount > 0 ? `，跳过 ${skipCount} 条缺少期间或合同号的记录` : '';
      res.json({ success: true, data: results, message: `成功导入 ${successCount} 条对账记录${skipMsg}` });
    } else {
      const { period, contractNo, instrumentNo, rentAmount, repairCost, depositDeduction, actualReceived } = req.body;

      if (!period || !contractNo) {
        return res.status(400).json({ success: false, error: '期间、合同号为必填项' });
      }

      const id = uuidv4();
      runExecute(
        `INSERT INTO reconciliation_statements 
         (id, period, contract_no, instrument_no, rent_amount, repair_cost, deposit_deduction, actual_received)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          period,
          contractNo,
          instrumentNo || '',
          rentAmount || 0,
          repairCost || 0,
          depositDeduction || 0,
          actualReceived || 0
        ]
      );

      const newRows = runQuery('SELECT * FROM reconciliation_statements WHERE id = ?', [id]);
      res.json({ success: true, data: mapStatementRow(newRows[0]), message: '对账记录创建成功' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '创建失败' });
  }
});

export default router;
