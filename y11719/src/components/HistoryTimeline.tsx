import { History, Edit3, RefreshCw, Calculator, Wrench, User, Cog, Zap } from 'lucide-react';
import { useExperimentStore } from '../store/useExperimentStore';
import { ActionType, SourceType, HistoryRecord } from '../types';

const actionTypeConfig: Record<ActionType, {
  icon: typeof Edit3;
  color: string;
  label: string;
}> = {
  input: {
    icon: Edit3,
    color: 'text-teal-400',
    label: '输入',
  },
  correction: {
    icon: RefreshCw,
    color: 'text-amber-400',
    label: '修正',
  },
  unit_change: {
    icon: Wrench,
    color: 'text-blue-400',
    label: '单位',
  },
  calculation: {
    icon: Calculator,
    color: 'text-purple-400',
    label: '计算',
  },
  auto_fix: {
    icon: Zap,
    color: 'text-green-400',
    label: '自动',
  },
};

const sourceConfig: Record<SourceType, {
  icon: typeof User;
  label: string;
}> = {
  user: {
    icon: User,
    label: '用户',
  },
  auto_correction: {
    icon: Zap,
    label: '自动',
  },
  system: {
    icon: Cog,
    label: '系统',
  },
};

export function HistoryTimeline() {
  const { history, clearHistory } = useExperimentStore();

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-semibold text-slate-100">操作历史</h3>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            清空
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无操作记录</p>
          </div>
        ) : (
          history.map((record) => (
            <HistoryItem key={record.id} record={record} formatTime={formatTime} />
          ))
        )}
      </div>
    </div>
  );
}

interface HistoryItemProps {
  record: HistoryRecord;
  formatTime: (date: Date) => string;
}

function HistoryItem({ record, formatTime }: HistoryItemProps) {
  const actionConfig = actionTypeConfig[record.actionType];
  const sourceConfigItem = sourceConfig[record.source];
  const ActionIcon = actionConfig.icon;
  const SourceIcon = sourceConfigItem.icon;

  return (
    <div className="flex gap-3 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <div className={`p-1.5 rounded-full bg-slate-700 ${actionConfig.color}`}>
          <ActionIcon className="w-3 h-3" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-medium ${actionConfig.color}`}>
            {actionConfig.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <SourceIcon className="w-3 h-3" />
            {sourceConfigItem.label}
          </span>
          <span className="text-xs text-slate-500 ml-auto">
            {formatTime(record.timestamp)}
          </span>
        </div>
        <p className="text-sm text-slate-300 truncate">{record.description}</p>
        {record.oldValue !== undefined && record.newValue !== undefined && (
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="text-red-400 line-through">
              {String(record.oldValue)}
            </span>
            <span className="text-slate-500">→</span>
            <span className="text-green-400">{String(record.newValue)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
