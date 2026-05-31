import React from 'react';
import { ScrollText, User, AlertOctagon, CheckSquare, Bell } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { TraceType, TraceSource } from '../types';

const OperationTraces: React.FC = () => {
  const traces = useGameStore(state => state.traces);

  const getTypeIcon = (type: TraceType) => {
    switch (type) {
      case 'user_action':
        return <User className="w-4 h-4" />;
      case 'conflict':
        return <AlertOctagon className="w-4 h-4" />;
      case 'system_judge':
        return <CheckSquare className="w-4 h-4" />;
      case 'event_trigger':
        return <Bell className="w-4 h-4" />;
      default:
        return <ScrollText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: TraceType, isCorrect?: boolean) => {
    if (type === 'system_judge' || type === 'user_action') {
      if (isCorrect === true) return 'bg-green-100 text-green-600';
      if (isCorrect === false) return 'bg-red-100 text-red-600';
    }
    switch (type) {
      case 'conflict':
        return 'bg-orange-100 text-orange-600';
      case 'event_trigger':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getSourceLabel = (source: TraceSource) => {
    switch (source) {
      case 'bond_card':
        return '债券卡';
      case 'cash_flow':
        return '现金流格';
      case 'announcement':
        return '公告事件';
      case 'system':
        return '系统';
      default:
        return source;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <ScrollText className="w-5 h-5 text-slate-600" />
        <h3 className="text-lg font-semibold text-gray-800">操作留痕</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {traces.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <ScrollText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无操作记录</p>
          </div>
        ) : (
          [...traces].reverse().map((trace, index) => (
            <div
              key={trace.id}
              className="p-3 bg-gray-50 rounded-lg border-l-4 border-gray-200"
              style={{
                borderLeftColor: trace.isCorrect === true ? '#10b981' : 
                                trace.isCorrect === false ? '#ef4444' : 
                                trace.type === 'event_trigger' ? '#3b82f6' : '#9ca3af'
              }}
            >
              <div className="flex items-start gap-2">
                <div className={`p-1.5 rounded ${getTypeColor(trace.type, trace.isCorrect)}`}>
                  {getTypeIcon(trace.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">
                      {formatTime(trace.timestamp)}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded text-gray-600">
                      {getSourceLabel(trace.source)}
                    </span>
                    {trace.isCorrect !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        trace.isCorrect 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {trace.isCorrect ? '正确' : '错误'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    {trace.content}
                  </p>
                  {trace.details && (
                    <p className="text-xs text-gray-500 mt-1">
                      {trace.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded" />
            <span>事件触发</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded" />
            <span>正确操作</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded" />
            <span>错误操作</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-500 rounded" />
            <span>信息冲突</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationTraces;
