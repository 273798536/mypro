import { useState } from 'react';
import { Clock, User, ChevronDown, ChevronUp, GitCompare, Check } from 'lucide-react';
import type { Judgment } from '@/types';
import { cn } from '@/lib/utils';

interface JudgmentHistoryProps {
  judgments: Judgment[];
  onAddJudgment?: () => void;
}

function diffText(oldText: string, newText: string): { old: string; new: string } {
  return { old: oldText, new: newText };
}

function JudgmentVersionCard({
  judgment,
  isLatest,
  isComparing,
  onToggleCompare,
}: {
  judgment: Judgment;
  isLatest: boolean;
  isComparing: boolean;
  onToggleCompare: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className={cn(
        'relative pl-6 pb-5',
        isLatest ? '' : 'opacity-80'
      )}
    >
      <div
        className={cn(
          'absolute left-[7px] top-3 w-3 h-3 rounded-full border-2 border-white z-10',
          isLatest ? 'bg-success-500' : 'bg-steel-300'
        )}
      />
      {!isLatest && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-steel-100" />
      )}

      <div
        className={cn(
          'border rounded-md overflow-hidden transition-shadow',
          isLatest
            ? 'border-success-200 bg-success-50/30'
            : 'border-steel-100 bg-white hover:border-steel-200'
        )}
      >
        <div
          className="p-3 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded',
                  isLatest
                    ? 'bg-success-500 text-white'
                    : 'bg-steel-100 text-steel-500'
                )}
              >
                v{judgment.version}
              </span>
              {isLatest && (
                <span className="text-xs text-success-600 font-medium flex items-center gap-1">
                  <Check size={12} />
                  当前版本
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCompare();
                }}
                className={cn(
                  'flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors',
                  isComparing
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-steel-400 hover:text-primary-500 hover:bg-steel-50'
                )}
              >
                <GitCompare size={12} />
                对比
              </button>
              {expanded ? (
                <ChevronUp size={16} className="text-steel-400" />
              ) : (
                <ChevronDown size={16} className="text-steel-400" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-steel-400">
            <div className="flex items-center gap-1">
              <User size={12} />
              <span>{judgment.operator}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{judgment.createdAt}</span>
            </div>
          </div>

          {!expanded && (
            <p className="mt-2 text-sm text-steel-500 line-clamp-2">
              {judgment.content}
            </p>
          )}
        </div>

        {expanded && (
          <div className="px-3 pb-3 space-y-3 animate-fade-in">
            <div className="pt-2 border-t border-steel-100/50">
              <div className="text-xs text-steel-400 mb-2">判断内容</div>
              <p className="text-sm text-steel-700 leading-relaxed whitespace-pre-wrap">
                {judgment.content}
              </p>
            </div>

            <div className="pt-2 border-t border-steel-100/50">
              <div className="text-xs text-steel-400 mb-1">修改原因</div>
              <p className="text-sm text-steel-600 bg-steel-50 rounded px-2 py-1.5">
                {judgment.reason}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JudgmentHistory({
  judgments,
  onAddJudgment,
}: JudgmentHistoryProps) {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const sortedJudgments = [...judgments].sort((a, b) => b.version - a.version);

  const compareJudgments = compareIds
    .map((id) => judgments.find((j) => j.id === id))
    .filter(Boolean) as Judgment[];

  if (judgments.length === 0) {
    return (
      <div className="text-center py-10 text-steel-400 text-sm">
        暂无判断记录
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-steel-500">
          共 {judgments.length} 个版本
        </div>
        {compareIds.length === 2 && (
          <span className="text-xs text-primary-500 bg-primary-50 px-2 py-1 rounded">
            已选择 2 个版本对比
          </span>
        )}
      </div>

      {compareIds.length === 2 && compareJudgments.length === 2 && (
        <div className="bg-white border border-primary-100 rounded-md p-4 mb-4">
          <div className="text-sm font-medium text-steel-700 mb-3 flex items-center gap-2">
            <GitCompare size={16} className="text-primary-500" />
            版本对比：v{compareJudgments[1].version} → v{compareJudgments[0].version}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-steel-400 mb-2">
                v{compareJudgments[1].version} ({compareJudgments[1].createdAt.split(' ')[0]})
              </div>
              <div className="p-3 bg-steel-50 rounded text-sm text-steel-500 leading-relaxed">
                {compareJudgments[1].content}
              </div>
            </div>
            <div>
              <div className="text-xs text-success-500 mb-2">
                v{compareJudgments[0].version} ({compareJudgments[0].createdAt.split(' ')[0]})
              </div>
              <div className="p-3 bg-success-50 rounded text-sm text-steel-700 leading-relaxed border border-success-100">
                {compareJudgments[0].content}
              </div>
            </div>
          </div>
          <button
            onClick={() => setCompareIds([])}
            className="mt-3 text-xs text-steel-400 hover:text-steel-600"
          >
            清除对比
          </button>
        </div>
      )}

      <div className="space-y-1">
        {sortedJudgments.map((judgment, index) => (
          <JudgmentVersionCard
            key={judgment.id}
            judgment={judgment}
            isLatest={index === 0}
            isComparing={compareIds.includes(judgment.id)}
            onToggleCompare={() => toggleCompare(judgment.id)}
          />
        ))}
      </div>

      {onAddJudgment && (
        <button
          onClick={onAddJudgment}
          className="w-full py-2.5 border-2 border-dashed border-steel-200 rounded-md text-sm text-steel-400 hover:text-primary-500 hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
        >
          + 添加新判断
        </button>
      )}
    </div>
  );
}
