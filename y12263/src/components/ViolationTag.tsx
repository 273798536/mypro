
import { AlertTriangle, Clock, FileWarning, Edit3, Wind, Navigation } from 'lucide-react';
import { VIOLATION_LABELS, VIOLATION_COLORS } from '@/constants';

interface ViolationTagProps {
  type: string;
  highlighted?: boolean;
  showIcon?: boolean;
  small?: boolean;
}

const violationIcons: Record<string, React.ReactNode> = {
  headwind_ignored: <Wind className="w-3 h-3" />,
  inefficient_path: <Navigation className="w-3 h-3" />,
  insufficient_return: <AlertTriangle className="w-3 h-3" />,
  no_fly_zone: <AlertTriangle className="w-3 h-3" />,
  missing_field: <FileWarning className="w-3 h-3" />,
  late_entry: <Clock className="w-3 h-3" />
};

export default function ViolationTag({ type, highlighted = false, showIcon = true, small = false }: ViolationTagProps) {
  const label = VIOLATION_LABELS[type] || type;
  const color = VIOLATION_COLORS[type] || '#666';
  const icon = violationIcons[type];

  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        highlighted ? 'ring-2 ring-offset-1 ring-offset-slate-900' : ''
      } ${small ? 'text-[10px] px-1.5 py-0' : ''}`}
      style={{ 
        backgroundColor: `${color}20`, 
        color,
        ...(highlighted ? { boxShadow: `0 0 0 2px ${color}` } : {})
      }}
    >
      {showIcon && icon}
      {label}
    </span>
  );
}

export function DataStatusTags({ 
  hasMissingFields, 
  isLateEntry, 
  remarkModified,
  lateEntryHours 
}: { 
  hasMissingFields: boolean; 
  isLateEntry: boolean; 
  remarkModified: boolean;
  lateEntryHours?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {hasMissingFields && (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/20 text-yellow-400"
          title="存在缺失字段"
        >
          <FileWarning className="w-3 h-3" />
          缺字段
        </span>
      )}
      {isLateEntry && (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/20 text-orange-400"
          title={`晚补${lateEntryHours || ''}小时`}
        >
          <Clock className="w-3 h-3" />
          晚补{lateEntryHours ? ` ${lateEntryHours}h` : ''}
        </span>
      )}
      {remarkModified && (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400"
          title="备注已修改"
        >
          <Edit3 className="w-3 h-3" />
          备注改
        </span>
      )}
    </div>
  );
}
