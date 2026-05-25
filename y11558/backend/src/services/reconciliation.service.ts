import prisma from '../lib/prisma.js';
import { auditService } from './audit.service.js';
import type { ChainStatus } from '../types/index.js';
import { toJson, fromJson } from '../utils/json.js';

export interface ReconciliationDifference {
  type: 'AMOUNT' | 'QUANTITY' | 'ITEM';
  source: string;
  target: string;
  sourceValue: number | string;
  targetValue: number | string;
  description: string;
  severity: 'WARNING' | 'ERROR';
}

export interface ReconciliationResult {
  isPassed: boolean;
  orderAmount: number;
  iouAmount: number;
  statementAmount: number | null;
  finalAmount: number;
  differences: ReconciliationDifference[];
}

export class ReconciliationService {
  async startReconciliation(chainId: string, operatorId: string, operatorName: string) {
    const chain = await prisma.chain.findUnique({
      where: { id: chainId },
      include: {
        materials: {
          where: { isLatest: true },
        },
      },
    });

    if (!chain) {
      throw new Error('Chain not found');
    }

    await prisma.chain.update({
      where: { id: chainId },
      data: { status: 'RECONCILING' },
    });

    await auditService.logStatusChange(
      chainId,
      chain.status as ChainStatus,
      'RECONCILING',
      '启动自动对账',
      operatorId,
      operatorName,
    );

    const result = this.performReconciliation(chain.materials);

    const hasDifferences = result.differences.length > 0;
    const newStatus: ChainStatus = hasDifferences ? 'REVIEW_REQUIRED' : 'RECONCILED';

    const reconciliation = await prisma.reconciliationResult.create({
      data: {
        chainId,
        isPassed: !hasDifferences,
        differences: toJson(result.differences),
        orderAmount: result.orderAmount,
        iouAmount: result.iouAmount,
        statementAmount: result.statementAmount,
        finalAmount: result.finalAmount,
        status: hasDifferences ? 'PENDING' : 'CONFIRMED',
        confirmedBy: hasDifferences ? null : operatorId,
        confirmedAt: hasDifferences ? null : new Date(),
      },
    });

    await prisma.chain.update({
      where: { id: chainId },
      data: { status: newStatus },
    });

    await auditService.logStatusChange(
      chainId,
      'RECONCILING',
      newStatus,
      hasDifferences ? '对账发现差异，需人工复核' : '自动对账通过',
      operatorId,
      operatorName,
    );

    return { reconciliation, chainStatus: newStatus };
  }

  private performReconciliation(materials: any[]): ReconciliationResult {
    const orderMaterial = materials.find(m => m.type === 'ORDER');
    const iouMaterial = materials.find(m => m.type === 'IOU');
    const statementMaterial = materials.find(m => m.type === 'STATEMENT');

    const orderData = fromJson(orderMaterial?.parsedData) || {};
    const iouData = fromJson(iouMaterial?.parsedData) || {};
    const statementData = fromJson(statementMaterial?.parsedData) || {};

    const orderAmount = orderData.totalAmount || 0;
    const iouAmount = iouData.totalAmount || 0;
    const statementAmount = statementData.totalAmount || null;

    const differences: ReconciliationDifference[] = [];

    if (Math.abs(orderAmount - iouAmount) > 0.01) {
      differences.push({
        type: 'AMOUNT',
        source: 'ORDER',
        target: 'IOU',
        sourceValue: orderAmount,
        targetValue: iouAmount,
        description: '订单金额与欠条金额不一致',
        severity: 'ERROR',
      });
    }

    if (statementAmount !== null && Math.abs(orderAmount - statementAmount) > 0.01) {
      differences.push({
        type: 'AMOUNT',
        source: 'ORDER',
        target: 'STATEMENT',
        sourceValue: orderAmount,
        targetValue: statementAmount,
        description: '订单金额与对账单金额不一致',
        severity: 'ERROR',
      });
    }

    const orderItems = orderData.items || [];
    const iouItems = iouData.items || [];

    for (let i = 0; i < Math.max(orderItems.length, iouItems.length); i++) {
      const orderItem = orderItems[i];
      const iouItem = iouItems[i];

      if (!orderItem || !iouItem) {
        differences.push({
          type: 'ITEM',
          source: 'ORDER',
          target: 'IOU',
          sourceValue: orderItem?.productName || '',
          targetValue: iouItem?.productName || '',
          description: `第${i + 1}行商品不匹配`,
          severity: 'WARNING',
        });
        continue;
      }

      if (orderItem.quantity !== iouItem.quantity) {
        differences.push({
          type: 'QUANTITY',
          source: 'ORDER',
          target: 'IOU',
          sourceValue: orderItem.quantity,
          targetValue: iouItem.quantity,
          description: `商品"${orderItem.productName}"数量不一致`,
          severity: 'ERROR',
        });
      }
    }

    const finalAmount = this.calculateFinalAmount(orderAmount, iouAmount, statementAmount, differences);

    return {
      isPassed: differences.length === 0,
      orderAmount,
      iouAmount,
      statementAmount,
      finalAmount,
      differences,
    };
  }

  private calculateFinalAmount(
    orderAmount: number,
    iouAmount: number,
    statementAmount: number | null,
    differences: ReconciliationDifference[],
  ): number {
    const amountDiff = differences.find(d => d.type === 'AMOUNT');
    if (amountDiff) {
      return Math.min(orderAmount, iouAmount, statementAmount || Number.MAX_VALUE);
    }
    return iouAmount;
  }

  async confirmReconciliation(
    chainId: string,
    confirmedData: any,
    operatorId: string,
    operatorName: string,
  ) {
    const chain = await prisma.chain.findUnique({
      where: { id: chainId },
      include: { reconciliation: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!chain || chain.reconciliation.length === 0) {
      throw new Error('Reconciliation not found');
    }

    const latestReconciliation = chain.reconciliation[0];

    const updatedReconciliation = await prisma.reconciliationResult.update({
      where: { id: latestReconciliation.id },
      data: {
        confirmedData,
        status: 'CONFIRMED',
        isPassed: true,
        finalAmount: confirmedData.finalAmount,
        confirmedBy: operatorId,
        confirmedAt: new Date(),
      },
    });

    await prisma.chain.update({
      where: { id: chainId },
      data: {
        status: 'RECONCILED',
        totalAmount: confirmedData.finalAmount,
      },
    });

    await auditService.logStatusChange(
      chainId,
      chain.status as ChainStatus,
      'RECONCILED',
      '人工确认对账完成',
      operatorId,
      operatorName,
    );

    return updatedReconciliation;
  }

  async getReconciliation(chainId: string) {
    return prisma.reconciliationResult.findMany({
      where: { chainId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
  }
}

export const reconciliationService = new ReconciliationService();
