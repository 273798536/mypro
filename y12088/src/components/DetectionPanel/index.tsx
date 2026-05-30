import React from 'react';
import { AlertTriangle, Eye, User, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useSandboxStore } from '../../store/useSandboxStore';
import type { Conflict } from '../../types';

export const DetectionPanel: React.FC = () => {
  const {
    conflicts,
    coverageRate,
    updateConflictStatus,
    assignConflict,
    craneRadius,
  } = useSandboxStore();

  const getConflictTypeName = (type: Conflict['type']) => {
    switch (type) {
      case 'crossing':
        return '路线交叉';
      case 'overheight':
        return '箱区超高';
      case 'blind':
        return '吊机盲区';
      default:
        return '未知';
    }
  };

  const getStatusIcon = (status: Conflict['status']) => {
    switch (status) {
      case 'pending':
        return <Clock size={14} className="text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'resolved':
        return <XCircle size={14} className="text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: Conflict['status']) => {
    switch (status) {
      case 'pending':
        return '待确认';
      case 'confirmed':
        return '已确认';
      case 'resolved':
        return '已解决';
      default:
        return '';
    }
  };

  const crossingConflicts = conflicts.filter((c) => c.type === 'crossing');
  const overheightConflicts = conflicts.filter((c) => c.type === 'overheight');
  const blindConflicts = conflicts.filter((c) => c.type === 'blind');

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 text-orange-400">
          <AlertTriangle size={20} />
          <h2 className="font-semibold text-lg">检测面板</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 text-gray-300 mb-3">
            <Eye size={16} />
            <span className="text-sm font-medium">覆盖检测</span>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">堆场覆盖率</span>
              <span className="text-lg font-mono font-bold text-blue-400">{coverageRate}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(coverageRate, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              当前吊机半径: {craneRadius}m，覆盖区域以圆形计算
            </p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-400">路线交叉</span>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                {crossingConflicts.length} 处
              </span>
            </div>
            <div className="space-y-2">
              {crossingConflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="bg-gray-800 rounded-lg p-3 border border-orange-500/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(conflict.status)}
                      <span className="text-xs text-gray-300">{getStatusText(conflict.status)}</span>
                    </div>
                    <select
                      value={conflict.status}
                      onChange={(e) =>
                        updateConflictStatus(conflict.id, e.target.value as Conflict['status'])
                      }
                      className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 focus:outline-none"
                    >
                      <option value="pending">待确认</option>
                      <option value="confirmed">已确认</option>
                      <option value="resolved">已解决</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{conflict.description}</p>
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-gray-500" />
                    <input
                      type="text"
                      value={conflict.assignee || ''}
                      placeholder="分配责任人"
                      onChange={(e) => assignConflict(conflict.id, e.target.value)}
                      className="flex-1 text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    位置: ({conflict.position.x.toFixed(1)}, {conflict.position.z.toFixed(1)})
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-400">箱区超高</span>
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                {overheightConflicts.length} 处
              </span>
            </div>
            <div className="space-y-2">
              {overheightConflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="bg-gray-800 rounded-lg p-3 border border-red-500/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(conflict.status)}
                      <span className="text-xs text-gray-300">{getStatusText(conflict.status)}</span>
                    </div>
                    <select
                      value={conflict.status}
                      onChange={(e) =>
                        updateConflictStatus(conflict.id, e.target.value as Conflict['status'])
                      }
                      className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 focus:outline-none"
                    >
                      <option value="pending">待确认</option>
                      <option value="confirmed">已确认</option>
                      <option value="resolved">已解决</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{conflict.description}</p>
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-gray-500" />
                    <input
                      type="text"
                      value={conflict.assignee || ''}
                      placeholder="分配责任人"
                      onChange={(e) => assignConflict(conflict.id, e.target.value)}
                      className="flex-1 text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-400">吊机盲区</span>
              <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded">
                {blindConflicts.length} 处
              </span>
            </div>
            <div className="space-y-2">
              {blindConflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-600"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(conflict.status)}
                      <span className="text-xs text-gray-300">{getStatusText(conflict.status)}</span>
                      {conflict.status === 'pending' && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                          待确认分支
                        </span>
                      )}
                    </div>
                    <select
                      value={conflict.status}
                      onChange={(e) =>
                        updateConflictStatus(conflict.id, e.target.value as Conflict['status'])
                      }
                      className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 focus:outline-none"
                    >
                      <option value="pending">待确认</option>
                      <option value="confirmed">已确认</option>
                      <option value="resolved">已解决</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{conflict.description}</p>
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-gray-500" />
                    <input
                      type="text"
                      value={conflict.assignee || ''}
                      placeholder="分配核实人"
                      onChange={(e) => assignConflict(conflict.id, e.target.value)}
                      className="flex-1 text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
