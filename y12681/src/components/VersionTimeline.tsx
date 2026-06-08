import { Link } from 'react-router-dom';
import { GitCommit, User, Clock, ArrowLeftRight } from 'lucide-react';
import type { HistoryRecord } from '@/types';
import { formatDateTime } from '@/utils/helpers';

interface VersionTimelineProps {
  history: HistoryRecord[];
  sandboxId: string;
  selectedVersions?: [string, string];
  onSelectVersion?: (id: string) => void;
}

export default function VersionTimeline({
  history,
  sandboxId,
  selectedVersions,
  onSelectVersion,
}: VersionTimelineProps) {
  const sorted = [...history].sort((a, b) => b.version - a.version);
  const latest = sorted[0];

  const isSelected = (id: string) => selectedVersions?.includes(id) ?? false;
  const selectedCount = selectedVersions?.length ?? 0;

  return (
    <div className="space-y-1">
      {sorted.map((record, idx) => {
        const isLatest = record.id === latest?.id;
        const selected = isSelected(record.id);
        const selectable = onSelectVersion !== undefined;

        return (
          <div key={record.id} className="relative pl-8">
            {idx !== sorted.length - 1 && (
              <div className="absolute left-3.5 top-7 bottom-0 w-px bg-space-600/60" />
            )}
            <div
              className={`absolute left-1.5 top-2 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                selected
                  ? 'bg-gold-500 border-gold-400 shadow-gold'
                  : isLatest
                  ? 'bg-emerald-500 border-emerald-400'
                  : 'bg-space-800 border-space-500'
              }`}
            >
              <GitCommit className={`w-2 h-2 ${selected || isLatest ? 'text-space-900' : 'text-space-300'}`} />
            </div>

            <div
              className={`card p-4 mb-3 transition-all ${
                selectable ? 'cursor-pointer hover:border-gold-500/40' : ''
              } ${selected ? 'border-gold-500/60 shadow-gold' : ''}`}
              onClick={() => selectable && onSelectVersion?.(record.id)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gold-400">
                      v{record.version}
                    </span>
                    {isLatest && (
                      <span className="text-xs text-emerald-400 bg-emerald-900/40 border border-emerald-600/50 rounded px-1.5 py-0.5">
                        当前版本
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-space-100 mt-1">{record.changeReason}</div>
                </div>

                {selectable && selectedCount < 2 && (
                  <div className="text-xs text-space-400 flex-shrink-0">
                    {selected ? '已选中' : `点击对比 ${selectedCount}/2`}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-space-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {record.modifiedBy}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(record.createdAt)}
                </span>
                <span className="text-space-500">
                  变更字段: {record.fieldsChanged.length}
                </span>
              </div>

              {!selectable && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-space-700/50">
                  <Link
                    to={`/sandbox/${sandboxId}/compare?left=${sorted[sorted.length - 1]?.id || ''}&right=${record.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 transition-colors"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    对比首个版本
                  </Link>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
