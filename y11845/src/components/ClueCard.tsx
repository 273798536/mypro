import type { Clue } from '@/types';
import { getCategoryColor, getCategoryLabel, getSourceTypeLabel } from '@/utils/evidenceValidator';
import { Pin, PinOff, Link2, Eye } from 'lucide-react';

interface ClueCardProps {
  clue: Clue;
  isMarked: boolean;
  isSelected: boolean;
  onMark: () => void;
  onUnmark: () => void;
  onSelect: () => void;
  onViewSource: () => void;
}

export default function ClueCard({
  clue,
  isMarked,
  isSelected,
  onMark,
  onUnmark,
  onSelect,
  onViewSource,
}: ClueCardProps) {
  return (
    <div
      className={`relative rounded-lg border transition-all duration-200 ${
        isSelected
          ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-950/20'
          : isMarked
          ? 'border-amber-500/50 bg-amber-950/10'
          : 'border-slate-700/50 bg-slate-800/40'
      }`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(
              clue.category
            )}`}
          >
            {getCategoryLabel(clue.category)}
          </span>
          <span className="text-xs text-slate-500 flex-shrink-0">
            {getSourceTypeLabel(clue.sourceType)}
          </span>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed mb-2">{clue.content}</p>

        {isMarked && (
          <p className="text-xs text-slate-400 leading-relaxed mb-2 border-t border-slate-700/50 pt-2">
            {clue.detail}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-2">
          {isMarked ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnmark();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
            >
              <PinOff size={12} />
              取消钉选
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMark();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors"
            >
              <Pin size={12} />
              钉选到证据板
            </button>
          )}

          {isMarked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                isSelected
                  ? 'bg-amber-400/30 text-amber-200'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              <Link2 size={12} />
              {isSelected ? '选择关联中...' : '关联'}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewSource();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 transition-colors ml-auto"
          >
            <Eye size={12} />
            追溯来源
          </button>
        </div>
      </div>

      {isMarked && (
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 rounded-full shadow-lg shadow-amber-400/50" />
      )}
    </div>
  );
}
