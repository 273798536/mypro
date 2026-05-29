import type { Customer, Guarantee, Repayment, Approval, LoanStatus } from '../types';
import { calculateDaysToExpiry, calculateGuaranteeStatus } from './dateUtils';

const statusTransitions: Record<LoanStatus, LoanStatus[]> = {
  normal: ['warning', 'expiring_soon', 'expired', 'abnormal'],
  warning: ['normal', 'expiring_soon', 'expired', 'abnormal'],
  expiring_soon: ['normal', 'expired', 'abnormal'],
  expired: ['normal', 'abnormal'],
  abnormal: ['normal', 'warning']
};

export function canTransition(from: LoanStatus, to: LoanStatus): boolean {
  return statusTransitions[from].includes(to);
}

export function calculateLoanStatus(
  customer: Customer,
  guarantees: Guarantee[],
  repayments: Repayment[],
  approvals: Approval[]
): LoanStatus {
  const hasWithdrawnApproval = approvals.some(a => a.isWithdrawn || a.result === 'withdrawn');
  if (hasWithdrawnApproval) return 'abnormal';
  
  const hasExpiredGuarantee = guarantees.some(g => {
    if (!g.expiryDate) return false;
    return calculateGuaranteeStatus(g.expiryDate) === 'expired';
  });
  if (hasExpiredGuarantee) return 'abnormal';
  
  const missingMonths = repayments.filter(r => r.status === 'missing').length;
  if (missingMonths >= 3) return 'abnormal';
  if (missingMonths >= 1) return 'warning';
  
  const daysToExpiry = calculateDaysToExpiry(customer.expiryDate);
  if (daysToExpiry <= 0) return 'expired';
  if (daysToExpiry <= 7) return 'expiring_soon';
  if (daysToExpiry <= 30) return 'warning';
  
  return 'normal';
}

export function getStatusLabel(status: LoanStatus): string {
  const labels: Record<LoanStatus, string> = {
    normal: '正常',
    warning: '预警',
    expiring_soon: '即将到期',
    expired: '已过期',
    abnormal: '异常'
  };
  return labels[status];
}

export function getStatusClass(status: LoanStatus): string {
  const classes: Record<LoanStatus, string> = {
    normal: 'status-normal',
    warning: 'status-warning',
    expiring_soon: 'status-expiring-soon',
    expired: 'status-expired',
    abnormal: 'status-abnormal'
  };
  return classes[status];
}
