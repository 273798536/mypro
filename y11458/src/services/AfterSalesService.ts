import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { getDatabase } from '../database';
import { AfterSalesStatus, OperatorRole, AfterSalesOrder, PaginationParams, PaginationResult } from '../types';

export class AfterSalesService {
  private db: any;

  constructor(dbPath: string) {
    this.db = getDatabase(dbPath);
  }

  async getOrderDetail(orderNo: string): Promise<AfterSalesOrder | null> {
    const order = await this.db.get('SELECT * FROM after_sales_order WHERE order_no = ?', [orderNo]);
    if (!order) {
      return null;
    }

    const leaderRefund = await this.db.get('SELECT * FROM leader_refund WHERE order_no = ?', [orderNo]);
    const warehouseReview = await this.db.get('SELECT * FROM warehouse_review WHERE order_no = ?', [orderNo]);
    const userRemarks = await this.db.all('SELECT * FROM user_remark WHERE order_no = ? ORDER BY create_time DESC', [orderNo]);
    const refundFlows = await this.db.all('SELECT * FROM refund_flow WHERE order_no = ? ORDER BY operate_time DESC', [orderNo]);
    const statusLogs = await this.db.all('SELECT * FROM status_log WHERE order_no = ? ORDER BY operate_time ASC', [orderNo]);
    const dirtyRecords = await this.db.all('SELECT * FROM dirty_record WHERE order_no = ? ORDER BY create_time DESC', [orderNo]);
    const reconciliation = await this.db.get('SELECT * FROM reconciliation_result WHERE order_no = ?', [orderNo]);

    return {
      orderNo: order.order_no,
      city: order.city,
      leaderId: order.leader_id,
      leaderName: order.leader_name,
      skuId: order.sku_id,
      skuName: order.sku_name,
      status: order.status,
      currentHandler: order.current_handler,
      leaderRefund: leaderRefund ? {
        id: leaderRefund.id,
        orderNo: leaderRefund.order_no,
        leaderId: leaderRefund.leader_id,
        leaderName: leaderRefund.leader_name,
        city: leaderRefund.city,
        skuId: leaderRefund.sku_id,
        skuName: leaderRefund.sku_name,
        refundQuantity: leaderRefund.refund_quantity,
        refundAmount: leaderRefund.refund_amount,
        reason: leaderRefund.reason,
        submitTime: leaderRefund.submit_time,
        images: leaderRefund.images ? JSON.parse(leaderRefund.images) : undefined,
        rawData: leaderRefund.raw_data ? JSON.parse(leaderRefund.raw_data) : undefined
      } : undefined,
      warehouseReview: warehouseReview ? {
        id: warehouseReview.id,
        orderNo: warehouseReview.order_no,
        reviewerId: warehouseReview.reviewer_id,
        reviewerName: warehouseReview.reviewer_name,
        skuId: warehouseReview.sku_id,
        skuName: warehouseReview.sku_name,
        actualQuantity: warehouseReview.actual_quantity,
        actualAmount: warehouseReview.actual_amount,
        isDamaged: !!warehouseReview.is_damaged,
        isMissing: !!warehouseReview.is_missing,
        reviewResult: warehouseReview.review_result,
        reviewRemark: warehouseReview.review_remark,
        reviewTime: warehouseReview.review_time,
        rawData: warehouseReview.raw_data ? JSON.parse(warehouseReview.raw_data) : undefined
      } : undefined,
      userRemarks: userRemarks.map((r: any) => ({
        id: r.id,
        orderNo: r.order_no,
        userId: r.user_id,
        userName: r.user_name,
        content: r.content,
        images: r.images ? JSON.parse(r.images) : undefined,
        createTime: r.create_time,
        rawData: r.raw_data ? JSON.parse(r.raw_data) : undefined
      })),
      refundFlows: refundFlows.map((f: any) => ({
        id: f.id,
        orderNo: f.order_no,
        flowNo: f.flow_no,
        refundAmount: f.refund_amount,
        refundMethod: f.refund_method,
        refundStatus: f.refund_status,
        operatorId: f.operator_id,
        operatorName: f.operator_name,
        operateTime: f.operate_time,
        rawData: f.raw_data ? JSON.parse(f.raw_data) : undefined
      })),
      statusLogs: statusLogs.map((l: any) => ({
        id: l.id,
        orderNo: l.order_no,
        fromStatus: l.from_status,
        toStatus: l.to_status,
        operatorId: l.operator_id,
        operatorName: l.operator_name,
        operatorRole: l.operator_role,
        reason: l.reason,
        operateTime: l.operate_time,
        extra: l.extra ? JSON.parse(l.extra) : undefined
      })),
      dirtyRecords: dirtyRecords.map((d: any) => ({
        id: d.id,
        sourceType: d.source_type,
        sourceId: d.source_id,
        orderNo: d.order_no,
        dirtyType: d.dirty_type,
        fieldName: d.field_name,
        expectedValue: d.expected_value,
        actualValue: d.actual_value,
        suggestion: d.suggestion,
        rawData: d.raw_data ? JSON.parse(d.raw_data) : {},
        isResolved: !!d.is_resolved,
        resolvedBy: d.resolved_by,
        resolvedTime: d.resolved_time,
        resolveRemark: d.resolve_remark,
        createTime: d.create_time
      })),
      reconciliation: reconciliation ? {
        id: reconciliation.id,
        orderNo: reconciliation.order_no,
        issueType: reconciliation.issue_type,
        leaderAmount: reconciliation.leader_amount,
        warehouseAmount: reconciliation.warehouse_amount,
        refundAmount: reconciliation.refund_amount,
        difference: reconciliation.difference,
        isMatched: !!reconciliation.is_matched,
        reconciliationRemark: reconciliation.reconciliation_remark,
        reconciledBy: reconciliation.reconciled_by,
        reconciledTime: reconciliation.reconciled_time,
        createTime: reconciliation.create_time
      } : undefined,
      createTime: order.create_time,
      updateTime: order.update_time
    };
  }

