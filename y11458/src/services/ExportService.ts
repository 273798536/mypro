import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment';
import { AfterSalesService } from './AfterSalesService';
import { DataProcessor } from './DataProcessor';

export class ExportService {
  private exportDir: string;
  private afterSalesService: AfterSalesService;
  private dataProcessor: DataProcessor;

  constructor(exportDir: string, dbPath: string) {
    this.exportDir = exportDir;
    this.afterSalesService = new AfterSalesService(dbPath);
    this.dataProcessor = new DataProcessor(dbPath);
    this.ensureExportDir();
  }

  private ensureExportDir(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async exportOrders(city?: string, status?: string): Promise<string> {
    const fileName = `orders_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filePath = path.join(this.exportDir, fileName);

    const result = await this.afterSalesService.getOrderList({
      page: 1,
      pageSize: 10000,
      city,
      status
    });

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'orderNo', title: '售后单号' },
        { id: 'city', title: '城市' },
        { id: 'leaderName', title: '团长' },
        { id: 'skuName', title: '商品' },
        { id: 'status', title: '状态' },
        { id: 'currentHandler', title: '当前处理人' },
        { id: 'createTime', title: '创建时间' },
        { id: 'updateTime', title: '更新时间' }
      ]
    });

    await csvWriter.writeRecords(result.list.map((item: any) => ({
      orderNo: item.order_no,
      city: item.city,
      leaderName: item.leader_name,
      skuName: item.sku_name,
      status: item.status,
      currentHandler: item.current_handler || '',
      createTime: item.create_time,
      updateTime: item.update_time
    })));

    return filePath;
  }

  async exportOrderDetail(orderNo: string): Promise<string> {
    const fileName = `order_${orderNo}_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filePath = path.join(this.exportDir, fileName);

    const detail = await this.afterSalesService.getOrderDetail(orderNo);
    if (!detail) {
      throw new Error('Order not found');
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'section', title: '模块' },
        { id: 'field', title: '字段' },
        { id: 'value', title: '值' }
      ]
    });

    const records: any[] = [];

    records.push(
      { section: '基本信息', field: '售后单号', value: detail.orderNo },
      { section: '基本信息', field: '城市', value: detail.city },
      { section: '基本信息', field: '团长', value: detail.leaderName },
      { section: '基本信息', field: '商品', value: detail.skuName },
      { section: '基本信息', field: '当前状态', value: detail.status }
    );

    if (detail.leaderRefund) {
      records.push(
        { section: '团长退款', field: '退款数量', value: detail.leaderRefund.refundQuantity },
        { section: '团长退款', field: '退款金额', value: detail.leaderRefund.refundAmount },
        { section: '团长退款', field: '退款原因', value: detail.leaderRefund.reason },
        { section: '团长退款', field: '提交时间', value: detail.leaderRefund.submitTime }
      );
    }

    if (detail.warehouseReview) {
      records.push(
        { section: '仓库复核', field: '实际数量', value: detail.warehouseReview.actualQuantity },
        { section: '仓库复核', field: '实际金额', value: detail.warehouseReview.actualAmount },
        { section: '仓库复核', field: '是否坏品', value: detail.warehouseReview.isDamaged ? '是' : '否' },
        { section: '仓库复核', field: '是否少发', value: detail.warehouseReview.isMissing ? '是' : '否' },
        { section: '仓库复核', field: '复核结果', value: detail.warehouseReview.reviewResult },
        { section: '仓库复核', field: '复核备注', value: detail.warehouseReview.reviewRemark || '' },
        { section: '仓库复核', field: '复核时间', value: detail.warehouseReview.reviewTime }
      );
    }

    if (detail.reconciliation) {
      records.push(
        { section: '对账结果', field: '问题类型', value: detail.reconciliation.issueType },
        { section: '对账结果', field: '团长申请金额', value: detail.reconciliation.leaderAmount },
        { section: '对账结果', field: '仓库复核金额', value: detail.reconciliation.warehouseAmount },
        { section: '对账结果', field: '实际退款金额', value: detail.reconciliation.refundAmount },
        { section: '对账结果', field: '差异金额', value: detail.reconciliation.difference },
        { section: '对账结果', field: '是否一致', value: detail.reconciliation.isMatched ? '是' : '否' },
        { section: '对账结果', field: '对账说明', value: detail.reconciliation.reconciliationRemark }
      );
    }

    records.push({ section: '状态流转', field: '', value: '' });
    detail.statusLogs.forEach((log, index) => {
      records.push({
        section: '状态流转',
        field: `步骤${index + 1}`,
        value: `${log.fromStatus || '无'} -> ${log.toStatus} | ${log.operatorName}(${log.operatorRole}) | ${log.reason} | ${log.operateTime}`
      });
    });

    if (detail.dirtyRecords.length > 0) {
      records.push({ section: '脏记录', field: '', value: '' });
      detail.dirtyRecords.forEach((record, index) => {
        records.push({
          section: '脏记录',
          field: `记录${index + 1}`,
          value: `${record.dirtyType} | ${record.fieldName || '-'} | ${record.suggestion} | ${record.isResolved ? '已解决' : '未解决'}`
        });
      });
    }

    await csvWriter.writeRecords(records);
    return filePath;
  }

  async exportDirtyRecords(isResolved?: boolean): Promise<string> {
    const fileName = `dirty_records_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filePath = path.join(this.exportDir, fileName);

    const records = await this.dataProcessor.getDirtyRecords(undefined, isResolved);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'orderNo', title: '售后单号' },
        { id: 'sourceType', title: '来源' },
        { id: 'dirtyType', title: '脏数据类型' },
        { id: 'fieldName', title: '字段名' },
        { id: 'expectedValue', title: '期望值' },
        { id: 'actualValue', title: '实际值' },
        { id: 'suggestion', title: '处理建议' },
        { id: 'isResolved', title: '是否已解决' },
        { id: 'resolvedBy', title: '解决人' },
        { id: 'resolveRemark', title: '解决说明' },
        { id: 'createTime', title: '创建时间' }
      ]
    });

    await csvWriter.writeRecords(records.map((item: any) => ({
      orderNo: item.order_no,
      sourceType: item.source_type,
      dirtyType: item.dirty_type,
      fieldName: item.field_name || '',
      expectedValue: item.expected_value || '',
      actualValue: item.actual_value || '',
      suggestion: item.suggestion,
      isResolved: item.is_resolved ? '是' : '否',
      resolvedBy: item.resolved_by || '',
      resolveRemark: item.resolve_remark || '',
      createTime: item.create_time
    })));

    return filePath;
  }

  async exportReconciliationReport(city?: string): Promise<string> {
    const fileName = `reconciliation_report_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filePath = path.join(this.exportDir, fileName);

    const records = await this.dataProcessor.getReconciliationResults();
    const orderDetails = await Promise.all(
      records.map((r: any) => this.afterSalesService.getOrderDetail(r.order_no))
    );

    const filteredRecords = records.filter((r: any, index: number) => {
      if (!city) return true;
      return orderDetails[index]?.city === city;
    });

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'orderNo', title: '售后单号' },
        { id: 'city', title: '城市' },
        { id: 'issueType', title: '问题类型' },
        { id: 'leaderAmount', title: '团长申请金额' },
        { id: 'warehouseAmount', title: '仓库复核金额' },
        { id: 'refundAmount', title: '实际退款金额' },
        { id: 'difference', title: '差异金额' },
        { id: 'isMatched', title: '是否平账' },
        { id: 'remark', title: '说明' },
        { id: 'createTime', title: '对账时间' }
      ]
    });

    await csvWriter.writeRecords(filteredRecords.map((item: any) => {
      const detail = orderDetails.find((d: any) => d?.orderNo === item.order_no);
      return {
        orderNo: item.order_no,
        city: detail?.city || '',
        issueType: item.issue_type,
        leaderAmount: item.leader_amount,
        warehouseAmount: item.warehouse_amount,
        refundAmount: item.refund_amount,
        difference: item.difference,
        isMatched: item.is_matched ? '是' : '否',
        remark: item.reconciliation_remark,
        createTime: item.create_time
      };
    }));

    return filePath;
  }

  async exportStatusLogs(orderNo?: string): Promise<string> {
    const fileName = `status_logs_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filePath = path.join(this.exportDir, fileName);

    const logs = await this.afterSalesService.getStatusLogs(orderNo);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'orderNo', title: '售后单号' },
        { id: 'fromStatus', title: '原状态' },
        { id: 'toStatus', title: '新状态' },
        { id: 'operatorName', title: '操作人' },
        { id: 'operatorRole', title: '角色' },
        { id: 'reason', title: '原因' },
        { id: 'operateTime', title: '操作时间' }
      ]
    });

    await csvWriter.writeRecords(logs.map((item: any) => ({
      orderNo: item.order_no,
      fromStatus: item.from_status || '无',
      toStatus: item.to_status,
      operatorName: item.operator_name,
      operatorRole: item.operator_role,
      reason: item.reason,
      operateTime: item.operate_time
    })));

    return filePath;
  }
}
