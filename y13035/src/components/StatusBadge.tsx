import type { BatchStatus, PaymentStatus } from '@shared/types';
import { STATUS_LABEL, PAYMENT_LABEL } from '@shared/types';

const batchStyles: Record<BatchStatus, string> = {
  pending: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  running: 'bg-primary-50 text-primary-700 border-primary-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  revised: 'bg-amber-50 text-amber-700 border-amber-200',
};

const paymentStyles: Record<PaymentStatus, string> = {
  matched: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unmatched: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  revised: 'bg-amber-50 text-amber-700 border-amber-200',
};

interface Props {
  status: BatchStatus | PaymentStatus;
  variant?: 'batch' | 'payment';
}

export default function StatusBadge({ status, variant = 'batch' }: Props) {
  const styles = variant === 'batch' ? batchStyles : paymentStyles;
  const label = variant === 'batch' ? STATUS_LABEL[status as BatchStatus] : PAYMENT_LABEL[status as PaymentStatus];
  const styleClass = variant === 'batch' ? batchStyles[status as BatchStatus] : paymentStyles[status as PaymentStatus];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${styleClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'completed' || status === 'matched' ? 'bg-emerald-500' :
        status === 'revised' ? 'bg-amber-500' :
        status === 'running' ? 'bg-primary-500' : 'bg-zinc-400'
      }`} />
      {label}
    </span>
  );
}
