import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, runExecute } from '../db.js';
import type { DiscrepancyAlert, RepairSummaryItem, ApiResponse } from '../../shared/types.js';

const router = Router();

function mapAlertRow(row: any): DiscrepancyAlert {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    message: row.message,
    relatedContractNo: row.related_contract_no,
    relatedWorkOrderNo: row.related_work_order_no,
    relatedField: row.related_field,
    contractValue: row.contract_value !== null && row.contract_value !== undefined
      ? (isNaN(Number(row.contract_value)) ? row.contract_value : Number(row.contract_value))
      : undefined,
    statementValue: row.statement_value !== null && row.statement_value !== undefined
      ? (isNaN(Number(row.statement_value)) ? row.statement_value : Number(row.statement_value))
      : undefined,
    resolved: row.resolved === 1,
    createdAt: row.created_at
  };
}

router.get('/', (req: Request, res: Response<ApiResponse<{ alerts: DiscrepancyAlert[]; summary: any }>>) => {
  try {
    const contracts = runQuery('SELECT * FROM rental_contracts');
    const statements = runQuery('SELECT * FROM reconciliation_statements');
    const workOrders = runQuery(`
      SELECT wo.*, c.contract_no
      FROM repair_work_orders wo
      LEFT JOIN rental_contracts c ON wo.contract_id = c.id
    `);
    const instrumentChanges = runQuery(`
      SELECT ic.*, c.contract_no, wo.work_order_no
      FROM instrument_changes ic
      LEFT JOIN rental_contracts c ON ic.contract_id = c.id
      LEFT JOIN repair_work_orders wo ON ic.work_order_id = wo.id
    `);

    const alerts: DiscrepancyAlert[] = [];

    for (const contract of contracts) {
      if (contract.actual_deposit_received !== null) {
        const diff = contract.actual_deposit_received - contract.deposit_amount;
        if (Math.abs(diff) > 0.01) {
          const direction = diff > 0 ? '多收' : '少收';
          const alert: DiscrepancyAlert = {
            id: uuidv4(),
            type: 'DEPOSIT_MISMATCH',
            severity: 'ERROR',
            message: `押金${direction}：合同${contract.contract_no}约定押金${contract.deposit_amount}元，实际${direction === '多收' ? '到账' : '到账'}${contract.actual_deposit_received}元，${direction}${Math.abs(diff)}元`,
            relatedContractNo: contract.contract_no,
            relatedField: 'depositAmount',
            contractValue: contract.deposit_amount,
            statementValue: contract.actual_deposit_received,
            resolved: false,
            createdAt: new Date().toISOString()
          };
          alerts.push(alert);
        }
      }
    }

    for (const change of instrumentChanges) {
      const alert: DiscrepancyAlert = {
        id: uuidv4(),
        type: 'INSTRUMENT_CHANGE',
        severity: 'WARNING',
        message: `乐器换号：合同${change.contract_no}${change.work_order_no ? `（关联工单${change.work_order_no}）` : ''}，${change.old_instrument_no} → ${change.new_instrument_no}，原因：${change.reason || '未填写'}`,
        relatedContractNo: change.contract_no,
        relatedWorkOrderNo: change.work_order_no,
        relatedField: 'instrumentNo',
        contractValue: change.old_instrument_no,
        statementValue: change.new_instrument_no,
        resolved: false,
        createdAt: change.operated_at
      };
      alerts.push(alert);
    }

    for (const wo of workOrders) {
      if (wo.has_dispute === 1) {
        const disputedItems = runQuery(
          'SELECT name FROM repair_items WHERE work_order_id = ? AND is_disputed = 1',
          [wo.id]
        );
        const itemNames = disputedItems.map((item: any) => `"${item.name}"`).join('、');
        const alert: DiscrepancyAlert = {
          id: uuidv4(),
          type: 'REPAIR_DISPUTE',
          severity: 'WARNING',
          message: `维修争议：工单${wo.work_order_no}（合同${wo.contract_no}）存在争议，涉及项目：${itemNames}${wo.dispute_note ? `，备注：${wo.dispute_note}` : ''}`,
          relatedContractNo: wo.contract_no,
          relatedWorkOrderNo: wo.work_order_no,
          relatedField: 'repairItems',
          resolved: false,
          createdAt: wo.created_at
        };
        alerts.push(alert);
      }
    }

    for (const stmt of statements) {
      const contract = contracts.find((c: any) => c.contract_no === stmt.contract_no);
      if (contract) {
        if (Math.abs(stmt.deposit_deduction) > 0.01 && contract.actual_deposit_received !== null) {
          const expected = contract.deposit_amount;
          const afterDeduction = contract.actual_deposit_received - stmt.deposit_deduction;
          if (Math.abs(afterDeduction - expected) > 0.01) {
            const alert: DiscrepancyAlert = {
              id: uuidv4(),
              type: 'DATA_MISMATCH',
              severity: 'ERROR',
              message: `对账数据不符：合同${stmt.contract_no}对账表显示扣押金${stmt.deposit_deduction}元，扣后应退${afterDeduction}元，但合同约定押金为${expected}元，请核实`,
              relatedContractNo: stmt.contract_no,
              relatedField: 'depositDeduction',
              contractValue: expected,
              statementValue: afterDeduction,
              resolved: false,
              createdAt: stmt.created_at
            };
            alerts.push(alert);
          }
        }
      }

      const stmtMonth = stmt.period;
      const contractWo = workOrders.filter((wo: any) =>
        wo.contract_no === stmt.contract_no && wo.created_at.startsWith(stmtMonth)
      );
      const woTotal = contractWo.reduce((sum: number, wo: any) => sum + wo.total_cost, 0);
      if (Math.abs(woTotal - stmt.repair_cost) > 0.01) {
        const alert: DiscrepancyAlert = {
          id: uuidv4(),
          type: 'DATA_MISMATCH',
          severity: 'WARNING',
          message: `维修费用不符：合同${stmt.contract_no}${stmtMonth}月工单合计维修费${woTotal}元，对账表显示${stmt.repair_cost}元，差异${Math.abs(woTotal - stmt.repair_cost)}元`,
          relatedContractNo: stmt.contract_no,
          relatedField: 'repairCost',
          contractValue: woTotal,
          statementValue: stmt.repair_cost,
          resolved: false,
          createdAt: stmt.created_at
        };
        alerts.push(alert);
      }
    }

    alerts.sort((a, b) => {
      const severityOrder = { ERROR: 0, WARNING: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const unresolvedAlerts = alerts.filter(a => !a.resolved);
    for (const alert of unresolvedAlerts) {
      const existing = runQuery(
        'SELECT id FROM discrepancy_alerts WHERE type = ? AND related_contract_no = ? AND related_field = ? AND resolved = 0',
        [alert.type, alert.relatedContractNo, alert.relatedField || null]
      );
      if (existing.length === 0) {
        runExecute(
          `INSERT INTO discrepancy_alerts 
           (id, type, severity, message, related_contract_no, related_work_order_no, related_field, contract_value, statement_value, resolved)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            alert.id,
            alert.type,
            alert.severity,
            alert.message,
            alert.relatedContractNo,
            alert.relatedWorkOrderNo || null,
            alert.relatedField || null,
            alert.contractValue?.toString() || null,
            alert.statementValue?.toString() || null,
            0
          ]
        );
      }
    }

    const savedAlerts = runQuery(
      'SELECT * FROM discrepancy_alerts ORDER BY severity = \'ERROR\' DESC, created_at DESC'
    ).map(mapAlertRow);

    const summary = {
      totalContracts: contracts.length,
      activeContracts: contracts.filter((c: any) => c.status === 'ACTIVE').length,
      totalWorkOrders: workOrders.length,
      disputedWorkOrders: workOrders.filter((wo: any) => wo.has_dispute === 1).length,
      totalStatements: statements.length,
      instrumentChangeCount: instrumentChanges.length,
      totalAlerts: savedAlerts.length,
      errorAlerts: savedAlerts.filter((a: any) => a.severity === 'ERROR' && !a.resolved).length,
      warningAlerts: savedAlerts.filter((a: any) => a.severity === 'WARNING' && !a.resolved).length
    };

    res.json({ success: true, data: { alerts: savedAlerts, summary } });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '对账失败' });
  }
});

router.get('/alerts', (req: Request, res: Response<ApiResponse<DiscrepancyAlert[]>>) => {
  try {
    const { resolved, type } = req.query;
    let sql = 'SELECT * FROM discrepancy_alerts';
    const params: any[] = [];
    const conditions: string[] = [];

    if (resolved !== undefined) {
      conditions.push('resolved = ?');
      params.push(resolved === 'true' ? 1 : 0);
    }
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY severity = \'ERROR\' DESC, created_at DESC';

    const rows = runQuery(sql, params);
    res.json({ success: true, data: rows.map(mapAlertRow) });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '查询失败' });
  }
});

router.patch('/alerts/:id/resolve', (req: Request, res: Response<ApiResponse<DiscrepancyAlert>>) => {
  try {
    const { id } = req.params;

    const existing = runQuery('SELECT * FROM discrepancy_alerts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: '提示不存在' });
    }

    runExecute('UPDATE discrepancy_alerts SET resolved = 1 WHERE id = ?', [id]);

    const updated = runQuery('SELECT * FROM discrepancy_alerts WHERE id = ?', [id]);
    res.json({ success: true, data: mapAlertRow(updated[0]), message: '提示已标记为已解决' });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '操作失败' });
  }
});

router.get('/repair-summary', (req: Request, res: Response<ApiResponse<RepairSummaryItem[]>>) => {
  try {
    const { period, contractNo } = req.query;

    let sql = `
      SELECT 
        c.contract_no,
        c.customer_name,
        wo.id as work_order_id,
        wo.work_order_no,
        wo.instrument_no,
        wo.total_cost,
        wo.has_dispute,
        wo.created_at
      FROM rental_contracts c
      LEFT JOIN repair_work_orders wo ON c.id = wo.contract_id
      WHERE wo.id IS NOT NULL
    `;
    const params: any[] = [];

    if (period) {
      sql += ' AND strftime(\'%Y-%m\', wo.created_at) = ?';
      params.push(period);
    }
    if (contractNo) {
      sql += ' AND c.contract_no LIKE ?';
      params.push(`%${contractNo}%`);
    }
    sql += ' ORDER BY c.contract_no, wo.created_at DESC';

    const rows = runQuery(sql, params);
    const summaryMap = new Map<string, RepairSummaryItem>();

    for (const row of rows) {
      if (!summaryMap.has(row.contract_no)) {
        summaryMap.set(row.contract_no, {
          contractNo: row.contract_no,
          customerName: row.customer_name,
          workOrders: [],
          totalRepairCost: 0
        });
      }
      const item = summaryMap.get(row.contract_no)!;
      item.workOrders.push({
        workOrderNo: row.work_order_no,
        instrumentNo: row.instrument_no,
        totalCost: row.total_cost,
        hasDispute: row.has_dispute === 1,
        createdAt: row.created_at
      });
      item.totalRepairCost += row.total_cost;
    }

    const summary = Array.from(summaryMap.values());
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '查询失败' });
  }
});

router.get('/export', (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const contracts = runQuery(`
      SELECT 
        c.contract_no,
        c.instrument_no,
        c.customer_name,
        c.start_date,
        c.end_date,
        c.deposit_amount,
        c.monthly_rent,
        c.actual_deposit_received,
        CASE c.status 
          WHEN 'PENDING' THEN '待起租'
          WHEN 'ACTIVE' THEN '租赁中'
          WHEN 'ENDED' THEN '已退租'
        END as status,
        c.created_at
      FROM rental_contracts c
      ORDER BY c.created_at DESC
    `);

    const instrumentChanges = runQuery(`
      SELECT 
        c.contract_no,
        ic.old_instrument_no,
        ic.new_instrument_no,
        wo.work_order_no,
        ic.reason,
        ic.operator,
        ic.operated_at
      FROM instrument_changes ic
      LEFT JOIN rental_contracts c ON ic.contract_id = c.id
      LEFT JOIN repair_work_orders wo ON ic.work_order_id = wo.id
      ORDER BY ic.operated_at DESC
    `);

    const workOrders = runQuery(`
      SELECT 
        wo.work_order_no,
        c.contract_no,
        wo.instrument_no,
        ri.name as repair_item,
        ri.cost,
        CASE ri.is_disputed WHEN 1 THEN '是' ELSE '否' END as is_disputed,
        CASE wo.has_dispute WHEN 1 THEN '是' ELSE '否' END as has_dispute,
        wo.dispute_note,
        wo.confirmed_by,
        wo.confirmed_at,
        wo.created_at
      FROM repair_work_orders wo
      LEFT JOIN rental_contracts c ON wo.contract_id = c.id
      LEFT JOIN repair_items ri ON wo.id = ri.work_order_id
      ORDER BY wo.created_at DESC
    `);

    const statements = runQuery(`
      SELECT 
        s.period,
        s.contract_no,
        s.instrument_no,
        s.rent_amount,
        s.repair_cost,
        s.deposit_deduction,
        s.actual_received,
        s.created_at
      FROM reconciliation_statements s
      ORDER BY s.period DESC
    `);

    const alerts = runQuery(`
      SELECT 
        CASE a.type
          WHEN 'DEPOSIT_MISMATCH' THEN '押金误扣'
          WHEN 'INSTRUMENT_CHANGE' THEN '乐器换号'
          WHEN 'REPAIR_DISPUTE' THEN '维修争议'
          WHEN 'DATA_MISMATCH' THEN '数据不符'
        END as type,
        CASE a.severity WHEN 'ERROR' THEN '错误' WHEN 'WARNING' THEN '警告' END as severity,
        a.message,
        a.related_contract_no,
        a.related_work_order_no,
        CASE a.resolved WHEN 1 THEN '已解决' ELSE '待处理' END as status,
        a.created_at
      FROM discrepancy_alerts a
      ORDER BY a.severity = 'ERROR' DESC, a.created_at DESC
    `);

    res.json({
      success: true,
      data: {
        contracts,
        instrumentChanges,
        workOrders,
        statements,
        alerts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '导出失败' });
  }
});

export default router;