  async getOrderList(params: PaginationParams & {
    city?: string;
    status?: string;
    leaderId?: string;
  }): Promise<PaginationResult<any>> {
    const { page, pageSize, city, status, leaderId } = params;
    const offset = (page - 1) * pageSize;

    let countSql = `SELECT COUNT(*) as total FROM after_sales_order WHERE 1=1`;
    let listSql = `SELECT * FROM after_sales_order WHERE 1=1`;
    const countParams: any[] = [];
    const listParams: any[] = [];

    if (city) {
      countSql += ` AND city = ?`;
      listSql += ` AND city = ?`;
      countParams.push(city);
      listParams.push(city);
    }

    if (status) {
      countSql += ` AND status = ?`;
      listSql += ` AND status = ?`;
      countParams.push(status);
      listParams.push(status);
    }

    if (leaderId) {
      countSql += ` AND leader_id = ?`;
      listSql += ` AND leader_id = ?`;
      countParams.push(leaderId);
      listParams.push(leaderId);
    }

    listSql += ` ORDER BY create_time DESC LIMIT ? OFFSET ?`;
    listParams.push(pageSize, offset);

    const countResult = await this.db.get(countSql, countParams);
    const list = await this.db.all(listSql, listParams);

    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async createOrder(data: {
    city: string;
    leaderId: string;
    leaderName: string;
    skuId: string;
    skuName: string;
  }): Promise<string> {
    const orderNo = `AS${moment().format('YYYYMMDDHHmmss')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    const now = moment().toISOString();

    await this.db.run(
      `INSERT INTO after_sales_order (order_no, city, leader_id, leader_name, sku_id, sku_name, status, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderNo, data.city, data.leaderId, data.leaderName, data.skuId, data.skuName, AfterSalesStatus.CREATED, now, now]
    );

    await this.db.run(
      `INSERT INTO status_log (id, order_no, from_status, to_status, operator_id, operator_name, operator_role, reason, operate_time, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), orderNo, null, AfterSalesStatus.CREATED, 'SYS001', '系统', OperatorRole.SYSTEM, '售后单创建', now, null]
    );

    return orderNo;
  }

  async submitLeaderRefund(orderNo: string, data: {
    refundQuantity: number;
    refundAmount: number;
    reason: string;
    operatorId: string;
    operatorName: string;
  }): Promise<boolean> {
    const now = moment().toISOString();

    await this.db.run(
      `INSERT INTO leader_refund (id, order_no, leader_id, leader_name, city, sku_id, sku_name, refund_quantity, refund_amount, reason, submit_time, images, raw_data)
       SELECT ?, ?, leader_id, leader_name, city, sku_id, sku_name, ?, ?, ?, ?, ?, ?
       FROM after_sales_order WHERE order_no = ?`,
      [uuidv4(), orderNo, data.refundQuantity, data.refundAmount, data.reason, now, null, null, orderNo]
    );

    await this.db.run(
      `UPDATE after_sales_order SET status = ?, current_handler = ?, update_time = ? WHERE order_no = ?`,
      [AfterSalesStatus.LEADER_SUBMITTED, 'WAREHOUSE', now, orderNo]
    );

    await this.db.run(
      `INSERT INTO status_log (id, order_no, from_status, to_status, operator_id, operator_name, operator_role, reason, operate_time, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), orderNo, AfterSalesStatus.CREATED, AfterSalesStatus.LEADER_SUBMITTED, data.operatorId, data.operatorName, OperatorRole.LEADER, '团长提交退款申请', now, null]
    );

