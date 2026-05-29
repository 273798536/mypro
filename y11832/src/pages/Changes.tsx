import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Megaphone, Settings, MapPin, Clock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { loadChangeHistory } from '../engine/ChangeDetector';
import { ChangeRecord, ChangeType } from '../types';

const changeTypeConfig: Record<ChangeType, { label: string; icon: React.ReactNode; color: string }> = {
  broadcast_added: {
    label: '广播新增',
    icon: <Megaphone size={16} />,
    color: 'bg-metro-green',
  },
  broadcast_modified: {
    label: '广播修改',
    icon: <Megaphone size={16} />,
    color: 'bg-metro-blue',
  },
  gate_modified: {
    label: '闸机修改',
    icon: <Settings size={16} />,
    color: 'bg-metro-orange',
  },
  map_modified: {
    label: '地图修改',
    icon: <MapPin size={16} />,
    color: 'bg-metro-red',
  },
};

export default function Changes() {
  const navigate = useNavigate();
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ChangeType | 'all'>('all');

  useEffect(() => {
    setChanges(loadChangeHistory());
  }, []);

  const filteredChanges = filterType === 'all' 
    ? changes 
    : changes.filter((c) => c.type === filterType);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getEntityName = (change: ChangeRecord): string => {
    if (change.type.startsWith('broadcast')) {
      const newValue = change.newValue as { title?: string } | null;
      const oldValue = change.oldValue as { title?: string } | null;
      return newValue?.title || oldValue?.title || change.entityId;
    }
    if (change.type === 'gate_modified') {
      const newValue = change.newValue as { name?: string } | null;
      const oldValue = change.oldValue as { name?: string } | null;
      return newValue?.name || oldValue?.name || change.entityId;
    }
    return change.entityId;
  };

  const renderChangeDetails = (change: ChangeRecord) => {
    if (change.type.startsWith('broadcast')) {
      const oldValue = change.oldValue as { title?: string; content?: string; cooldownSeconds?: number; relatedLocations?: string[] } | null;
      const newValue = change.newValue as { title?: string; content?: string; cooldownSeconds?: number; relatedLocations?: string[] } | null;

      return (
        <div className="space-y-3">
          {oldValue?.title !== newValue?.title && (
            <FieldDiff label="标题" oldValue={oldValue?.title} newValue={newValue?.title} />
          )}
          {oldValue?.content !== newValue?.content && (
            <FieldDiff label="内容" oldValue={oldValue?.content} newValue={newValue?.content} isLong />
          )}
          {oldValue?.cooldownSeconds !== newValue?.cooldownSeconds && (
            <FieldDiff label="冷却时间" oldValue={`${oldValue?.cooldownSeconds}s`} newValue={`${newValue?.cooldownSeconds}s`} />
          )}
          {JSON.stringify(oldValue?.relatedLocations) !== JSON.stringify(newValue?.relatedLocations) && (
            <FieldDiff 
              label="关联位置" 
              oldValue={oldValue?.relatedLocations?.join(', ')} 
              newValue={newValue?.relatedLocations?.join(', ')} 
            />
          )}
        </div>
      );
    }

    if (change.type === 'gate_modified') {
      const oldValue = change.oldValue as { name?: string; status?: string; isFaulty?: boolean; capacity?: number; position?: { x: number; y: number } } | null;
      const newValue = change.newValue as { name?: string; status?: string; isFaulty?: boolean; capacity?: number; position?: { x: number; y: number } } | null;

      return (
        <div className="space-y-3">
          {oldValue?.status !== newValue?.status && (
            <FieldDiff label="状态" oldValue={oldValue?.status} newValue={newValue?.status} />
          )}
          {oldValue?.isFaulty !== newValue?.isFaulty && (
            <FieldDiff label="是否故障" oldValue={oldValue?.isFaulty ? '是' : '否'} newValue={newValue?.isFaulty ? '是' : '否'} />
          )}
          {oldValue?.capacity !== newValue?.capacity && (
            <FieldDiff label="通行能力" oldValue={`${oldValue?.capacity} 人/分钟`} newValue={`${newValue?.capacity} 人/分钟`} />
          )}
          {(oldValue?.position?.x !== newValue?.position?.x || oldValue?.position?.y !== newValue?.position?.y) && (
            <FieldDiff 
              label="位置坐标" 
              oldValue={oldValue?.position ? `(${oldValue.position.x}, ${oldValue.position.y})` : undefined} 
              newValue={newValue?.position ? `(${newValue.position.x}, ${newValue.position.y})` : undefined} 
            />
          )}
        </div>
      );
    }

    return null;
  };

  const clearHistory = () => {
    if (confirm('确定要清空所有变更记录吗？')) {
      localStorage.removeItem('metro_evacuation_change_history');
      setChanges([]);
    }
  };

  return (
    <div className="min-h-screen bg-metro-bg text-metro-text">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      <header className="relative border-b border-metro-border bg-metro-bgDark/80 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-2 bg-metro-bg hover:bg-metro-bgLight border border-metro-border rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
                <span className="text-sm">返回首页</span>
              </button>
              <div>
                <h1 className="text-xl font-bold">变更追踪</h1>
                <p className="text-xs text-metro-textMuted">站厅地图相关结论改动记录</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2 bg-metro-blue hover:bg-blue-600 text-white rounded-lg transition-all"
              >
                <Settings size={18} />
                前往管理后台
              </button>
              {changes.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-2 px-4 py-2 bg-metro-border hover:bg-metro-border/80 text-metro-text rounded-lg transition-all"
                >
                  清空记录
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterType === 'all'
                ? 'bg-metro-blue text-white'
                : 'bg-metro-bg text-metro-textMuted hover:bg-metro-bgLight'
            }`}
          >
            全部 ({changes.length})
          </button>
          {(Object.keys(changeTypeConfig) as ChangeType[]).map((type) => {
            const config = changeTypeConfig[type];
            const count = changes.filter((c) => c.type === type).length;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterType === type
                    ? 'bg-metro-blue text-white'
                    : 'bg-metro-bg text-metro-textMuted hover:bg-metro-bgLight'
                }`}
              >
                {config.icon}
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {filteredChanges.length === 0 ? (
          <div className="metro-panel text-center py-16">
            <Zap className="mx-auto text-metro-textMuted mb-4" size={64} />
            <h3 className="text-xl font-bold mb-2">暂无变更记录</h3>
            <p className="text-metro-textMuted mb-6">
              {filterType === 'all' 
                ? '在管理后台修改广播词或闸机配置后，变更记录将显示在这里' 
                : '当前筛选条件下没有变更记录'}
            </p>
            <button
              onClick={() => navigate('/admin')}
              className="px-6 py-3 bg-metro-blue hover:bg-blue-600 text-white rounded-lg font-bold transition-all"
            >
              前往管理后台
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredChanges.map((change) => {
              const config = changeTypeConfig[change.type];
              const isExpanded = expandedId === change.id;
              const entityName = getEntityName(change);

              return (
                <div
                  key={change.id}
                  className="metro-panel overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-metro-bg/50 transition-colors"
                    onClick={() => toggleExpand(change.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <span className="text-white">{config.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded text-white font-bold ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="font-bold">{entityName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-metro-textMuted">
                          <Clock size={12} />
                          {formatDate(change.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {change.affectedConclusions.length > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="text-metro-yellow" size={16} />
                          <span className="text-sm text-metro-yellow">
                            {change.affectedConclusions.length} 项结论受影响
                          </span>
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="text-metro-textMuted" size={20} />
                      ) : (
                        <ChevronDown className="text-metro-textMuted" size={20} />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-metro-border p-4 bg-metro-bg/50">
                      {change.type !== 'broadcast_added' && (
                        <div className="mb-4">
                          <h4 className="text-sm font-bold text-metro-textMuted mb-3">字段变更详情</h4>
                          {renderChangeDetails(change)}
                        </div>
                      )}

                      {change.affectedConclusions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-metro-yellow mb-3 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            站厅地图相关结论变更
                          </h4>
                          <div className="space-y-2">
                            {change.affectedConclusions.map((conclusion, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-3 p-3 bg-metro-yellow/5 border border-metro-yellow/20 rounded-lg"
                              >
                                <CheckCircle className="text-metro-yellow flex-shrink-0 mt-0.5" size={16} />
                                <p className="text-sm text-metro-text">{conclusion}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {changes.length > 0 && (
          <div className="mt-8 metro-panel">
            <h3 className="font-bold mb-4">变更统计</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(Object.entries(changeTypeConfig) as [ChangeType, typeof changeTypeConfig[ChangeType]][]).map(([type, config]) => {
                const count = changes.filter((c) => c.type === type).length;
                return (
                  <div key={type} className="text-center p-4 bg-metro-bg rounded-lg">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${config.color} mb-2`}>
                      <span className="text-white">{config.icon}</span>
                    </div>
                    <div className="text-2xl font-bold font-mono">{count}</div>
                    <div className="text-xs text-metro-textMuted">{config.label}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-metro-border text-center text-sm text-metro-textMuted">
              总计 {changes.length} 条变更记录
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface FieldDiffProps {
  label: string;
  oldValue?: string;
  newValue?: string;
  isLong?: boolean;
}

function FieldDiff({ label, oldValue, newValue, isLong }: FieldDiffProps) {
  return (
    <div className="p-3 bg-metro-bg rounded-lg">
      <div className="text-xs text-metro-textMuted mb-2 font-bold">{label}</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-metro-red mb-1 flex items-center gap-1">
            <span className="w-3 h-0.5 bg-metro-red inline-block" />
            旧值
          </div>
          <div className={`text-sm text-metro-text ${isLong ? 'whitespace-pre-wrap break-words' : ''}`}>
            {oldValue || <span className="text-metro-textMuted italic">（空）</span>}
          </div>
        </div>
        <div>
          <div className="text-xs text-metro-green mb-1 flex items-center gap-1">
            <span className="w-3 h-0.5 bg-metro-green inline-block" />
            新值
          </div>
          <div className={`text-sm text-metro-text ${isLong ? 'whitespace-pre-wrap break-words' : ''}`}>
            {newValue || <span className="text-metro-textMuted italic">（空）</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
