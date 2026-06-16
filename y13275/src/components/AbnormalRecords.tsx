import { AlertTriangle, FileWarning, Clock, ArrowRight, ChevronDown, ChevronUp, Ban, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirePointStore } from '@/store/useFirePointStore';
import { getAbnormalTypeText, formatDateTime } from '@/utils/format';

export default function AbnormalRecords() {
  const { selectedPointId, getPointDataSources, expandedAbnormal, toggleAbnormalExpanded } =
    useFirePointStore();

  const dataSources = selectedPointId ? getPointDataSources(selectedPointId) : [];
  const abnormalSources = dataSources.filter((s) => s.isAbnormal);

  if (!selectedPointId || abnormalSources.length === 0) {
    return null;
  }

  const abnormalConfig = {
    old_version: {
      icon: FileWarning,
      bg: 'bg-accent-50',
      border: 'border-accent-300',
      badge: 'bg-accent-100 text-accent-700',
      title: '旧版记录',
    },
    late_arrival: {
      icon: Clock,
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      badge: 'bg-yellow-100 text-yellow-700',
      title: '晚到材料',
    },
    conflict: {
      icon: ArrowRight,
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      badge: 'bg-orange-100 text-orange-700',
      title: '意见冲突',
    },
  };

  return (
    <div className="bg-surface rounded-lg border-2 border-accent-300 overflow-hidden animate-shake">
      <div className="bg-gradient-to-r from-accent-500 to-accent-400 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-white" />
          <h3 className="font-display text-base font-bold text-white">
            异常记录隔离区
          </h3>
          <span className="ml-auto inline-flex items-center justify-center w-6 h-6 bg-white/20 text-white text-xs font-bold rounded-full">
            {abnormalSources.length}
          </span>
        </div>
        <p className="text-accent-50 text-xs mt-1">
          以下记录已被隔离，不会混入正常归并结果，请谨慎处理
        </p>
      </div>

      <div className="p-3 space-y-3 bg-diagonal-stripe">
        {abnormalSources.map((source, index) => {
          const config = source.abnormalType ? abnormalConfig[source.abnormalType] : abnormalConfig.old_version;
          const Icon = config.icon;
          const isExpanded = expandedAbnormal.includes(source.id);

          return (
            <div
              key={source.id}
              className={cn(
                'rounded-lg border-2 overflow-hidden transition-all opacity-0 animate-slide-in',
                config.bg,
                config.border
              )}
              style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' }}
            >
              <div
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-white/30 transition-colors"
                onClick={() => toggleAbnormalExpanded(source.id)}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', source.abnormalType === 'late_arrival' ? 'text-yellow-600' : 'text-accent-600')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', config.badge)}>
                      {source.abnormalType ? getAbnormalTypeText(source.abnormalType) : '异常'}
                    </span>
                    <h4 className="font-medium text-text-primary text-sm truncate">
                      {source.title}
                    </h4>
                  </div>
                </div>
                <button className="p-1 hover:bg-white/50 rounded transition-colors">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  )}
                </button>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-white/30">
                  <p className="text-sm text-text-secondary mt-3 mb-3 leading-relaxed">
                    {source.content}
                  </p>

                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {source.uploadedBy} · {formatDateTime(source.uploadedAt)}
                    </span>
                    <button className="inline-flex items-center gap-1 px-2 py-1 bg-white/70 text-text-muted rounded hover:bg-white transition-colors">
                      <Ban className="w-3.5 h-3.5" />
                      已排除
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
