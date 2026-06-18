import { cn } from '@/lib/utils';
import type { DataSource } from '@/types';
import { dataSourceTypeLabelMap } from '@/types';
import { formatDateTime, formatNumber } from '@/data/mockData';
import { Database, HardDrive, FileJson, FolderOpen } from 'lucide-react';

interface SourceTimelineProps {
  sources: DataSource[];
  pageSequence: number[];
  pageSequenceValid: boolean;
}

const sourceIcons: Record<string, typeof Database> = {
  full_backup: Database,
  incremental_backup: HardDrive,
  binlog: FileJson,
  manual: FolderOpen,
};

const sourceColors: Record<string, string> = {
  full_backup: 'bg-blue-100 text-blue-600 border-blue-200',
  incremental_backup: 'bg-purple-100 text-purple-600 border-purple-200',
  binlog: 'bg-amber-100 text-amber-600 border-amber-200',
  manual: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function SourceTimeline({
  sources,
  pageSequence,
  pageSequenceValid,
}: SourceTimelineProps) {
  const sortedSources = [...sources].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">数据来源追溯</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">分页序列：</span>
            <span
              className={cn(
                'font-mono text-sm px-2 py-1 rounded',
                pageSequenceValid
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              )}
            >
              [{pageSequence.join(', ')}]
            </span>
            {!pageSequenceValid && (
              <span className="text-xs text-amber-600">⚠ 序列不连续</span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="relative">
          <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-6">
            {sortedSources.map((source, index) => {
              const Icon = sourceIcons[source.sourceType] || Database;
              const isPageMissing =
                !pageSequenceValid &&
                index > 0 &&
                source.pageNumber !== sortedSources[index - 1].pageNumber + 1;

              return (
                <div key={source.id} className="relative flex gap-4">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      sourceColors[source.sourceType],
                      'bg-white'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {dataSourceTypeLabelMap[source.sourceType]}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded border',
                              sourceColors[source.sourceType]
                            )}
                          >
                            第 {source.pageNumber} 页
                          </span>
                          {isPageMissing && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                              ⚠ 前页缺失
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-mono">
                          {source.sourcePath}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-mono text-slate-800">
                          {formatNumber(source.recordCount)} 条
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDateTime(source.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
