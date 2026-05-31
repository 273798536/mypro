import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  type?: 'donation' | 'budget' | 'receipt' | 'severity';
}

const donationStatusMap: Record<string, { label: string; className: string }> = {
  pending: { label: '待处理', className: 'bg-slate-100 text-slate-700' },
  locked: { label: '已锁定', className: 'bg-emerald-100 text-emerald-700' },
  conflicted: { label: '有冲突', className: 'bg-red-100 text-red-700' },
};

const budgetStatusMap: Record<string, { label: string; className: string }> = {
  matched: { label: '已匹配', className: 'bg-emerald-100 text-emerald-700' },
  partial: { label: '部分匹配', className: 'bg-amber-100 text-amber-700' },
  conflicted: { label: '有冲突', className: 'bg-red-100 text-red-700' },
};

const receiptStatusMap: Record<string, { label: string; className: string }> = {
  linked: { label: '已关联', className: 'bg-emerald-100 text-emerald-700' },
  unlinked: { label: '未关联', className: 'bg-slate-100 text-slate-700' },
  duplicate: { label: '重复', className: 'bg-red-100 text-red-700' },
};

const severityMap: Record<string, { label: string; className: string }> = {
  high: { label: '高', className: 'bg-red-100 text-red-700' },
  medium: { label: '中', className: 'bg-amber-100 text-amber-700' },
  low: { label: '低', className: 'bg-slate-100 text-slate-700' },
};

const statusMaps: Record<string, Record<string, { label: string; className: string }>> = {
  donation: donationStatusMap,
  budget: budgetStatusMap,
  receipt: receiptStatusMap,
  severity: severityMap,
};

export default function StatusBadge({ status, type = 'donation' }: StatusBadgeProps) {
  const map = statusMaps[type];
  const config = map[status] || { label: status, className: 'bg-slate-100 text-slate-700' };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
