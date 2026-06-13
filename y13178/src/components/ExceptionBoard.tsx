import { useMemo } from 'react';
import { CheckCircle, Clock, Gavel } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { exceptionStatusLabels, exceptionStatusColors } from '@/utils/format';
import ExceptionCard from '@/components/ExceptionCard';
import type { ExceptionStatus } from '@/types';

const columns: Array<{
  status: ExceptionStatus;
  icon: typeof CheckCircle;
  color: string;
}> = [
  { status: 'pending_material', icon: Clock, color: 'amber' },
  { status: 'manual_overrule', icon: Gavel, color: 'purple' },
  { status: 'resolved', icon: CheckCircle, color: 'emerald' },
];

interface ExceptionBoardProps {
  compact?: boolean;
}

export default function ExceptionBoard({ compact = false }: ExceptionBoardProps) {
  const exceptions = useAppStore((s) => s.exceptions);
  const updateExceptionStatus = useAppStore((s) => s.updateExceptionStatus);

  const grouped = useMemo(() => {
    const result: Record<ExceptionStatus, typeof exceptions> = {
      resolved: [],
      pending_material: [],
      manual_overrule: [],
    };
    exceptions.forEach((e) => {
      result[e.status].push(e);
    });
    return result;
  }, [exceptions]);

  const handleMove = (id: string, targetStatus: ExceptionStatus) => {
    updateExceptionStatus(id, targetStatus);
  };

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-3' : 'grid-cols-3 h-full'}`}>
      {columns.map((col) => {
        const items = grouped[col.status];
        const Icon = col.icon;

        return (
          <div
            key={col.status}
            className={`flex flex-col bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden ${
              compact ? '' : 'min-h-0'
            }`}
          >
            {/* 列头 */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon
                    size={16}
                    className={
                      col.status === 'pending_material'
                        ? 'text-amber-400'
                        : col.status === 'manual_overrule'
                        ? 'text-purple-400'
                        : 'text-emerald-400'
                    }
                  />
                  <span className="text-sm font-medium text-slate-200">
                    {exceptionStatusLabels[col.status]}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    col.status === 'pending_material'
                      ? 'bg-amber-500/20 text-amber-400'
                      : col.status === 'manual_overrule'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {items.length}
                </span>
              </div>
            </div>

            {/* 卡片列表 */}
            <div className={`flex-1 overflow-y-auto p-2 space-y-2 ${compact ? '' : 'min-h-0'}`}>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-600 text-xs">
                  暂无记录
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="group relative">
                    <ExceptionCard item={item} />

                    {/* 快捷移动按钮（hover 显示） */}
                    {!compact && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {col.status !== 'pending_material' && (
                          <button
                            onClick={() => handleMove(item.id, 'pending_material')}
                            className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 text-[10px] flex items-center justify-center hover:bg-amber-500/30"
                            title="移至待补材料"
                          >
                            材
                          </button>
                        )}
                        {col.status !== 'manual_overrule' && (
                          <button
                            onClick={() => handleMove(item.id, 'manual_overrule')}
                            className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 text-[10px] flex items-center justify-center hover:bg-purple-500/30"
                            title="移至人工改判"
                          >
                            判
                          </button>
                        )}
                        {col.status !== 'resolved' && (
                          <button
                            onClick={() => handleMove(item.id, 'resolved')}
                            className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center hover:bg-emerald-500/30"
                            title="移至已处理"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
