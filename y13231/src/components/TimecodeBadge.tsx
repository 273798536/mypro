import { Clock } from 'lucide-react';

interface TimecodeBadgeProps {
  isOffset: boolean;
  onToggle?: () => void;
  showLabel?: boolean;
}

export function TimecodeBadge({ isOffset, onToggle, showLabel = false }: TimecodeBadgeProps) {
  if (!isOffset && !onToggle) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.();
  };

  if (isOffset) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="badge badge-timecode gap-1 cursor-pointer"
        title="时码偏半拍 - 点击切换"
      >
        <Clock className="w-3 h-3" />
        <span>时码偏半拍</span>
      </button>
    );
  }

  if (onToggle) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="badge bg-gray-100 text-gray-500 border-gray-300 gap-1 cursor-pointer hover:bg-accent-50 hover:text-accent-600 hover:border-accent-300 transition-colors"
        title="点击标记为时码偏半拍"
      >
        <Clock className="w-3 h-3" />
        <span>{showLabel ? '无时码偏移' : '标'}</span>
      </button>
    );
  }

  return null;
}
