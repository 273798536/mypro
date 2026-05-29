import type {
  PaymentStatus,
  PaymentRecord,
  PaymentTransition,
  InvoiceAnalysis,
} from '../types';

const TRANSITION_GRAPH: Record<PaymentStatus, PaymentStatus[]> = {
  not_due: ['due_soon', 'disputed', 'overdue'],
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
    if (invoiceAnalysis.dueDate === 'N/A' || invoiceAnalysis.dueDate === 'ERROR') {
      return 'disputed';
    }
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

export function buildPaymentTransitions(
  invoiceAnalysis: InvoiceAnalysis,
  payments: PaymentRecord[],
): PaymentTransition[] {
  const transitions: PaymentTransition[] = [];
  const invoicePayments = payments.filter(
    (p) => p.invoiceId === invoiceAnalysis.invoiceId,
  );

  if (invoicePayments.length === 0) {
    if (invoiceAnalysis.dueDate !== 'N/A' && invoiceAnalysis.dueDate !== 'ERROR') {
      transitions.push({
        from: 'not_due',
        to: computePaymentStatus(invoiceAnalysis, payments),
        triggeredAt: new Date().toISOString(),
        triggeredBy: 'system',
        reason: `自动推算: 基于应付款日 ${invoiceAnalysis.dueDate}`,
      });
    }
    return transitions;
  }

  const sortedPayments = invoicePayments.sort(
    (a, b) => {
      const aDate = a.actualDate ?? a.plannedDate;
      const bDate = b.actualDate ?? b.plannedDate;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    },
  );

  let currentStatus: PaymentStatus = 'not_due';

  for (const payment of sortedPayments) {
    const nextStatus = payment.status;
    if (currentStatus !== nextStatus) {
      transitions.push({
        from: currentStatus,
        to: nextStatus,
        triggeredAt: payment.actualDate ?? payment.plannedDate,
        triggeredBy: 'payment_system',
        reason: `付款记录 ${payment.id} 状态变更，金额: ¥${payment.amount}`,
      });
      currentStatus = nextStatus;
    }
  }

  const finalStatus = computePaymentStatus(invoiceAnalysis, payments);
  if (currentStatus !== finalStatus) {
    transitions.push({
      from: currentStatus,
      to: finalStatus,
      triggeredAt: new Date().toISOString(),
      triggeredBy: 'system',
      reason: `最终状态确认: 基于付款记录和应付款日`,
    });
  }

  return transitions;
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
