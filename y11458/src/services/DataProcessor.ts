import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { getDatabase } from '../database';
import {
  DirtyRecordType,
  IssueType,
  AfterSalesStatus,
  OperatorRole,
  DirtyRecord,
  ReconciliationResult
} from '../types';

export class DataProcessor {
  private db: any;

  constructor(dbPath: string) {
    this.db = getDatabase(dbPath);
  }

  async detectDirtyRecords(): Promise<DirtyRecord[]> {
    const dirtyRecords: DirtyRecord[] = [];

    dirtyRecords.push(...await this.detectLeaderRefundDirtyRecords());
    dirtyRecords.push(...await this.detectWarehouseReviewDirtyRecords());
    dirtyRecords.push(...await this.detectRefundFlowDirtyRecords());

    await this.saveDirtyRecords(dirtyRecords);
    return dirtyRecords;
  }

  private async detectLeaderRefundDirtyRecords(): Promise<DirtyRecord[]> {
    const records: DirtyRecord[] = [];
    const leaderRefunds = await this.db.all('SELECT * FROM leader_refund');

    for (const refund of leaderRefunds) {
      if (!refund.leader_id) {
        records.push({
          id: uuidv4(),
          sourceType: 'LEADER_REFUND',
          sourceId: refund.id,
          orderNo: refund.order_no,
          dirtyType: DirtyRecordType.MISSING_FIELD,
          fieldName: 'leader_id',
          expectedValue: '非空',
          actualValue: 'null',
          suggestion: '请补充团长ID',
          rawData: refund,
          isResolved: false,
          createTime: moment().toISOString()
        });
      }

      const submitTime = moment(refund.submit_time);
      if (submitTime.hour() >= 23 || submitTime.hour() < 1) {
        records.push({
          id: uuidv4(),
          sourceType: 'LEADER_REFUND',
          sourceId: refund.id,
          orderNo: refund.order_no,
          dirtyType: DirtyRecordType.CROSS_DAY,
          fieldName: 'submit_time',
          expectedValue: '正常工作时间',
          actualValue: refund.submit_time,
          suggestion: '建议核实是否为跨日提交',
          rawData: refund,
          isResolved: false,
          createTime: moment().toISOString()
        });
      }
    }

    return records;
  }

  private async detectWarehouseReviewDirtyRecords(): Promise<DirtyRecord[]> {
    const records: DirtyRecord[] = [];
    const reviews = await this.db.all('SELECT * FROM warehouse_review');

    for (const review of reviews) {
      if (review.sku_name.includes('(新)') || review.sku_name.includes('旧')) {
        records.push({
          id: uuidv4(),
          sourceType: 'WAREHOUSE_REVIEW',
          sourceId: review.id,
          orderNo: review.order_no,
          dirtyType: DirtyRecordType.NAME_CHANGED,
          fieldName: 'sku_name',
          expectedValue: '标准商品名称',
          actualValue: review.sku_name,
          suggestion: '商品名称可能已变更，建议核实',
          rawData: review,
          isResolved: false,
          createTime: moment().toISOString()
        });
      }
    }

    return records;
  }

  private async detectRefundFlowDirtyRecords(): Promise<DirtyRecord[]> {
    const records: DirtyRecord[] = [];
    const flows = await this.db.all('SELECT * FROM refund_flow');
    const reviews = await this.db.all('SELECT order_no, actual_amount FROM warehouse_review');
    const reviewMap = new Map(reviews.map((r: any) => [r.order_no, r.actual_amount]));

    for (const flow of flows) {
      const warehouseAmount = reviewMap.get(flow.order_no) as number | null | undefined;
      const refundAmount = flow.refund_amount as number | null;
      if (warehouseAmount !== undefined && warehouseAmount !== null && refundAmount !== null && 
          Math.abs(refundAmount - warehouseAmount) > 0.01) {
        records.push({
          id: uuidv4(),
          sourceType: 'REFUND_FLOW',
          sourceId: flow.id,
          orderNo: flow.order_no,
          dirtyType: DirtyRecordType.AMOUNT_CONFLICT,
          fieldName: 'refund_amount',
          expectedValue: String(warehouseAmount),
          actualValue: String(flow.refund_amount),
          suggestion: `退款金额${flow.refund_amount}与仓库复核金额${warehouseAmount}不一致`,
          rawData: flow,
          isResolved: false,
          createTime: moment().toISOString()
        });
      }
    }

    return records;
  }

