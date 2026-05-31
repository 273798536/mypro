import { History } from 'lucide-react';
import type { ProgressChangeRecord } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ChangeHistoryTimelineProps {
  changes: ProgressChangeRecord[];
}

export default function ChangeHistoryTimeline({ changes }: ChangeHistoryTimelineProps) {
  if (changes.length === 0) {
    return (
      <div className="rounded-lg shadow-sm bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <History size={18} className="text-[#d4943a]" />
          <h3 className="text-base font-semibold text-[#1a2332]">课程进度变更历史</h3>
        </div>
        <p className="text-sm text-gray-400 text-center py-6">暂无人工修改记录</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow-sm bg-white p-5">
      <div className="flex items-center gap-2 mb-5">
        <History size={18} className="text-[#d4943a]" />
        <h3 className="text-base font-semibold text-[#1a2332]">课程进度变更历史</h3>
      </div>
      <div className="relative">
        {changes.map((change, index) => {
          const diff = change.discountRollbackAfter - change.discountRollbackBefore;
          return (
            <div key={change.id} className="relative pl-7 pb-6 last:pb-0">
              <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-[#d4943a] border-2 border-white ring-2 ring-[#d4943a]/30" />
              {index < changes.length - 1 && (
                <div className="absolute left-[5px] top-4 bottom-0 w-0.5 bg-gray-200" />
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400">{change.changeDate}</span>
                  <span className="text-[#1a2332]">
                    {change.previousConsumedHours}课时 → {change.newConsumedHours}课时
                  </span>
                </div>
                <p className="text-sm text-gray-500">原因：{change.changeReason}</p>
                <div className="bg-gray-50 rounded-md p-3 space-y-2">
                  <p className="text-xs font-medium text-[#1a2332]">优惠回滚影响</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-gray-400">修改前</span>
                      <p className="text-[#1a2332]">{formatCurrency(change.discountRollbackBefore)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">修改后</span>
                      <p className="text-[#1a2332]">{formatCurrency(change.discountRollbackAfter)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">差异</span>
                    <span className="font-medium text-[#d4943a]">{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">退款影响金额</span>
                    <span className={`font-medium ${change.refundImpactAmount >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {change.refundImpactAmount >= 0 ? '+' : ''}{formatCurrency(change.refundImpactAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
