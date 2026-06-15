import { SplitStatus, STATUS_LABEL } from '@/types';
import { AlertTriangle, Clock, CheckCircle2, Ban, FileWarning } from 'lucide-react';

const config: Record<
  SplitStatus,
  { icon: typeof Clock; cls: string; bg: string }
> = {
  pending: {
    icon: Clock, cls: 'bg-ink-500', bg: 'bg-ink-100' },
  aligned: {
    icon: CheckCircle2, cls: 'text-pine-500', bg: 'bg-pine-100' },
  suspended: {
    icon: Ban, cls: 'text-rouge-500', bg: 'bg-rouge-100' },
  conflicted: {
    icon: AlertTriangle, cls: 'text-rattan-500', bg: 'bg-rattan-100' },
  missing_note: {
    icon: FileWarning, cls: 'text-amber-500', bg: 'bg-amber-100' },
};

export default function StatusBadge({ status }: { status: SplitStatus }) {
  const { icon: Icon, cls, bg } = config[status];
  return (
    <span className={`theater-chip gap-1.5 ${bg} ${cls} animate-popin`}>
      <Icon size={12} />
      {STATUS_LABEL[status]}
    </span>
  );
}
