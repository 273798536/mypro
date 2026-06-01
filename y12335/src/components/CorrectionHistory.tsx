import { Clock, User, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function CorrectionHistory() {
  const corrections = useStore(s => s.corrections);
  const getVolunteerById = useStore(s => s.getVolunteerById);

  if (corrections.length === 0) {
    return (
      <div className="rounded-xl bg-surface-800 border border-surface-700 p-6 text-center">
        <p className="text-gray-500 text-sm">暂无修正记录</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-surface-600" />

      <div className="space-y-4">
        {[...corrections].reverse().map(correction => {
          const volunteer = getVolunteerById(correction.volunteerId);
          return (
            <div key={correction.id} className="relative">
              <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-brand-500 border-2 border-surface-800 z-10" />

              <div className="rounded-xl bg-surface-800 border border-surface-700 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={12} className="text-gray-500" />
                  <span className="text-xs text-gray-500 font-mono">
                    {correction.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <User size={12} className="text-brand-400" />
                  <span className="text-sm text-gray-200 font-medium">
                    {volunteer?.name ?? '未知'}
                  </span>
                  <span className="text-xs text-gray-500 bg-surface-700 px-1.5 py-0.5 rounded">
                    技能标签
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-danger/10 text-danger border border-danger/20 line-through font-mono">
                    {correction.oldValue || '（空）'}
                  </span>
                  <ArrowRight size={12} className="text-gray-500 flex-shrink-0" />
                  <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                    {correction.newValue || '（空）'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
