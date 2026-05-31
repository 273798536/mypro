import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';

const conflictTypeLabels: Record<string, string> = {
  purpose_mismatch: '用途错配',
  receipt_duplicate: '票据重复',
  refund_delayed: '退款晚到',
};

export default function ConflictAlertBar() {
  const navigate = useNavigate();
  const { conflicts, donations } = useStore();

  const unresolvedConflicts = conflicts.filter(c => !c.resolvedAt);

  const getDonorName = (donationId: string): string => {
    const donation = donations.find(d => d.id === donationId);
    return donation?.donorName || '未知';
  };

  if (unresolvedConflicts.length === 0) {
    return (
      <div className="w-full bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg py-3 px-4 mb-4">
        <p className="text-gray-500 text-sm text-center">当前无待处理冲突</p>
      </div>
    );
  }

  return (
    <div
      className="w-full bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] rounded-lg py-3 px-4 mb-4 overflow-x-auto whitespace-nowrap"
    >
      <div className="flex gap-2">
        {unresolvedConflicts.map((conflict) => (
          <button
            key={conflict.id}
            onClick={() => navigate('/lock')}
            className={cn(
              'bg-white rounded-full px-4 py-2 mx-2',
              'flex items-center gap-2 shadow-sm',
              'hover:shadow-md transition-shadow cursor-pointer',
              'animate-fade-in'
            )}
          >
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-700">
              {conflictTypeLabels[conflict.conflictType] || conflict.conflictType}
            </span>
            <span className="text-sm text-slate-500">
              {getDonorName(conflict.donationId)}
            </span>
            <StatusBadge status={conflict.severity} type="severity" />
          </button>
        ))}
      </div>
    </div>
  );
}
