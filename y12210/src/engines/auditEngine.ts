import { v4 as uuidv4 } from 'uuid';
import type {
  AuditLog, OperationType, TraceChain, TraceNode, RevenueResult,
  OrderCollection, ChannelBill, GameOrder, RefundRecord, RateVersion
} from '../types';
import { db } from '../utils/db';

export class AuditTrailEngine {
  async log(
    operationType: OperationType,
    resourceType: string,
    resourceId: string,
    operator: string,
    module: string,
    beforeChange?: any,
    afterChange?: any,
    changeReason?: string
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: uuidv4(),
      operationType,
      operator,
      operateTime: new Date().toISOString(),
      module,
      resourceId,
      resourceType,
      beforeChange: beforeChange ? JSON.parse(JSON.stringify(beforeChange)) : undefined,
      afterChange: afterChange ? JSON.parse(JSON.stringify(afterChange)) : undefined,
      changeReason,
      ip: this.getClientIP(),
    };

    await db.auditLogs.add(log);
    return log;
  }

  async trace(
    resultId: string,
    results: RevenueResult[],
    collections: OrderCollection[],
    bills: ChannelBill[],
    orders: GameOrder[],
    refunds: RefundRecord[],
    rates: RateVersion[]
  ): Promise<TraceChain> {
    const result = results.find(r => r.id === resultId);
    if (!result) {
      throw new Error('Result not found');
    }

    const nodes: TraceNode[] = [];
    const edges: TraceChain['edges'] = [];

    nodes.push({
      id: `result-${result.id}`,
      type: 'revenue',
      title: `分成计算结果`,
      data: result,
      timestamp: result.createTime,
      description: `净额 ${result.grossAmount - result.refundAmount}，平台分成 ${result.platformShare}，研发分成 ${result.developerShare}`,
    });

    const collection = collections.find(c => c.id === result.collectionId);
    if (collection) {
      nodes.push({
        id: `collection-${collection.id}`,
        type: 'collection',
        title: `订单归集`,
        data: collection,
        timestamp: collection.createTime,
        description: `归集单号 ${collection.collectionNo}，包含 ${collection.originalOrderIds.length} 条订单，${collection.refundIds.length} 条退款`,
      });
      edges.push({
        from: `collection-${collection.id}`,
        to: `result-${result.id}`,
        label: '生成分成结果',
      });

      for (const orderId of collection.originalOrderIds) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const nodeId = `order-${order.id}`;
          if (!nodes.find(n => n.id === nodeId)) {
            nodes.push({
              id: nodeId,
              type: 'datasource',
              title: `游戏订单`,
              data: order,
              timestamp: order.payTime,
              description: `订单号 ${order.orderNo}，金额 ${order.amount}，${order.serverName}`,
            });
          }
          edges.push({
            from: nodeId,
            to: `collection-${collection.id}`,
            label: '参与归集',
          });
        }
      }

      for (const refundId of collection.refundIds) {
        const refund = refunds.find(r => r.id === refundId);
        if (refund) {
          const nodeId = `refund-${refund.id}`;
          if (!nodes.find(n => n.id === nodeId)) {
            nodes.push({
              id: nodeId,
              type: 'datasource',
              title: `退款记录`,
              data: refund,
              timestamp: refund.refundTime,
              description: `退款单号 ${refund.refundNo}，金额 ${refund.amount}，原因 ${refund.refundReason}`,
            });
          }
          edges.push({
            from: nodeId,
            to: `collection-${collection.id}`,
            label: '关联退款',
          });
        }
      }

      const relatedBills = bills.filter(b => 
        b.gameId === collection.gameId && b.channel === collection.channel
      );
      for (const bill of relatedBills) {
        const nodeId = `bill-${bill.id}`;
        if (!nodes.find(n => n.id === nodeId)) {
          nodes.push({
            id: nodeId,
            type: 'datasource',
            title: `渠道账单`,
            data: bill,
            timestamp: bill.transactionTime,
            description: `账单号 ${bill.orderNo}，金额 ${bill.amount}，渠道费 ${bill.channelFee}`,
          });
        }
        edges.push({
          from: nodeId,
          to: `collection-${collection.id}`,
          label: '对账匹配',
        });
      }
    }

    const rate = rates.find(r => r.id === result.rateVersionId);
    if (rate) {
      nodes.push({
        id: `rate-${rate.id}`,
        type: 'datasource',
        title: `费率版本`,
        data: rate,
        timestamp: rate.createTime,
        operator: rate.createBy,
        description: `版本 ${rate.version}，渠道费率 ${(rate.channelRate * 100).toFixed(1)}%，平台费率 ${(rate.platformRate * 100).toFixed(1)}%，研发费率 ${(rate.developerRate * 100).toFixed(1)}%`,
      });
      edges.push({
        from: `rate-${rate.id}`,
        to: `result-${result.id}`,
        label: '使用费率计算',
      });
    }

    if (result.adjustments) {
      for (const adj of result.adjustments) {
        const nodeId = `adj-${adj.id}`;
        nodes.push({
          id: nodeId,
          type: 'adjustment',
          title: `金额调整`,
          data: adj,
          timestamp: adj.time,
          operator: adj.operator,
          description: `调整金额 ${adj.amount}，原因：${adj.reason}`,
        });
        edges.push({
          from: nodeId,
          to: `result-${result.id}`,
          label: '调整结果',
        });
      }
    }

    if (result.deductions) {
      for (const ded of result.deductions) {
        const nodeId = `ded-${ded.id}`;
        nodes.push({
          id: nodeId,
          type: 'deduction',
          title: ded.rollback ? `抵扣回滚` : `抵扣`,
          data: ded,
          timestamp: ded.time,
          operator: ded.operator,
          description: `抵扣金额 ${ded.amount}，原因：${ded.reason}${ded.rollback ? '（已回滚）' : ''}`,
        });
        edges.push({
          from: nodeId,
          to: `result-${result.id}`,
          label: ded.rollback ? '回滚抵扣' : '抵扣金额',
        });
      }
    }

    nodes.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      resultId,
      nodes,
      edges,
    };
  }

  async getHistory(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    return db.auditLogs
      .where('resourceType')
      .equals(resourceType)
      .and(log => log.resourceId === resourceId)
      .reverse()
      .sortBy('operateTime');
  }

  async getAllLogs(limit: number = 100, offset: number = 0): Promise<{ logs: AuditLog[]; total: number }> {
    const total = await db.auditLogs.count();
    const logs = await db.auditLogs
      .reverse()
      .sortBy('operateTime')
      .then(arr => arr.slice(offset, offset + limit));
    
    return { logs, total };
  }

  async compareVersions(
    resourceType: string,
    resourceId: string,
    version1Time: string,
    version2Time: string
  ): Promise<{ before: any; after: any; diffs: string[] } | null> {
    const logs = await this.getHistory(resourceType, resourceId);
    
    const log1 = logs.find(l => l.operateTime <= version1Time && l.afterChange);
    const log2 = logs.find(l => l.operateTime <= version2Time && l.afterChange);

    if (!log1 || !log2) return null;

    const before = log1.afterChange;
    const after = log2.afterChange;
    const diffs: string[] = [];

    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    for (const key of allKeys) {
      if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
        diffs.push(key);
      }
    }

    return { before, after, diffs };
  }

  private getClientIP(): string | undefined {
    return undefined;
  }
}

export const auditEngine = new AuditTrailEngine();
