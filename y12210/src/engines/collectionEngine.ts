import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import type { ChannelBill, GameOrder, RefundRecord, OrderCollection, MatchRule, MatchResult } from '../types';
import { generateCollectionNo } from '../utils/format';

export class OrderCollectionEngine {
  private defaultRule: MatchRule = {
    fields: ['orderNo', 'channelOrderNo', 'amount', 'transactionTime'],
    tolerance: 0.01,
    timeWindow: 24,
  };

  match(
    channelBills: ChannelBill[],
    gameOrders: GameOrder[],
    refunds: RefundRecord[],
    rule: MatchRule = this.defaultRule
  ): MatchResult {
    const matchedPairs: MatchResult['matchedPairs'] = [];
    const usedBillIds = new Set<string>();
    const usedOrderIds = new Set<string>();

    for (const bill of channelBills) {
      if (usedBillIds.has(bill.id)) continue;

      let bestMatch: { order: GameOrder; score: number; fields: string[] } | null = null;

      for (const order of gameOrders) {
        if (usedOrderIds.has(order.id)) continue;

        const { score, matchedFields } = this.calculateMatchScore(bill, order, rule);
        
        if (score >= 0.8 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { order, score, fields: matchedFields };
        }
      }

      if (bestMatch) {
        matchedPairs.push({
          channelBill: bill,
          gameOrder: bestMatch.order,
          matchScore: bestMatch.score,
          matchFields: bestMatch.fields,
        });
        usedBillIds.add(bill.id);
        usedOrderIds.add(bestMatch.order.id);
      }
    }

    const unmatchedBills = channelBills.filter(b => !usedBillIds.has(b.id));
    const unmatchedOrders = gameOrders.filter(o => !usedOrderIds.has(o.id));

    const totalPairs = matchedPairs.length + unmatchedBills.length + unmatchedOrders.length;
    const confidence = totalPairs > 0 ? matchedPairs.length / totalPairs : 0;

    return {
      confidence,
      matchedPairs,
      unmatched: {
        channelBills: unmatchedBills,
        gameOrders: unmatchedOrders,
      },
    };
  }

  private calculateMatchScore(
    bill: ChannelBill,
    order: GameOrder,
    rule: MatchRule
  ): { score: number; matchedFields: string[] } {
    let score = 0;
    const matchedFields: string[] = [];
    let fieldCount = 0;

    if (rule.fields.includes('orderNo')) {
      fieldCount++;
      if (bill.orderNo === order.orderNo) {
        score += 40;
        matchedFields.push('orderNo');
      }
    }

    if (rule.fields.includes('channelOrderNo')) {
      fieldCount++;
      if (bill.channelOrderNo && order.channelOrderNo && bill.channelOrderNo === order.channelOrderNo) {
        score += 30;
        matchedFields.push('channelOrderNo');
      }
    }

    if (rule.fields.includes('amount')) {
      fieldCount++;
      const diff = Math.abs(bill.amount - order.amount);
      if (diff <= rule.tolerance) {
        score += 20;
        matchedFields.push('amount');
      }
    }

    if (rule.fields.includes('transactionTime')) {
      fieldCount++;
      const billTime = dayjs(bill.transactionTime);
      const orderTime = dayjs(order.payTime);
      const diffHours = Math.abs(billTime.diff(orderTime, 'hour'));
      if (diffHours <= rule.timeWindow) {
        score += 10;
        matchedFields.push('transactionTime');
      }
    }

    return { score: score / (fieldCount > 0 ? fieldCount * 25 : 1), matchedFields };
  }

  collect(
    matchResult: MatchResult,
    refunds: RefundRecord[],
    period: string
  ): OrderCollection[] {
    const collections: OrderCollection[] = [];
    
    const matchedGroups = new Map<string, typeof matchResult.matchedPairs>();
    for (const pair of matchResult.matchedPairs) {
      const key = `${pair.channelBill.gameId}-${pair.channelBill.channel}`;
      if (!matchedGroups.has(key)) {
        matchedGroups.set(key, []);
      }
      matchedGroups.get(key)!.push(pair);
    }

    let index = 1;
    for (const [key, pairs] of matchedGroups) {
      const [gameId, channel] = key.split('-');
      const firstPair = pairs[0];
      
      const orderIds = pairs.map(p => p.gameOrder.id);
      const billIds = pairs.map(p => p.channelBill.orderNo);
      
      const grossAmount = pairs.reduce((sum, p) => sum + p.channelBill.amount, 0);
      
      const relatedRefunds = refunds.filter(r => 
        r.gameId === gameId && r.channel === channel as any
      );
      const refundAmount = relatedRefunds.reduce((sum, r) => sum + r.amount, 0);
      
      const avgConfidence = pairs.reduce((sum, p) => sum + p.matchScore, 0) / pairs.length;
      
      collections.push({
        id: uuidv4(),
        collectionNo: generateCollectionNo(period, index++),
        period,
        gameId,
        gameName: firstPair.channelBill.gameName,
        channel: channel as any,
        originalOrderIds: orderIds,
        refundIds: relatedRefunds.map(r => r.id),
        grossAmount,
        refundAmount,
        netAmount: grossAmount - refundAmount,
        matchRule: `按${['订单号', '渠道订单号', '金额', '交易时间'].join('+')}匹配`,
        matchConfidence: avgConfidence,
        createTime: new Date().toISOString(),
        status: avgConfidence >= 0.9 ? 'matched' : avgConfidence >= 0.7 ? 'pending' : 'mismatch',
      });
    }

    return collections;
  }

  getMatchRule(): MatchRule {
    return { ...this.defaultRule };
  }

  setMatchRule(rule: Partial<MatchRule>): void {
    this.defaultRule = { ...this.defaultRule, ...rule };
  }
}

export const collectionEngine = new OrderCollectionEngine();
