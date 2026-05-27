import { Transaction } from 'sequelize';
import { Card, SubsidyRule } from '../models';

export interface BalanceSplitResult {
  originalBalance: number;
  selfRechargeRefund: number;
  subsidyRefund: number;
  nonRefundableAmount: number;
  actualRefundAmount: number;
  warnings: string[];
}

class BalanceSplitService {
  static async splitBalance(studentId: string, cardNo: string, transaction?: Transaction): Promise<BalanceSplitResult> {
    const warnings: string[] = [];
    
    const card = await Card.findOne({ where: { studentId, cardNo }, transaction });
    if (!card) {
      throw new Error(`未找到卡号 ${cardNo} 的卡片信息`);
    }

    const selfRecharge = Number(card.selfRecharge) || 0;
    const subsidyAmount = Number(card.subsidyAmount) || 0;
    const totalBalance = Number(card.balance) || 0;

    const nonRefundableRules = await SubsidyRule.findAll({
      where: { isRefundable: false },
      transaction
    });
    
    let nonRefundableSubsidy = 0;
    if (nonRefundableRules.length > 0) {
      nonRefundableSubsidy = subsidyAmount;
      warnings.push('补贴金额不可退款');
    }

    const selfRechargeRefund = Math.min(selfRecharge, totalBalance);
    const subsidyRefund = nonRefundableRules.length > 0 ? 0 : Math.max(0, totalBalance - selfRecharge);
    const nonRefundableAmount = Math.max(0, totalBalance - selfRechargeRefund - subsidyRefund);

    const actualRefundAmount = selfRechargeRefund + subsidyRefund;

    if (card.status === 'lost') {
      warnings.push('卡片已挂失');
    }

    if (card.status === 'cancelled') {
      warnings.push('卡片已注销');
    }

    return {
      originalBalance: totalBalance,
      selfRechargeRefund,
      subsidyRefund,
      nonRefundableAmount,
      actualRefundAmount,
      warnings
    };
  }
}

export default BalanceSplitService;