    return true;
  }

  async warehouseReview(orderNo: string, data: {
    actualQuantity: number;
    actualAmount: number;
    isDamaged: boolean;
    isMissing: boolean;
    reviewResult: 'APPROVED' | 'REJECTED';
    reviewRemark?: string;
    operatorId: string;
    operatorName: string;
  }): Promise<boolean> {
    const now = moment().toISOString();
    const order = await this.db.get('SELECT sku_id, sku_name, status FROM after_sales_order WHERE order_no = ?', [orderNo]);

    if (!order || order.status !== AfterSalesStatus.LEADER_SUBMITTED) {
      return false;
    }

    await this.db.run(
      `INSERT INTO warehouse_review (id, order_no, reviewer_id, reviewer_name, sku_id, sku_name, actual_quantity, actual_amount, is_damaged, is_missing, review_result, review_remark, review_time, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), orderNo, data.operatorId, data.operatorName, order.sku_id, order.sku_name, data.actualQuantity, data.actualAmount, data.isDamaged ? 1 : 0, data.isMissing ? 1 : 0, data.reviewResult, data.reviewRemark || null, now, null]
    );

    const newStatus = data.reviewResult === 'APPROVED' ? AfterSalesStatus.WAREHOUSE_APPROVED : AfterSalesStatus.WAREHOUSE_REJECTED;

    await this.db.run(
      `UPDATE after_sales_order SET status = ?, current_handler = ?, update_time = ? WHERE order_no = ?`,
      [newStatus, data.reviewResult === 'APPROVED' ? 'FINANCE' : null, now, orderNo]
    );

    await this.db.run(
      `INSERT INTO status_log (id, order_no, from_status, to_status, operator_id, operator_name, operator_role, reason, operate_time, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), orderNo, AfterSalesStatus.LEADER_SUBMITTED, newStatus, data.operatorId, data.operatorName, OperatorRole.WAREHOUSE, data.reviewResult === 'APPROVED' ? '仓库复核通过' : '仓库复核驳回', now, JSON.stringify({ isDamaged: data.isDamaged, isMissing: data.isMissing })]
    );

    return true;
  }

  async processRefund(orderNo: string, data: {
    refundAmount: number;
    refundMethod: string;
    operatorId: string;
    operatorName: string;
  }): Promise<boolean> {
    const now = moment().toISOString();
    const order = await this.db.get('SELECT status FROM after_sales_order WHERE order_no = ?', [orderNo]);

    if (!order || order.status !== AfterSalesStatus.WAREHOUSE_APPROVED) {
      return false;
    }

    const flowNo = `RF${moment().format('YYYYMMDDHHmmss')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    const success = Math.random() > 0.1;

    await this.db.run(
      `INSERT INTO refund_flow (id, order_no, flow_no, refund_amount, refund_method, refund_status, operator_id, operator_name, operate_time, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), orderNo, flowNo, data.refundAmount, data.refundMethod, success ? 'SUCCESS' : 'FAILED', data.operatorId, data.operatorName, now, null]
    );

    const newStatus = success ? AfterSalesStatus.REFUND_SUCCESS : AfterSalesStatus.REFUND_FAILED;

    await this.db.run(
      `UPDATE after_sales_order SET status = ?, update_time = ? WHERE order_no = ?`,
      [newStatus, now, orderNo]
    );

    await this.db.run(
      `INSERT INTO status_log (id, order_no, from_status, to_status, operator_id, operator_name, operator_role, reason, operate_time, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), orderNo, AfterSalesStatus.WAREHOUSE_APPROVED, newStatus, data.operatorId, data.operatorName, OperatorRole.FINANCE, success ? '退款成功' : '退款失败', now, JSON.stringify({ flowNo })]
    );

    return success;
  }

  async addUserRemark(orderNo: string, data: {
    userId: string;
    userName: string;
    content: string;
    images?: string[];
  }): Promise<boolean> {
    const now = moment().toISOString();

    await this.db.run(
      `INSERT INTO user_remark (id, order_no, user_id, user_name, content, images, create_time, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), orderNo, data.userId, data.userName, data.content, data.images ? JSON.stringify(data.images) : null, now, null]
    );

    return true;
  }

  async getStatusLogs(orderNo?: string): Promise<any[]> {
    if (orderNo) {
      return await this.db.all(
        `SELECT * FROM status_log WHERE order_no = ? ORDER BY operate_time ASC`,
        [orderNo]
      );
    }
    return await this.db.all('SELECT * FROM status_log ORDER BY operate_time DESC');
  }

  async getStatistics(city?: string): Promise<any> {
    let whereClause = '';
    const params: any[] = [];

    if (city) {
      whereClause = 'WHERE city = ?';
      params.push(city);
    }

    const total = await this.db.get(`SELECT COUNT(*) as count FROM after_sales_order ${whereClause}`, params);
    const byStatus = await this.db.all(`SELECT status, COUNT(*) as count FROM after_sales_order ${whereClause} GROUP BY status`, params);

    const dirtyRecords = await this.db.get(
      `SELECT COUNT(*) as count FROM dirty_record WHERE is_resolved = 0 
       ${city ? 'AND order_no IN (SELECT order_no FROM after_sales_order WHERE city = ?)' : ''}`,
      city ? [city] : []
    );

    const unmatched = await this.db.get(
      `SELECT COUNT(*) as count FROM reconciliation_result WHERE is_matched = 0
       ${city ? 'AND order_no IN (SELECT order_no FROM after_sales_order WHERE city = ?)' : ''}`,
      city ? [city] : []
    );

    return {
      totalOrders: total?.count || 0,
      byStatus: byStatus.reduce((acc: any, item: any) => {
        acc[item.status] = item.count;
        return acc;
      }, {}),
      unresolvedDirtyRecords: dirtyRecords?.count || 0,
      unmatchedReconciliations: unmatched?.count || 0
    };
  }
}
