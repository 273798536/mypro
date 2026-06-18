import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import type { Version } from '@/types';
import { getStatusColor, getStatusText, formatDate, cn } from '@/utils/helpers';

interface TimelineProps {
  versions: Version[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export default function Timeline({ versions, selectedId, onSelect }: TimelineProps) {
  const navigate = useNavigate();

  const getStatusIcon = (status: Version['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={14} className="text-accent-green" />;
      case 'withdrawn':
        return <XCircle size={14} className="text-gray-500" />;
      case 'abnormal':
        return <AlertTriangle size={14} className="text-accent-red" />;
    }
  };

  return (
    <div className="space-y-1">
      {versions.map((version, index) => (
        <div
          key={version.id}
          className={cn(
            'relative pl-8 pb-6 cursor-pointer group',
            index !== versions.length - 1 ? 'border-l-2 border-border-color' : ''
          )}
          onClick={() => {
            onSelect?.(version.id);
            navigate(`/versions/${version.id}`);
          }}
        >
          <div
            className={cn(
              'absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-bg-primary',
              getStatusColor(version.status)
            )}
          />

          <div
            className={cn(
              'rounded-lg p-4 transition-all duration-200',
              'hover:bg-bg-secondary hover:translate-x-1',
              selectedId === version.id ? 'bg-bg-secondary glow-border' : 'bg-transparent',
              version.status === 'withdrawn' ? 'opacity-60' : ''
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display font-bold text-white">
                    {version.versionNumber}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                      version.status === 'active' && 'bg-accent-green/10 text-accent-green',
                      version.status === 'withdrawn' && 'bg-gray-500/10 text-gray-400',
                      version.status === 'abnormal' && 'bg-accent-red/10 text-accent-red'
                    )}
                  >
                    {getStatusIcon(version.status)}
                    {getStatusText(version.status)}
                  </span>
                </div>

                <p
                  className={cn(
                    'text-sm text-gray-300 mb-2',
                    version.status === 'withdrawn' && 'line-through'
                  )}
                >
                  {version.description}
                </p>

                {version.status === 'withdrawn' && version.withdrawReason && (
                  <div className="bg-gray-500/10 rounded px-3 py-2 mb-2">
                    <p className="text-xs text-gray-400">
                      撤回原因：{version.withdrawReason}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatDate(version.createdAt)}</span>
                  <span>·</span>
                  <span>{version.metrics.length} 个指标</span>
                  <span>·</span>
                  <span>{version.leakRecords.length} 条泄漏</span>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  {version.metrics.slice(0, 3).map((metric) => (
                    <div
                      key={metric.id}
                      className={cn(
                        'px-2 py-1 rounded text-xs font-mono',
                        metric.isAbnormal
                          ? 'bg-accent-red/10 text-accent-red'
                          : 'bg-bg-tertiary text-gray-300'
                      )}
                    >
                      {metric.name}: {metric.value}%
                    </div>
                  ))}
                </div>
              </div>

              <ChevronRight
                size={16}
                className="text-gray-500 group-hover:text-white transition-colors"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
