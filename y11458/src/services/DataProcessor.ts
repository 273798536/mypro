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

export interface ResolveDirtyRecordRequest {
  dirtyId: string;
  resolverId: string;
  resolverName: string;
  remark: string;
  correctedValue?: string;
  reReconcile?: boolean;
}

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
    dirtyRecords.push(...await this.detectQuantityConflictRecords());
    dirtyRecords.push(...await this.detectOrphanRecords());

    await this.saveDirtyRecords(dirtyRecords);
    return dirtyRecords;
  }

  private async detectLeaderRefundDirtyRecords(): Promise<DirtyRecord[]> {
    const records: DirtyRecord[] = [];
    const leaderRefunds = await this.db.all('SELECT * FROM leader_refund');

    for (const refund of leaderRefunds) {
      const requiredFields = ['leader_id', 'leader_name', 'city', 'sku_id', 'sku_name', 'refund_quantity', 'refund_amount', 'reason', 'submit_time'];
      for (const field of requiredFields) {
        if (!refund[field] && refund[field] !== 0) {
          records.push({
            id: uuidv4(),
            sourceType: 'LEADER_REFUND',
            sourceId: refund.id,
            orderNo: refund.order_no,
            dirtyType: DirtyRecordType.MISSING_FIELD,
            fieldName: field,
            expectedValue: '非空',
            actualValue: refund[field] === null ? 'null' : String(refund[field] || ''),
            suggestion: `请补充${field}字段`,
            rawData: refund,
            isResolved: false,
            createTime: moment().toISOString()
          });
        }
      }

      if (refund.submit_time) {
        const submitTime = moment(refund.submit_time);
        const order = await this.db.get('SELECT create_time FROM after_sales_order WHERE order_no = ?', [refund.order_no]);
        
        if (order) {
          const orderCreateTime = moment(order.create_time);
          const daysDiff = Math.abs(submitTime.diff(orderCreateTime, 'days'));
          
          if (daysDiff > 1) {
            records.push({
              id: uuidv4(),
              sourceType: 'LEADER_REFUND',
              sourceId: refund.id,
              orderNo: refund.order_no,
              dirtyType: DirtyRecordType.CROSS_DAY,
              fieldName: 'submit_time',
              expectedValue: `订单创建后1天内（${orderCreateTime.format('YYYY-MM-DD')}）`,
              actualValue: submitTime.format('YYYY-MM-DD HH:mm:ss'),
              suggestion: `退款提交时间跨日${daysDiff}天，建议核实`,
              rawData: refund,
              isResolved: false,
              createTime: moment().toISOString()
            });
          }
        }

        if (submitTime.hour() >= 23 || submitTime.hour() < 6) {
          records.push({
            id: uuidv4(),
            sourceType: 'LEADER_REFUND',
            sourceId: refund.id,
            orderNo: refund.order_no,
            dirtyType: DirtyRecordType.CROSS_DAY,
            fieldName: 'submit_time',
            expectedValue: '正常工作时间(06:00-23:00)',
            actualValue: submitTime.format('HH:mm:ss'),
            suggestion: '深夜提交，建议核实是否异常',
            rawData: refund,
            isResolved: false,
            createTime: moment().toISOString()
          });
        }
      }
    }

    return records;
  }

  private async detectWarehouseReviewDirtyRecords(): Promise<DirtyRecord[]> {
    const records: DirtyRecord[] = [];
    const reviews = await this.db.all('SELECT * FROM warehouse_review');

    for (const review of reviews) {
      if (review.sku_name && (review.sku_name.includes('(新)') || review.sku_name.includes('旧') || review.sku_name.includes('改名'))) {
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

      if (review.review_time) {
        const reviewTime = moment(review.review_time);
        const refund = await this.db.get('SELECT submit_time FROM leader_refund WHERE order_no = ?', [review.order_no]);
        
        if (refund && refund.submit_time) {
          const refundSubmitTime = moment(refund.submit_time);
          const hoursDiff = reviewTime.diff(refundSubmitTime, 'hours');
          
          if (hoursDiff > 48 || hoursDiff < 0) {
            records.push({
              id: uuidv4(),
              sourceType: 'WAREHOUSE_REVIEW',
              sourceId: review.id,
              orderNo: review.order_no,
              dirtyType: DirtyRecordType.CROSS_DAY,
              fieldName: 'review_time',
              expectedValue: '退款提交后48小时内',
              actualValue: `${hoursDiff > 0 ? hoursDiff : '提前' + Math.abs(hoursDiff)}小时`,
              suggestion: hoursDiff > 48 ? '复核超时，建议核实' : '复核时间早于退款提交时间，数据异常',
              rawData: review,
              isResolved: false,
              createTime: moment().toISOString()
            });
          }
        }
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
          actualValue: String(refundAmount),
          suggestion: `退款金额${refundAmount}与仓库复核金额${warehouseAmount}不一致，差异${(refundAmount - warehouseAmount).toFixed(2)}元`,
          rawData: flow,
          isResolved: false,
          createTime: moment().toISOString()
        });
      }
    }

    return records;
  }

  private async detectQuantityConflictRecords(): Promise<DirtyRecord[]> {
    const records: DirtyRecord[] = [];
    
    const leaderRefunds = await this.db.all('SELECT order_no, id, refund_quantity FROM leader_refund');
    const reviews = await this.db.all('SELECT order_no, id, actual_quantity FROM warehouse_review');
    
    const reviewQuantityMap = new Map<string, { quantity: number | null; id: string }>();
    for (const r of reviews as any[]) {
      reviewQuantityMap.set(r.order_no, { quantity: r.actual_quantity, id: r.id });
    }

    for (const refund of leaderRefunds as any[]) {
      const reviewInfo = reviewQuantityMap.get(refund.order_no);
      
      if (reviewInfo && reviewInfo.quantity !== null && refund.refund_quantity !== null) {
        if (reviewInfo.quantity !== refund.refund_quantity) {
          records.push({
            id: uuidv4(),
            sourceType: 'WAREHOUSE_REVIEW',
            sourceId: reviewInfo.id,
            orderNo: refund.order_no,
            dirtyType: DirtyRecordType.QUANTITY_CONFLICT,
            fieldName: 'actual_quantity',
            expectedValue: String(refund.refund_quantity),
            actualValue: String(reviewInfo.quantity),
            suggestion: `团长申请${refund.refund_quantity}件，仓库复核${reviewInfo.quantity}件，数量不一致`,
            rawData: { leaderRefund: refund, warehouseReview: reviewInfo },
            isResolved: false,
            createTime: moment().toISOString()
          });
        }
      }
    }

    return records;
  }

  private async detectOrphanRecords(): Promise<DirtyRecord[]> {
    const records: DirtyRecord[] = [];
    
    const allOrderNos = new Set(
      (await this.db.all('SELECT order_no FROM after_sales_order')).map((o: any) => o.order_no)
    );

    const sourceTables = [
      { name: 'leader_refund', type: 'LEADER_REFUND' as const },
      { name: 'warehouse_review', type: 'WAREHOUSE_REVIEW' as const },
      { name: 'user_remark', type: 'USER_REMARK' as const },
      { name: 'refund_flow', type: 'REFUND_FLOW' as const }
    ];

    for (const table of sourceTables) {
      const items = await this.db.all(`SELECT id, order_no FROM ${table.name}`);
      for (const item of items) {
        if (!allOrderNos.has(item.order_no)) {
          records.push({
            id: uuidv4(),
            sourceType: table.type,
            sourceId: item.id,
            orderNo: item.order_no,
            dirtyType: DirtyRecordType.MISSING_FIELD,
            fieldName: 'order_no',
            expectedValue: '存在对应的售后单',
            actualValue: item.order_no,
            suggestion: `${table.type}记录无对应售后单，建议关联或删除`,
            rawData: item,
            isResolved: false,
            createTime: moment().toISOString()
          });
        }
      }
    }

    return records;
  }

  private async saveDirtyRecords(records: DirtyRecord[]): Promise<void> {
    for (const record of records) {
      const existing = await this.db.get(
        `SELECT id FROM dirty_record WHERE source_id = ? AND dirty_type = ? AND is_resolved = 0`,
        [record.sourceId, record.dirtyType]
      );
      
      if (!existing) {
        await this.db.run(
          `INSERT INTO dirty_record 
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
  }

  async resolveDirtyRecord(request: ResolveDirtyRecordRequest): Promise<{
    success: boolean;
    message: string;
    reReconciled?: boolean;
    reconciliationResult?: ReconciliationResult | null;
  }> {
    const { dirtyId, resolverId, resolverName, remark, correctedValue, reReconcile = true } = request;

    const dirtyRecord = await this.db.get(
      `SELECT * FROM dirty_record WHERE id = ?`,
      [dirtyId]
    );

    if (!dirtyRecord) {
      return { success: false, message: '脏记录不存在' };
    }

    if (correctedValue && dirtyRecord.field_name) {
      const updateSuccess = await this.updateSourceRecord(
        dirtyRecord.source_type,
        dirtyRecord.source_id,
        dirtyRecord.field_name,
        correctedValue
      );
      
      if (!updateSuccess) {
        return { success: false, message: '修正原始记录失败' };
      }
    }

    await this.db.run(
      `UPDATE dirty_record SET is_resolved = 1, resolved_by = ?, resolved_time = ?, resolve_remark = ? WHERE id = ?`,
      [resolverName, moment().toISOString(), remark, dirtyId]
    );

    await this.db.run(
      `INSERT INTO status_log 
       (id, order_no, from_status, to_status, operator_id, operator_name, operator_role, reason, operate_time, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        dirtyRecord.order_no,
        null,
        null,
        resolverId,
        resolverName,
        OperatorRole.CITY_MANAGER,
        `解决脏记录: ${dirtyRecord.dirty_type} - ${remark}`,
        moment().toISOString(),
        JSON.stringify({ dirtyId, dirtyType: dirtyRecord.dirty_type, correctedValue })
      ]
    );

    let reconciliationResult: ReconciliationResult | null = null;
    if (reReconcile && dirtyRecord.order_no) {
      reconciliationResult = await this.reconcileOrder(dirtyRecord.order_no);
    }

    return {
      success: true,
      message: '脏记录已解决',
      reReconciled: reReconcile,
      reconciliationResult
    };
  }

  private async updateSourceRecord(
    sourceType: string,
    sourceId: string,
    fieldName: string,
    correctedValue: string
  ): Promise<boolean> {
    let tableName = '';
    switch (sourceType) {
      case 'LEADER_REFUND':
        tableName = 'leader_refund';
        break;
      case 'WAREHOUSE_REVIEW':
        tableName = 'warehouse_review';
        break;
      case 'USER_REMARK':
        tableName = 'user_remark';
        break;
      case 'REFUND_FLOW':
        tableName = 'refund_flow';
        break;
      default:
        return false;
    }

    let finalValue: any = correctedValue;
    if (fieldName.includes('quantity') || fieldName.includes('amount')) {
      finalValue = parseFloat(correctedValue);
    }

    try {
      const result = await this.db.run(
        `UPDATE ${tableName} SET ${fieldName} = ? WHERE id = ?`,
        [finalValue, sourceId]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('更新原始记录失败:', error);
      return false;
    }
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
      .reduce((sum: number, f: any) => sum + (f.refund_amount || 0), 0);

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

    const existingResult = await this.db.get(
      'SELECT id FROM reconciliation_result WHERE order_no = ?',
      [orderNo]
    );

    const resultId = existingResult?.id || uuidv4();

    const result: ReconciliationResult = {
      id: resultId,
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
        moment().toISOString(),
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

    if (order.status !== newStatus) {
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
    }

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
