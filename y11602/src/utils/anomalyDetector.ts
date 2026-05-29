import type { Customer, Guarantee, Repayment, Approval, Anomaly } from '../types';
import { calculateDaysToExpiry, calculateGuaranteeStatus } from './dateUtils';

export function detectAnomalies(
  customer: Customer,
  guarantees: Guarantee[],
  repayments: Repayment[],
  approvals: Approval[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = new Date().toISOString();

  guarantees.forEach(g => {
    if (!g.expiryDate) return;
    const realStatus = calculateGuaranteeStatus(g.expiryDate);
    const daysToExpiry = calculateDaysToExpiry(g.expiryDate);
    
    if (realStatus === 'expired') {
      anomalies.push({
        type: 'guarantee_expired',
        severity: 'high',
        message: `担保已过期（${getGuaranteeTypeLabel(g.type)}），过期日期：${g.expiryDate}`,
        detectedAt: now
      });
    } else if (realStatus === 'expiring_soon') {
      anomalies.push({
        type: 'guarantee_expired',
        severity: 'medium',
        message: `担保即将到期（${getGuaranteeTypeLabel(g.type)}），剩余 ${daysToExpiry} 天，到期日期：${g.expiryDate}`,
        detectedAt: now
      });
    }
  });

  const missing = repayments.filter(r => r.status === 'missing');
  if (missing.length > 0) {
    anomalies.push({
      type: 'missing_repayment',
      severity: missing.length >= 3 ? 'high' : 'medium',
      message: `还款流水缺失 ${missing.length} 个月：${missing.map(m => m.month).join('、')}`,
      detectedAt: now
    });
  }

  approvals.forEach(a => {
    if (a.isWithdrawn || a.result === 'withdrawn') {
      anomalies.push({
        type: 'approval_withdrawn',
        severity: 'high',
        message: `审批记录已撤回：${a.stage} - ${getApprovalResultLabel(a.result)}（${a.operator}，${a.timestamp}）`,
        detectedAt: now
      });
    }
  });

  const daysToExpiry = calculateDaysToExpiry(customer.expiryDate);
  if (daysToExpiry > 0 && daysToExpiry <= 30) {
    anomalies.push({
      type: 'expiring_soon',
      severity: daysToExpiry <= 7 ? 'high' : 'medium',
      message: `授信即将到期，剩余 ${daysToExpiry} 天，到期日期：${customer.expiryDate}`,
      detectedAt: now
    });
  }

  return anomalies;
}

function getGuaranteeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    mortgage: '抵押',
    pledge: '质押',
    guarantor: '保证'
  };
  return labels[type] || type;
}

function getApprovalResultLabel(result: string): string {
  const labels: Record<string, string> = {
    approved: '通过',
    rejected: '拒绝',
    pending: '待审批',
    withdrawn: '已撤回'
  };
  return labels[result] || result;
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-amber-600 bg-amber-50',
    low: 'text-green-600 bg-green-50'
  };
  return colors[severity] || 'text-gray-600 bg-gray-50';
}

export function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    high: '高风险',
    medium: '中风险',
    low: '低风险'
  };
  return labels[severity] || severity;
}