  private async saveDirtyRecords(records: DirtyRecord[]): Promise<void> {
    for (const record of records) {
      await this.db.run(
        `INSERT OR REPLACE INTO dirty_record 
         (id, source_type, source_id, order_no, dirty_type, field_name, expected_value, actual_value, 
          suggestion, raw_data, is_resolved, resolved_by, resolved_time, resolve_remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.sourceType,
          record.sourceId,
          record.orderNo,
          record.dirtyType,
          record.fieldName,
          record.expectedValue,
          record.actualValue,
          record.suggestion,
          JSON.stringify(record.rawData),
          record.isResolved ? 1 : 0,
          record.resolvedBy,
          record.resolvedTime,
          record.resolveRemark,
          record.createTime
        ]
      );
    }
  }

  async resolveDirtyRecord(dirtyId: string, resolverId: string, resolverName: string, remark: string): Promise<boolean> {
    const result = await this.db.run(
      `UPDATE dirty_record SET is_resolved = 1, resolved_by = ?, resolved_time = ?, resolve_remark = ? WHERE id = ?`,
      [resolverName, moment().toISOString(), remark, dirtyId]
    );
    return result.changes > 0;
  }

  async reconcileAll(): Promise<ReconciliationResult[]> {
    const results: ReconciliationResult[] = [];
    const orders = await this.db.all('SELECT order_no, city FROM after_sales_order');

    for (const order of orders) {
      const result = await this.reconcileOrder(order.order_no);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  async reconcileOrder(orderNo: string): Promise<ReconciliationResult | null> {
    const leaderRefund = await this.db.get(
      'SELECT refund_amount, refund_quantity, reason FROM leader_refund WHERE order_no = ?',
      [orderNo]
    );

    const warehouseReview = await this.db.get(
      'SELECT actual_amount, actual_quantity, is_damaged, is_missing, review_result FROM warehouse_review WHERE order_no = ?',
      [orderNo]
    );

    const refundFlows = await this.db.all(
      'SELECT refund_amount, refund_status FROM refund_flow WHERE order_no = ?',
      [orderNo]
    );

    if (!leaderRefund) {
      return null;
    }

    const leaderAmount = leaderRefund.refund_amount || 0;
    const warehouseAmount = warehouseReview?.actual_amount || 0;
    const totalRefundAmount = refundFlows
      .filter((f: any) => f.refund_status === 'SUCCESS')
      .reduce((sum: number, f: any) => sum + f.refund_amount, 0);

    const difference = totalRefundAmount - warehouseAmount;
    const isMatched = Math.abs(difference) < 0.01;

    let issueType = IssueType.OTHER;
    if (warehouseReview?.is_missing) {
      issueType = IssueType.MISSING;
    } else if (warehouseReview?.is_damaged) {
      issueType = IssueType.DAMAGED;
    } else if (!isMatched) {
      issueType = IssueType.AMOUNT_MISMATCH;
    }

    let remark = '';
    if (warehouseReview?.is_missing) {
      remark = '少发商品，走补发渠道';
    } else if (warehouseReview?.is_damaged) {
      remark = '坏品，走赔付渠道';
    } else if (!isMatched) {
      remark = `补偿金额差异: ${difference.toFixed(2)}元`;
    } else {
      remark = '对账一致';
    }

    const result: ReconciliationResult = {
      id: uuidv4(),
      orderNo,
      issueType,
      leaderAmount,
      warehouseAmount,
      refundAmount: totalRefundAmount,
      difference,
      isMatched,
      reconciliationRemark: remark,
      createTime: moment().toISOString()
    };

    await this.db.run(
      `INSERT OR REPLACE INTO reconciliation_result 
       (id, order_no, issue_type, leader_amount, warehouse_amount, refund_amount, 
        difference, is_matched, reconciliation_remark, reconciled_by, reconciled_time, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.id,
        result.orderNo,
        result.issueType,
        result.leaderAmount,
        result.warehouseAmount,
        result.refundAmount,
        result.difference,
        result.isMatched ? 1 : 0,
        result.reconciliationRemark,
        result.reconciledBy,
        result.reconciledTime,
        result.createTime
      ]
    );

    await this.updateOrderStatus(orderNo, isMatched ? AfterSalesStatus.RECONCILED : AfterSalesStatus.ABNORMAL, {
      operatorId: 'SYS001',
      operatorName: '系统',
      operatorRole: OperatorRole.SYSTEM,
      reason: isMatched ? '对账完成，数据一致' : '对账完成，发现异常'
    });

    return result;
  }

  async updateOrderStatus(
    orderNo: string,
    newStatus: AfterSalesStatus,
    operator: {
      operatorId: string;
      operatorName: string;
      operatorRole: OperatorRole;
      reason: string;
      extra?: Record<string, any>;
    }
  ): Promise<boolean> {
    const order = await this.db.get('SELECT status FROM after_sales_order WHERE order_no = ?', [orderNo]);
    if (!order) {
      return false;
    }

    await this.db.run(
      `UPDATE after_sales_order SET status = ?, update_time = ? WHERE order_no = ?`,
      [newStatus, moment().toISOString(), orderNo]
    );

    await this.db.run(
      `INSERT INTO status_log 
       (id, order_no, from_status, to_status, operator_id, operator_name, operator_role, reason, operate_time, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        orderNo,
        order.status,
        newStatus,
        operator.operatorId,
        operator.operatorName,
        operator.operatorRole,
        operator.reason,
        moment().toISOString(),
        operator.extra ? JSON.stringify(operator.extra) : null
      ]
    );

    return true;
  }

  async getStatusHistory(orderNo: string): Promise<any[]> {
    return await this.db.all(
      `SELECT * FROM status_log WHERE order_no = ? ORDER BY operate_time ASC`,
      [orderNo]
    );
  }

  async getDirtyRecords(orderNo?: string, isResolved?: boolean): Promise<any[]> {
    let sql = `SELECT * FROM dirty_record`;
    const params: any[] = [];

    if (orderNo !== undefined || isResolved !== undefined) {
      sql += ` WHERE 1=1`;
      if (orderNo !== undefined) {
        sql += ` AND order_no = ?`;
        params.push(orderNo);
      }
      if (isResolved !== undefined) {
        sql += ` AND is_resolved = ?`;
        params.push(isResolved ? 1 : 0);
      }
    }

    sql += ` ORDER BY create_time DESC`;
    return await this.db.all(sql, params);
  }

  async getReconciliationResults(orderNo?: string, isMatched?: boolean): Promise<any[]> {
    let sql = `SELECT * FROM reconciliation_result`;
    const params: any[] = [];

    if (orderNo !== undefined || isMatched !== undefined) {
      sql += ` WHERE 1=1`;
      if (orderNo !== undefined) {
        sql += ` AND order_no = ?`;
        params.push(orderNo);
      }
      if (isMatched !== undefined) {
        sql += ` AND is_matched = ?`;
        params.push(isMatched ? 1 : 0);
      }
    }

    sql += ` ORDER BY create_time DESC`;
    return await this.db.all(sql, params);
  }
}
