import type {
  PaymentStatus,
  PaymentRecord,
  PaymentTransition,
  InvoiceAnalysis,
} from '../types';

const TRANSITION_GRAPH: Record<PaymentStatus, PaymentStatus[]> = {
  not_due: ['due_soon', 'disputed'],
  due_soon: ['not_due', 'overdue', 'paid', 'partially_paid', 'disputed'],
  overdue: ['partially_paid', 'paid', 'disputed', 'void'],
  partially_paid: ['overdue', 'paid', 'disputed'],
  paid: ['void'],
  disputed: ['not_due', 'overdue', 'paid', 'void'],
  void: [],
};

export function getNextPossibleStates(
  currentStatus: PaymentStatus,
): PaymentStatus[] {
  return TRANSITION_GRAPH[currentStatus] ?? [];
}

export function isValidTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return TRANSITION_GRAPH[from]?.includes(to) ?? false;
}

export function computePaymentStatus(
  invoiceAnalysis: InvoiceAnalysis,
  payments: PaymentRecord[],
): PaymentStatus {
  const invoicePayments = payments.filter(
    (p) => p.invoiceId === invoiceAnalysis.invoiceId,
  );

  if (invoicePayments.length === 0) {
    const today = new Date();
    const due = new Date(invoiceAnalysis.dueDate);
    const diffDays = Math.floor(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > 7) return 'not_due';
    if (diffDays > 0) return 'due_soon';
    return 'overdue';
  }

  const totalPaid = invoicePayments
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + p.amount, 0);

  if (totalPaid >= invoiceAnalysis.amount) return 'paid';
  if (totalPaid > 0) return 'partially_paid';

  const hasDisputed = invoicePayments.some((p) => p.status === 'disputed');
  if (hasDisputed) return 'disputed';

  return 'overdue';
}

export function createTransition(
  from: PaymentStatus,
  to: PaymentStatus,
  reason: string,
  operator: string,
): PaymentTransition {
  return {
    from,
    to,
    triggeredAt: new Date().toISOString(),
    triggeredBy: operator,
    reason,
  };
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  not_due: '未到期',
  due_soon: '即将到期',
  overdue: '已逾期',
  partially_paid: '部分付款',
  paid: '已结清',
  disputed: '争议中',
  void: '已作废',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  not_due: '#6b7280',
  due_soon: '#f59e0b',
  overdue: '#ef4444',
  partially_paid: '#3b82f6',
  paid: '#10b981',
  disputed: '#a855f7',
  void: '#9ca3af',
};
