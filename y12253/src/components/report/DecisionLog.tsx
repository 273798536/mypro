import React, { useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { DecisionRecord } from '../../types/game';

const DecisionLog: React.FC = () => {
  const { decisionLog, addRemark } = useGameStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [remarkText, setRemarkText] = useState('');

  const consequenceIcons: Record<string, React.ReactNode> = {
    safe: <CheckCircle size={16} className="text-sonar-green-400" />,
    'near-miss': <AlertTriangle size={16} className="text-warning-orange-400" />,
    collision: <XCircle size={16} className="text-danger-red-400" />,
    misjudgment: <AlertTriangle size={16} className="text-warning-orange-400" />
  };

  const consequenceLabels: Record<string, string> = {
    safe: '安全',
    'near-miss': '险象环生',
    collision: '碰撞',
    misjudgment: '误判'
  };

  const actionLabels: Record<string, string> = {
    move: '移动',
    sonar: '声呐扫描',
    wait: '等待'
  };

  const handleSaveRemark = (recordId: string) => {
    addRemark(recordId, remarkText, '学员');
    setEditingId(null);
    setRemarkText('');
  };

  if (decisionLog.length === 0) {
    return (
      <div className="glow-border rounded-lg p-6 bg-deep-ocean-950/50 text-center">
        <Clock size={48} className="mx-auto text-gray-600 mb-3" />
        <p className="text-gray-500">暂无航行记录</p>
        <p className="text-xs text-gray-600 mt-1">开始游戏后决策记录将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="glow-border rounded-lg bg-deep-ocean-950/50 overflow-hidden">
      <div className="p-4 border-b border-deep-ocean-800">
        <h3 className="text-tech-cyan-500 font-display text-sm">航行决策日志</h3>
        <p className="text-xs text-gray-500 mt-1">共 {decisionLog.length} 条记录</p>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {decisionLog.map((record: DecisionRecord, index: number) => (
          <div
            key={record.id}
            className="border-b border-deep-ocean-800/50 last:border-b-0"
          >
            <div
              className="p-4 cursor-pointer hover:bg-deep-ocean-900/50 transition-colors"
              onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {consequenceIcons[record.consequence]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-white">
                        步骤 {record.step}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-deep-ocean-800 text-gray-400">
                        {actionLabels[record.action]}
                      </span>
                      {record.isMissingFields && (
                        <span className="text-xs px-2 py-0.5 rounded bg-warning-orange-500/20 text-warning-orange-400">
                          缺字段
                        </span>
                      )}
                      {record.isLateEntry && (
                        <span className="text-xs px-2 py-0.5 rounded bg-danger-red-500/20 text-danger-red-400">
                          晚补
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {consequenceLabels[record.consequence]}
                      {record.direction && ` · 方向: ${record.direction}`}
                      {record.speed && ` · 速度: ${record.speed}节`}
                    </div>
                  </div>
                </div>
                {expandedId === record.id ? (
                  <ChevronUp size={16} className="text-gray-500" />
                ) : (
                  <ChevronDown size={16} className="text-gray-500" />
                )}
              </div>

              {record.remarks && !editingId && (
                <div className="mt-2 text-xs text-gray-400 bg-deep-ocean-800/30 rounded px-3 py-2">
                  📝 {record.remarks}
                  {record.remarkHistory && record.remarkHistory.length > 0 && (
                    <span className="text-warning-orange-400 ml-2">
                      (已修改 {record.remarkHistory.length} 次)
                    </span>
                  )}
                </div>
              )}
            </div>

            {expandedId === record.id && (
              <div className="px-4 pb-4 border-t border-deep-ocean-800/30 pt-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">时间戳</span>
                    <div className="text-tech-cyan-400 font-mono mt-1">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">记录状态</span>
                    <div className="mt-1">
                      {record.isMissingFields ? (
                        <span className="text-warning-orange-400">字段不完整</span>
                      ) : record.isLateEntry ? (
                        <span className="text-danger-red-400">节拍外提交</span>
                      ) : (
                        <span className="text-sonar-green-400">正常记录</span>
                      )}
                    </div>
                  </div>
                </div>

                {record.remarkHistory && record.remarkHistory.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs text-gray-500">备注修改历史</span>
                    <div className="mt-2 space-y-2">
                      {record.remarkHistory.map((change, idx) => (
                        <div key={change.id} className="text-xs bg-deep-ocean-800/30 rounded p-2">
                          <div className="text-gray-500">
                            {change.author} · {new Date(change.timestamp).toLocaleTimeString()}
                          </div>
                          {change.oldValue && (
                            <div className="text-gray-500 line-through mt-1">
                              {change.oldValue}
                            </div>
                          )}
                          <div className="text-sonar-green-400">{change.newValue}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editingId === record.id ? (
                  <div className="mt-3">
                    <textarea
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      placeholder="添加备注..."
                      className="w-full bg-deep-ocean-800 border border-deep-ocean-700 rounded p-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-tech-cyan-500"
                      rows={2}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveRemark(record.id);
                        }}
                        className="px-3 py-1 text-xs bg-tech-cyan-500 text-deep-ocean-950 rounded hover:bg-tech-cyan-400"
                      >
                        保存
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                        className="px-3 py-1 text-xs bg-deep-ocean-700 text-gray-300 rounded hover:bg-deep-ocean-600"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(record.id);
                      setRemarkText(record.remarks || '');
                    }}
                    className="mt-3 flex items-center gap-1 text-xs text-tech-cyan-400 hover:text-tech-cyan-300"
                  >
                    <Edit3 size={12} />
                    {record.remarks ? '编辑备注' : '添加备注'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DecisionLog;
