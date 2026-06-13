import React from 'react';
import { AlertTriangle, Clock, FileX, MessageSquare, Package, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MarkType = 'noise' | 'old_note' | 'name_mismatch' | 'verbal_note' | 'pending' | 'manual';

interface MarkTagProps {
  type: MarkType;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

const markConfig: Record<MarkType, { label: string; bgColor: string; textColor: string; borderColor: string; icon: React.ReactNode }> = {
  noise: {
    label: '疑似噪声',
    bgColor: 'bg-orange-alert/15',
    textColor: 'text-orange-alert',
    borderColor: 'border-orange-alert/30',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  old_note: {
    label: '旧版备注',
    bgColor: 'bg-gray-500/15',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-500/30',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  name_mismatch: {
    label: '名称不一致',
    bgColor: 'bg-amber-warn/15',
    textColor: 'text-amber-warn',
    borderColor: 'border-amber-warn/30',
    icon: <FileX className="w-3.5 h-3.5" />,
  },
  verbal_note: {
    label: '口头备注',
    bgColor: 'bg-purple-verbal/15',
    textColor: 'text-purple-verbal',
    borderColor: 'border-purple-verbal/30',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
  },
  pending: {
    label: '待补材料',
    bgColor: 'bg-blue-400/15',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-400/30',
    icon: <Package className="w-3.5 h-3.5" />,
  },
  manual: {
    label: '人工改判',
    bgColor: 'bg-teal-glow/15',
    textColor: 'text-teal-glow',
    borderColor: 'border-teal-glow/30',
    icon: <Edit3 className="w-3.5 h-3.5" />,
  },
};

export const MarkTag: React.FC<MarkTagProps> = ({ type, size = 'md', showIcon = true, className }) => {
  const config = markConfig[type];
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-1 gap-1.5';
  
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses,
        className
      )}
      title={config.label}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};

interface DataMarkTagsProps {
  isNoiseSuspected?: boolean;
  isOldNote?: boolean;
  isNameMismatch?: boolean;
  isVerbalNote?: boolean;
  isPending?: boolean;
  isManual?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const DataMarkTags: React.FC<DataMarkTagsProps> = ({
  isNoiseSuspected,
  isOldNote,
  isNameMismatch,
  isVerbalNote,
  isPending,
  isManual,
  size = 'sm',
  className,
}) => {
  const tags: MarkType[] = [];
  
  if (isNoiseSuspected) tags.push('noise');
  if (isOldNote) tags.push('old_note');
  if (isNameMismatch) tags.push('name_mismatch');
  if (isVerbalNote) tags.push('verbal_note');
  if (isPending) tags.push('pending');
  if (isManual) tags.push('manual');
  
  if (tags.length === 0) return null;
  
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {tags.map((tag) => (
        <MarkTag key={tag} type={tag} size={size} />
      ))}
    </div>
  );
};
