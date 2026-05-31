import { QualityIssue } from '../../types';
import { AlertTriangle, AlertCircle, Info, Clock, ArrowRight } from 'lucide-react';
import { cn, formatTime } from '../../utils';
import { useNavigate } from 'react-router-dom';

interface IssueCardProps {
  issue: QualityIssue;
  isSelected?: boolean;
  onSelect?: (issue: QualityIssue) => void;
  showTrace?: boolean;
}

const severityConfig = {
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/50',
    text: 'text-red-400',
    icon: AlertTriangle,
    label: '严重',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    icon: AlertCircle,
    label: '警告',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    icon: Info,
    label: '提示',
  },
};

const issueTypeLabels: Record<string, string> = {
  timing_offset: '音画偏移',
  dense_chord: '双押过密',
  hold_miss: '长按漏判',
  difficulty_label: '难度标签',
};

export const IssueCard = ({ issue, isSelected, onSelect, showTrace = true }: IssueCardProps) => {
  const navigate = useNavigate();
  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  const handleTrace = () => {
    navigate(`/trace/${issue.id}`);
  };

  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-all duration-200 cursor-pointer',
        config.bg,
        config.border,
        isSelected && 'ring-2 ring-white/30 scale-[1.02]'
      )}
      onClick={() => onSelect?.(issue)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={cn('w-4 h-4', config.text)} />
            <span className={cn('text-xs font-medium', config.text)}>{config.label}</span>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
              {issueTypeLabels[issue.type]}
            </span>
          </div>
          <p className="text-slate-200 text-sm mb-2">{issue.description}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>时间: {formatTime(issue.time)}</span>
            </div>
            <span>关联Note: {issue.relatedNotes.length}</span>
          </div>
        </div>
        {showTrace && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTrace();
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md transition-colors"
          >
            追溯
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
