import { cn } from '../lib/utils';
import type { KnowledgeTag } from '../types';
import { getCategoryLabel } from '../utils/algorithms';

interface TagBadgeProps {
  tag: KnowledgeTag;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

const categoryColors: Record<string, string> = {
  rhythm: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  harmony: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  melody: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  interval: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  chord: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200',
};

export default function TagBadge({ tag, onRemove, onClick, className }: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200',
        categoryColors[tag.category] || 'bg-gray-100 text-gray-700 border-gray-200',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <span className="opacity-60">[{getCategoryLabel(tag.category)}]</span>
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-black/10 rounded-full w-4 h-4 flex items-center justify-center"
        >
          ×
        </button>
      )}
    </span>
  );
}
