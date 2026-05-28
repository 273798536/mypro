import { CouponPlan, CustodyReceipt, VerificationResult, VerificationStatus, STATUS_LABELS } from '../types';
import { calculateDiffRate, isAmountMatch, isPartialAmount } from '../utils/amountUtils';
import { isHolidayAdjusted, getCurrentDate, getDaysDiff } from '../utils/dateUtils';

export class VerificationEngine {
  verifyAmount(expected: number, actual: number): {
    status: 'full' | 'partial' | 'none';
    diffAmount: number;
    diffRate: number;
  } {
    const diffAmount = actual - expected;
    const diffRate = calculateDiffRate(expected, actual);

    if (isAmountMatch(expected, actual)) {
      return { status: 'full', diffAmount, diffRate };
    } else if (isPartialAmount(expected, actual)) {
      return { status: 'partial', diffAmount, diffRate };
    } else {
      return { status: 'none', diffAmount, diffRate };
    }
  }

  verifyDate(expectedDate: string, actualDate: string): {
    isAdjusted: boolean;
    daysDiff: number;
    reason: string;
  } {
    const daysDiff = getDaysDiff(actualDate, expectedDate);
    const adjusted = isHolidayAdjusted(expectedDate, actualDate);

    let reason = '日期一致';
    if (adjusted) {
      reason = '付息日遇节假日顺延';
    } else if (daysDiff > 0) {
      reason = `实际到账晚${daysDiff}天`;
    } else if (daysDiff < 0) {
      reason = `实际到账早${Math.abs(daysDiff)}天`;
    }

    return {
      isAdjusted: adjusted,
      daysDiff,
      reason,
    };
  }

  checkOverdue(paymentDate: string, overdueDays: number = 3): boolean {
    const today = getCurrentDate();
    return getDaysDiff(today, paymentDate) > overdueDays;
  }

  runVerification(
    plan: CouponPlan,
    receipt?: CustodyReceipt
  ): VerificationResult {
    let status: VerificationStatus = 'pending';
    let reason = '等待托管回单';
    let reasonDetail = '尚未导入托管行回单，请在回单到账后导入进行核验';
    let actualAmount = 0;
    let diffAmount = 0;
    let diffRate = 0;

    if (receipt) {
      actualAmount = receipt.actualAmount;
      const amountCheck = this.verifyAmount(plan.expectedAmount, actualAmount);
      const dateCheck = this.verifyDate(plan.paymentDate, receipt.actualDate);

      diffAmount = amountCheck.diffAmount;
      diffRate = amountCheck.diffRate;

      if (dateCheck.isAdjusted && amountCheck.status === 'full') {
        status = 'adjusted';
        reason = '付息日顺延';
        reasonDetail = `原付息日${plan.originalPaymentDate || plan.paymentDate}遇节假日，顺延至${receipt.actualDate}到账，金额一致`;
      } else if (amountCheck.status === 'full') {
        status = 'full';
        reason = '全额正常到账';
        reasonDetail = `计划金额与实际到账金额一致，${dateCheck.reason}`;
      } else if (amountCheck.status === 'partial') {
        status = 'partial';
        reason = '部分到账';
        reasonDetail = `实际到账金额少于计划金额，差异${diffAmount.toFixed(2)}元（${(diffRate * 100).toFixed(2)}%），${dateCheck.reason}`;
      } else {
        status = 'none';
        reason = '金额不匹配';
        reasonDetail = `实际到账金额与计划差异较大，请人工核对`;
      }
    } else {
      const isOverdue = this.checkOverdue(plan.paymentDate);
      if (isOverdue) {
        status = 'none';
        reason = '疑似漏付';
        reasonDetail = `已超过付息日3天仍未到账，请联系托管行确认`;
      }
    }

    return {
      resultId: `VR${plan.planId}`,
      planId: plan.planId,
      status,
      statusLabel: STATUS_LABELS[status],
      expectedAmount: plan.expectedAmount,
      actualAmount,
      diffAmount,
      diffRate,
      reason,
      reasonDetail,
      isReviewed: false,
    };
  }

  runBatchVerification(
    plans: CouponPlan[],
    receipts: CustodyReceipt[]
  ): VerificationResult[] {
    const receiptMap = new Map(receipts.map(r => [r.planId, r]));

    return plans.map(plan => {
      const receipt = receiptMap.get(plan.planId);
      return this.runVerification(plan, receipt);
    });
  }
}

export const verificationEngine = new VerificationEngine();
