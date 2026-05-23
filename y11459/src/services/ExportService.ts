import { Parser } from 'json2csv';
import { LeaderRefund } from '../entities/LeaderRefund';
import { WarehouseReview } from '../entities/WarehouseReview';
import { Batch } from '../entities/Batch';
import { maskDataArray, UserRole } from '../utils/dataMasking';
import { auditService } from './AuditService';

export type ExportFormat = 'csv' | 'json';
export type ExportType = 'refunds' | 'reviews' | 'full' | 'summary';

export interface ExportOptions {
  batchId: string;
  exportType: ExportType;
  format: ExportFormat;
  role: UserRole;
  operatorId?: string;
  operatorName?: string;
  includeSensitive?: boolean;
}

export class ExportService {
  async export(options: ExportOptions): Promise<{ data: string; filename: string }> {
    const batch = await this.getBatchInfo(options.batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }

    let exportData: any[];
    let filename: string;

    switch (options.exportType) {
      case 'refunds':
        exportData = await this.exportRefunds(options.batchId, options.role);
        filename = `${batch.batchNo}_退款明细_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'reviews':
        exportData = await this.exportReviews(options.batchId, options.role);
        filename = `${batch.batchNo}_复核明细_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'full':
        exportData = await this.exportFull(options.batchId, options.role);
        filename = `${batch.batchNo}_完整数据_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'summary':
        exportData = await this.exportSummary(options.batchId, options.role);
        filename = `${batch.batchNo}_汇总报表_${new Date().toISOString().split('T')[0]}`;
        break;
      default:
        throw new Error('不支持的导出类型');
    }

    await auditService.log({
      action: 'export',
      entityType: 'batch',
      entityId: options.batchId,
      batchId: options.batchId,
      operatorId: options.operatorId,
      operatorName: options.operatorName,
      changeReason: `导出数据: ${options.exportType}, 格式: ${options.format}`,
      newValue: JSON.stringify({ count: exportData.length }),
    });

    if (options.format === 'csv') {
      const parser = new Parser();
      return {
        data: parser.parse(exportData),
        filename: `${filename}.csv`,
      };
    } else {
      return {
        data: JSON.stringify(exportData, null, 2),
        filename: `${filename}.json`,
      };
    }
  }

  private async getBatchInfo(batchId: string): Promise<Batch | null> {
    const batchRepository = (await import('../database')).AppDataSource.getRepository(Batch);
    return await batchRepository.findOne({ where: { id: batchId } });
  }

  private async exportRefunds(batchId: string, role: UserRole): Promise<any[]> {
    const refundRepository = (await import('../database')).AppDataSource.getRepository(LeaderRefund);
    const refunds = await refundRepository.find({ where: { batchId } });

    return maskDataArray(refunds.map(r => ({
      退款单号: r.refundNo,
      订单号: r.orderNo,
      团长ID: r.leaderId,
      团长姓名: r.leaderName,
      团长电话: r.leaderPhone,
      用户ID: r.userId,
      用户姓名: r.userName,
      用户电话: r.userPhone,
      退款类型: this.translateRefundType(r.refundType),
      商品SKU: r.productSku,
      商品名称: r.productName,
      数量: r.quantity,
      单价: r.unitPrice,
      退款金额: r.refundAmount,
      退款原因: r.refundReason,
      状态: this.translateStatus(r.status),
      是否匹配: r.isMatched ? '是' : '否',
      匹配金额: r.matchedAmount,
      差额: r.diffAmount,
      处理备注: r.processRemark,
      创建时间: r.createdAt.toISOString(),
    })), role);
  }

  private async exportReviews(batchId: string, role: UserRole): Promise<any[]> {
    const reviewRepository = (await import('../database')).AppDataSource.getRepository(WarehouseReview);
    const reviews = await reviewRepository.find({ where: { batchId } });

    return reviews.map(r => ({
      复核单号: r.reviewNo,
      订单号: r.orderNo,
      仓库编码: r.warehouseCode,
      仓库名称: r.warehouseName,
      复核人ID: r.reviewerId,
      复核人姓名: r.reviewerName,
      商品SKU: r.productSku,
      商品名称: r.productName,
      实发数量: r.actualQuantity,
      应发数量: r.shouldQuantity,
      差异数量: r.diffQuantity,
      补偿金额: r.compensationAmount,
      复核结果: this.translateReviewResult(r.reviewResult),
      复核备注: r.reviewRemark,
      是否匹配: r.isMatched ? '是' : '否',
      复核时间: r.reviewedAt.toISOString(),
    }));
  }

  private async exportFull(batchId: string, role: UserRole): Promise<any[]> {
    const refundRepository = (await import('../database')).AppDataSource.getRepository(LeaderRefund);
    const reviewRepository = (await import('../database')).AppDataSource.getRepository(WarehouseReview);

    const refunds = await refundRepository.find({ where: { batchId } });
    const reviews = await reviewRepository.find({ where: { batchId } });

    const result: any[] = [];

    for (const refund of refunds) {
      const review = reviews.find(r => r.id === refund.matchedReviewId);
      result.push({
        类型: '退款记录',
        退款单号: refund.refundNo,
        订单号: refund.orderNo,
        团长姓名: refund.leaderName,
        团长电话: refund.leaderPhone,
        用户姓名: refund.userName,
        用户电话: refund.userPhone,
        退款类型: this.translateRefundType(refund.refundType),
        商品SKU: refund.productSku,
        商品名称: refund.productName,
        退款数量: refund.quantity,
        退款金额: refund.refundAmount,
        退款原因: refund.refundReason,
        退款状态: this.translateStatus(refund.status),
        复核单号: review?.reviewNo || '',
        仓库名称: review?.warehouseName || '',
        实发数量: review?.actualQuantity || '',
        补偿金额: review?.compensationAmount || '',
        复核结果: review ? this.translateReviewResult(review.reviewResult) : '',
        是否匹配: refund.isMatched ? '是' : '否',
        差额: refund.diffAmount,
        处理去向: this.getDisposition(refund.status, refund.isMatched),
      });
    }

    return maskDataArray(result, role);
  }

  private async exportSummary(batchId: string, role: UserRole): Promise<any[]> {
    const batch = await this.getBatchInfo(batchId);
    const refundRepository = (await import('../database')).AppDataSource.getRepository(LeaderRefund);
    const reviewRepository = (await import('../database')).AppDataSource.getRepository(WarehouseReview);

    const refunds = await refundRepository.find({ where: { batchId } });
    const reviews = await reviewRepository.find({ where: { batchId } });

    const statusStats = refunds.reduce((acc: any, r) => {
      const key = this.translateStatus(r.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const typeStats = refunds.reduce((acc: any, r) => {
      const key = this.translateRefundType(r.refundType);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const matchedCount = refunds.filter(r => r.isMatched).length;
    const normalCount = refunds.filter(r => r.status === 'normal').length;
    const pendingCount = refunds.filter(r => r.status === 'pending_review').length;
    const unprocessableCount = refunds.filter(r => r.status === 'unprocessable').length;

    return [{
      批次号: batch?.batchNo || '',
      城市: batch?.cityName || '',
      批次状态: this.translateBatchStatus(batch?.status || ''),
      退款单总数: refunds.length,
      复核单总数: reviews.length,
      已匹配数量: matchedCount,
      未匹配数量: refunds.length - matchedCount,
      正常数量: normalCount,
      待复核数量: pendingCount,
      无法处理数量: unprocessableCount,
      退款总金额: refunds.reduce((sum, r) => sum + Number(r.refundAmount), 0),
      补偿总金额: reviews.reduce((sum, r) => sum + Number(r.compensationAmount), 0),
      差额总计: refunds.reduce((sum, r) => sum + Number(r.diffAmount), 0),
      少发数量: typeStats['少发'] || 0,
      坏品数量: typeStats['坏品'] || 0,
      其他类型数量: typeStats['其他'] || 0,
      导出时间: new Date().toISOString(),
    }];
  }

  private translateRefundType(type: string): string {
    const map: Record<string, string> = {
      less_shipped: '少发',
      defective: '坏品',
      other: '其他',
    };
    return map[type] || type;
  }

  private translateStatus(status: string): string {
    const map: Record<string, string> = {
      normal: '正常',
      pending_review: '待复核',
      unprocessable: '无法处理',
      matched: '已匹配',
      mismatched: '不匹配',
    };
    return map[status] || status;
  }

  private translateReviewResult(result: string): string {
    const map: Record<string, string> = {
      normal: '正常',
      less_shipped: '少发',
      defective: '坏品',
      unprocessable: '无法处理',
    };
    return map[result] || result;
  }

  private translateBatchStatus(status: string): string {
    const map: Record<string, string> = {
      draft: '草稿',
      submitted: '已提交',
      rejected: '已驳回',
      confirmed: '已确认',
      audited: '已审计',
    };
    return map[status] || status;
  }

  private getDisposition(status: string, isMatched: boolean): string {
    if (status === 'normal') return '正常通过';
    if (status === 'pending_review') return '待人工复核';
    if (status === 'unprocessable') return '标记无法处理，需单独跟进';
    if (status === 'matched') return '数据匹配一致';
    if (status === 'mismatched') return '数据不匹配，需核实';
    return '其他';
  }
}

export const exportService = new ExportService();
