import { PROCESS_STATUS_LABEL } from '@/types';
import type { ProcessStatus } from '@/types';

interface Props {
  status: ProcessStatus;
}

export default function StatusTag({ status }: Props) {
  const styles: Record<ProcessStatus, string> = {
    need_material: 'bg-warning-500/20 text-warning-400 border border-warning-500/40',
    need_calibration: 'bg-primary-500/20 text-primary-300 border border-primary-500/40',
    resolved: 'bg-success-500/20 text-success-400 border border-success-500/40',
  };

  return (
    <span className={`tag ${styles[status]}`}>
      {PROCESS_STATUS_LABEL[status]}
    </span>
  );
}
