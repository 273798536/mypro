import { X, Clock, User, ArrowRight, FileText } from 'lucide-react';
import { HistoryRecord } from '../../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  crackName: string;
  history: HistoryRecord[];
}

export function HistoryPanel({ isOpen, onClose, crackName, history }: HistoryPanelProps) {
  if (!isOpen) return null;

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: '创建',
      update: '修改',
      delete: '删除',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      create: 'text-status-normal bg-status-normal/10',
      update: 'text-blue-400 bg-blue-500/10',
      delete: 'text-status-duplicate bg-status-duplicate/10',
    };
    return colors[action] || 'text-slate-400 bg-slate-500/10';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-96 bg-slate-900 border-l border-slate-700 h-full flex flex-col animate-slide-in">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              操作历史
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">{crackName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {history.length > 0 ? (
            <div className="space-y-4">
              {history.map((record, index) => (
                <div key={record.id} className="relative pl-6 pb-4">
                  {index < history.length - 1 && (
                    <div className="absolute left-[11px] top-6 w-0.5 h-full bg-slate-700" />
                  )}

                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-sm text-slate-300">{record.operator}</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getActionColor(record.action)}`}
                      >
                        {getActionLabel(record.action)}
                      </span>
                    </div>

                    {record.field && (
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <span className="text-slate-500">{record.field}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-slate-400 line-through">{record.oldValue}</span>
                        <span className="text-status-normal">{record.newValue}</span>
                      </div>
                    )}

                    {record.remark && (
                      <p className="text-xs text-slate-500 italic">"{record.remark}"</p>
                    )}

                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
                      <Clock className="w-3 h-3" />
                      {record.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm">暂无操作历史</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
