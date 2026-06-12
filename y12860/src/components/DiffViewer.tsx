import { DataVersion, DiffItem } from '@/types';
import { useTrackerStore } from '@/store/useTrackerStore';
import { cn } from '@/lib/utils';
import { ArrowRight, Minus, Plus, GitCompare } from 'lucide-react';
import dayjs from 'dayjs';

interface DiffViewerProps {
  before?: DataVersion;
  after?: DataVersion;
}

const typeIconMap: Record<DiffItem['type'], typeof Minus> = {
  added: Plus,
  deleted: Minus,
  modified: ArrowRight,
};

const typeLabelMap: Record<DiffItem['type'], string> = {
  added: '新增',
  deleted: '删除',
  modified: '修改',
};

export default function DiffViewer({ before, after }: DiffViewerProps) {
  const { compareVersions } = useTrackerStore();

  const diffs = compareVersions(
    before ? before.fields : undefined,
    after ? after.fields : undefined
  );

  const formatValue = (value: any): string => {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'string') return value;
    return String(value);
  };

  const addedCount = diffs.filter((d) => d.type === 'added').length;
  const deletedCount = diffs.filter((d) => d.type === 'deleted').length;
  const modifiedCount = diffs.filter((d) => d.type === 'modified').length;

  return (
    <div className="nautical-card overflow-hidden">
      <div className="px-4 py-3 border-b border-ocean-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-seafoam-400" />
          <span className="text-sm font-medium text-ocean-100">数据版本对比</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {addedCount > 0 && (
            <span className="tag tag-available">+{addedCount} 新增</span>
          )}
          {modifiedCount > 0 && (
            <span className="tag tag-pending">~{modifiedCount} 修改</span>
          )}
          {deletedCount > 0 && (
            <span className="tag tag-recollect">-{deletedCount} 删除</span>
          )}
          {diffs.length === 0 && (
            <span className="text-ocean-500">无差异</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-ocean-700/40 text-xs border-b border-ocean-700/50">
        <div className="px-4 py-2.5 bg-ocean-800/30">
          <div className="text-ocean-500 uppercase tracking-wider text-[10px] font-semibold mb-1">
            变更前
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-ocean-300">
              {before?.id.slice(0, 8) || '—'}
            </span>
            {before?.timestamp && (
              <span className="text-ocean-500">
                {dayjs(before.timestamp).format('MM-DD HH:mm')}
              </span>
            )}
          </div>
        </div>
        <div className="px-4 py-2.5 bg-ocean-800/30">
          <div className="text-seafoam-400 uppercase tracking-wider text-[10px] font-semibold mb-1">
            变更后
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-ocean-300">
              {after?.id.slice(0, 8) || '—'}
            </span>
            {after?.timestamp && (
              <span className="text-ocean-500">
                {dayjs(after.timestamp).format('MM-DD HH:mm')}
              </span>
            )}
          </div>
        </div>
      </div>

      {diffs.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-ocean-500">
          两个版本的数据完全一致
        </div>
      ) : (
        <div className="divide-y divide-ocean-700/30">
          {diffs.map((diff) => {
            const TypeIcon = typeIconMap[diff.type];
            return (
              <div
                key={diff.field}
                className="grid grid-cols-2 gap-px bg-ocean-700/20"
              >
                <div
                  className={cn(
                    'px-4 py-3 flex items-start gap-3',
                    diff.type === 'deleted' && 'bg-coral-500/5',
                    diff.type === 'modified' && 'bg-sand-500/5'
                  )}
                >
                  <div className="shrink-0 pt-0.5">
                    <TypeIcon
                      className={cn(
                        'w-3.5 h-3.5',
                        diff.type === 'added' && 'text-seaweed-400',
                        diff.type === 'deleted' && 'text-coral-400',
                        diff.type === 'modified' && 'text-sand-400'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-ocean-500 mb-1 font-mono">
                      {diff.fieldLabel}
                    </div>
                    <div
                      className={cn(
                        'text-sm break-all',
                        diff.type === 'deleted' && 'diff-deleted px-1.5 py-0.5 rounded',
                        diff.type === 'modified' && 'diff-modified px-1.5 py-0.5 rounded',
                        diff.type === 'added' && 'text-ocean-500',
                        diff.type === 'modified' &&
                          diff.oldValue === undefined &&
                          'text-ocean-500'
                      )}
                    >
                      {diff.oldValue !== undefined && diff.oldValue !== null
                        ? formatValue(diff.oldValue)
                        : '—'}
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'px-4 py-3 flex items-start gap-3',
                    diff.type === 'added' && 'bg-seaweed-500/5',
                    diff.type === 'modified' && 'bg-sand-500/5'
                  )}
                >
                  <div className="shrink-0 pt-0.5">
                    <span
                      className={cn(
                        'inline-block w-3.5 h-3.5 rounded text-[10px] font-bold flex items-center justify-center',
                        diff.type === 'added' &&
                          'bg-seaweed-500/20 text-seaweed-300',
                        diff.type === 'deleted' &&
                          'bg-coral-500/20 text-coral-300',
                        diff.type === 'modified' &&
                          'bg-sand-500/20 text-sand-300'
                      )}
                    >
                      {typeLabelMap[diff.type][0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-seafoam-400/70 mb-1 font-mono">
                      {diff.type !== 'deleted' && diff.fieldLabel}
                    </div>
                    <div
                      className={cn(
                        'text-sm break-all',
                        diff.type === 'added' && 'diff-added px-1.5 py-0.5 rounded',
                        diff.type === 'modified' && 'diff-modified px-1.5 py-0.5 rounded',
                        diff.type === 'deleted' && 'text-ocean-500'
                      )}
                    >
                      {diff.newValue !== undefined && diff.newValue !== null
                        ? formatValue(diff.newValue)
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
