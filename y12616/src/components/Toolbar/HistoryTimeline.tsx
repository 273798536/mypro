
import React from 'react';
import { History, Undo2, Redo2, Move, MessageSquare, Ruler, RotateCw, CheckCircle } from 'lucide-react';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { HistoryActionType } from '../../types';

const actionIcons: Record<HistoryActionType, React.ReactNode> = {
  move_node: <Move size={12} />,
  add_annotation: <MessageSquare size={12} />,
  fix_anomaly: <CheckCircle size={12} />,
  delete_node: <CheckCircle size={12} />,
  update_scale: <Ruler size={12} />,
  flip_coordinate: <RotateCw size={12} />,
};

const actionLabels: Record<HistoryActionType, string> = {
  move_node: '移动节点',
  add_annotation: '添加备注',
  fix_anomaly: '修复异常',
  delete_node: '删除节点',
  update_scale: '更新比例尺',
  flip_coordinate: '翻转坐标',
};

export const HistoryTimeline: React.FC = () => {
  const { canUndo, canRedo, undo, redo, history, future } = useUndoRedo();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <History size={16} className="text-purple-400" />
          操作历史
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`
              p-1.5 rounded transition-all
              ${canUndo
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }
            `}
            title="撤销 (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`
              p-1.5 rounded transition-all
              ${canRedo
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }
            `}
            title="重做 (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} />
          </button>
        </div>
      </div>

      <div className="relative">
        {history.length > 0 ? (
          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {[...history].reverse().map((action, index) => (
              <div
                key={action.id}
                className={`
                  flex items-start gap-2 p-2 rounded text-xs transition-all
                  ${index === 0
                    ? 'bg-purple-500/10 border border-purple-500/30'
                    : 'bg-slate-800/30'
                  }
                `}
              >
                <span
                  className={`
                    p-1 rounded
                    ${index === 0 ? 'bg-purple-500/30 text-purple-300' : 'bg-slate-700 text-slate-400'
                  }
                `}
                >
                  {actionIcons[action.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-200 truncate">{action.description}</div>
                  <div className="text-slate-500 text-[10px]">
                    {actionLabels[action.type]} · {formatTime(action.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500 text-xs">
            暂无操作记录
          </div>
        )}

        {future.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700/50">
            <div className="text-[10px] text-slate-500 px-1 mb-1">可重做</div>
            <div className="space-y-1">
              {future.slice(0, 3).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center gap-2 p-1.5 rounded bg-slate-800/30 text-xs text-slate-400"
                >
                  <span className="p-0.5 rounded bg-slate-700">
                    {actionIcons[action.type]}
                  </span>
                  <span className="truncate">{action.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
