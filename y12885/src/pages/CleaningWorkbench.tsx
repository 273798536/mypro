import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Ship,
  MapPin,
  Gauge,
  Play,
  Wand2,
  Edit3,
  Check,
  X,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../mock/data';
import { ANOMALY_TYPE_LABELS, AnomalyType, SHIP_LIST } from '../types';
import ActionableErrorCard from '../components/ActionableErrorCard';
import StatCard from '../components/StatCard';

export default function CleaningWorkbench() {
  const {
    trackPoints,
    anomalyRecords,
    actionableErrors,
    autoCleanTrackPoints,
    updateTrackPoint,
    resolveAnomaly,
    addNotification,
  } = useAppStore();

  const [selectedAnomalyType, setSelectedAnomalyType] = useState<AnomalyType | 'all'>('all');
  const [selectedShipId, setSelectedShipId] = useState<string>('all');
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [resolutionText, setResolutionText] = useState<string>('');

  const unresolvedAnomalies = useMemo(() => 
    anomalyRecords.filter(a => !a.resolved),
    [anomalyRecords]
  );

  const filteredAnomalies = useMemo(() => {
    let filtered = unresolvedAnomalies;
    
    if (selectedAnomalyType !== 'all') {
      filtered = filtered.filter(a => a.type === selectedAnomalyType);
    }
    
    if (selectedShipId !== 'all') {
      const pointIds = new Set(
        trackPoints.filter(p => p.shipId === selectedShipId).map(p => p.id)
      );
      filtered = filtered.filter(a => pointIds.has(a.trackPointId));
    }
    
    return filtered;
  }, [unresolvedAnomalies, selectedAnomalyType, selectedShipId, trackPoints]);

  const anomalyStats = useMemo(() => {
    const stats: Record<AnomalyType, number> = {
      negative_depth: 0,
      missing_page: 0,
      coordinate_drift: 0,
      speed_abnormal: 0,
      time_gap: 0,
    };
    
    unresolvedAnomalies.forEach(a => {
      stats[a.type]++;
    });
    
    return stats;
  }, [unresolvedAnomalies]);

  const getTrackPoint = (pointId: string) => {
    return trackPoints.find(p => p.id === pointId);
  };

  const handleAutoClean = (shipId: string) => {
    autoCleanTrackPoints(shipId);
  };

  const handleStartEdit = (pointId: string) => {
    const point = getTrackPoint(pointId);
    if (point) {
      setEditingPoint(pointId);
      setEditValue(point.depth);
    }
  };

  const handleSaveEdit = (pointId: string, anomalyId: string) => {
    updateTrackPoint(pointId, { depth: editValue });
    if (resolutionText) {
      resolveAnomaly(anomalyId, resolutionText);
    }
    setEditingPoint(null);
    setResolutionText('');
  };

  const handleCancelEdit = () => {
    setEditingPoint(null);
    setResolutionText('');
  };

  const handleBatchResolve = () => {
    if (filteredAnomalies.length === 0) return;
    
    addNotification(`已批量处理 ${filteredAnomalies.length} 条异常`, 'success');
  };

  const anomalyTypeStats = [
    { type: 'negative_depth' as AnomalyType, icon: Gauge, label: '深度为负', color: 'recollect' as const },
    { type: 'missing_page' as AnomalyType, icon: Clock, label: '轨迹断页', color: 'recollect' as const },
    { type: 'coordinate_drift' as AnomalyType, icon: MapPin, label: '坐标漂移', color: 'suspended' as const },
    { type: 'speed_abnormal' as AnomalyType, icon: Ship, label: '航速异常', color: 'suspended' as const },
  ];

  return (
    <div className="min-h-screen bg-ocean-gradient bg-grid-pattern bg-grid p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-ocean-100">轨迹清洗工作台</h1>
            <p className="text-sm text-ocean-400 mt-1">检测并修复船舶轨迹数据异常，确保碳汇核算精度</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBatchResolve}
              className="btn-primary flex items-center gap-2"
              disabled={filteredAnomalies.length === 0}
            >
              <Check className="w-4 h-4" />
              批量处理
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出报告
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="待处理异常"
            value={unresolvedAnomalies.length}
            icon={AlertTriangle}
            color="recollect"
            subtitle={`${anomalyStats.negative_depth} 个深度异常 · ${anomalyStats.missing_page} 个断页`}
          />
          <StatCard
            title="自动清洗"
            value="一键处理"
            icon={Wand2}
            color="available"
          />
          <StatCard
            title="轨迹点总数"
            value={trackPoints.length}
            icon={MapPin}
            color="default"
          />
          <StatCard
            title="已修复"
            value={anomalyRecords.filter(a => a.resolved).length}
            icon={CheckCircle}
            color="available"
            trend="up"
            trendValue="+3 今日"
          />
        </div>

        {actionableErrors.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-ocean-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              需处理的问题 ({actionableErrors.length})
            </h3>
            {actionableErrors.slice(0, 2).map(error => (
              <ActionableErrorCard key={error.id} error={error} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          {anomalyTypeStats.map(({ type, icon: Icon, label, color }) => (
            <button
              key={type}
              onClick={() => setSelectedAnomalyType(selectedAnomalyType === type ? 'all' : type)}
              className={`glass-panel p-4 text-left transition-all ${
                selectedAnomalyType === type
                  ? 'border-ocean-400 shadow-lg shadow-ocean-500/20'
                  : 'hover:border-ocean-600/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  color === 'recollect' ? 'bg-data-recollect/20 text-data-recollect' : 'bg-data-suspended/20 text-data-suspended'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-2xl font-bold font-mono ${
                  color === 'recollect' ? 'text-data-recollect' : 'text-data-suspended'
                }`}>
                  {anomalyStats[type]}
                </span>
              </div>
              <p className="text-sm font-medium text-ocean-100">{label}</p>
              <p className="text-xs text-ocean-400">{ANOMALY_TYPE_LABELS[type]}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 space-y-4">
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-ocean-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-data-recollect" />
                  异常列表
                  <span className="text-xs text-ocean-400">({filteredAnomalies.length})</span>
                </h3>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedShipId}
                    onChange={(e) => setSelectedShipId(e.target.value)}
                    className="input-field text-xs py-1.5 w-40"
                  >
                    <option value="all">全部船舶</option>
                    {SHIP_LIST.map(ship => (
                      <option key={ship.id} value={ship.id}>{ship.name}</option>
                    ))}
                  </select>
                  <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" />
                    更多筛选
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredAnomalies.length === 0 ? (
                  <div className="text-center py-12 text-ocean-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无待处理的异常数据</p>
                  </div>
                ) : (
                  filteredAnomalies.map(anomaly => {
                    const point = getTrackPoint(anomaly.trackPointId);
                    if (!point) return null;
                    const isEditing = editingPoint === point.id;

                    return (
                      <div
                        key={anomaly.id}
                        className="p-4 bg-ocean-900/50 rounded-lg border border-ocean-700/30 hover:border-ocean-600/50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <StatusBadge status={anomaly.severity} type="severity" />
                              <StatusBadge status={point.dataQuality} type="data-quality" />
                              <span className="text-xs text-ocean-400 font-mono">
                                {ANOMALY_TYPE_LABELS[anomaly.type]}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm mb-2">
                              <span className="flex items-center gap-1 text-ocean-300">
                                <Ship className="w-3.5 h-3.5" />
                                {point.shipName}
                              </span>
                              <span className="flex items-center gap-1 text-ocean-300">
                                <MapPin className="w-3.5 h-3.5" />
                                {point.longitude.toFixed(4)}°E, {point.latitude.toFixed(4)}°N
                              </span>
                              <span className="flex items-center gap-1 text-ocean-300">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDateTime(point.timestamp).slice(5, 16)}
                              </span>
                            </div>

                            <p className="text-sm text-ocean-200 mb-3">{anomaly.description}</p>

                            {anomaly.type === 'negative_depth' && (
                              <div className="bg-ocean-800/50 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-4">
                                  <div>
                                    <span className="text-xs text-ocean-400">当前深度</span>
                                    <p className={`text-lg font-mono font-bold ${point.depth < 0 ? 'text-data-recollect' : 'text-ocean-200'}`}>
                                      {point.depth.toFixed(2)} m
                                    </p>
                                  </div>
                                  <div className="text-ocean-600">→</div>
                                  <div>
                                    <span className="text-xs text-ocean-400">建议修正值</span>
                                    <p className="text-lg font-mono font-bold text-data-available">
                                      {Math.abs(point.depth).toFixed(2)} m
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {isEditing && (
                              <div className="space-y-3 mb-3">
                                <div>
                                  <label className="text-xs text-ocean-400 block mb-1">修正值</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="input-field"
                                    value={editValue}
                                    onChange={(e) => setEditValue(Number(e.target.value))}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-ocean-400 block mb-1">处理说明（可选）</label>
                                  <textarea
                                    className="input-field resize-none"
                                    rows={2}
                                    placeholder="请输入处理说明..."
                                    value={resolutionText}
                                    onChange={(e) => setResolutionText(e.target.value)}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {!isEditing ? (
                              <>
                                <button
                                  onClick={() => handleAutoClean(point.shipId)}
                                  className="btn-success text-xs py-1.5 px-3 flex items-center gap-1.5"
                                >
                                  <Wand2 className="w-3.5 h-3.5" />
                                  自动清洗
                                </button>
                                <button
                                  onClick={() => handleStartEdit(point.id)}
                                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  手动修正
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(point.id, anomaly.id)}
                                  className="btn-success text-xs py-1.5 px-3 flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  保存
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  取消
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="col-span-4 space-y-4">
            <div className="glass-panel p-4">
              <h3 className="font-medium text-ocean-100 mb-4 flex items-center gap-2">
                <Ship className="w-4 h-4" />
                船舶快捷操作
              </h3>
              <div className="space-y-3">
                {SHIP_LIST.map(ship => {
                  const shipAnomalies = unresolvedAnomalies.filter(a => {
                    const p = getTrackPoint(a.trackPointId);
                    return p?.shipId === ship.id;
                  });
                  
                  return (
                    <div key={ship.id} className="flex items-center justify-between p-3 bg-ocean-900/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-ocean-100">{ship.name}</p>
                        <p className="text-xs text-ocean-400">
                          {shipAnomalies.length} 个待处理异常
                        </p>
                      </div>
                      <button
                        onClick={() => handleAutoClean(ship.id)}
                        className="btn-success text-xs py-1.5 px-3 flex items-center gap-1.5"
                        disabled={shipAnomalies.length === 0}
                      >
                        <Play className="w-3.5 h-3.5" />
                        自动清洗
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel p-4">
              <h3 className="font-medium text-ocean-100 mb-4 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                清洗规则
              </h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-ocean-900/50 rounded-lg">
                  <p className="text-ocean-200 font-medium mb-1">深度为负</p>
                  <p className="text-xs text-ocean-400">取前后30分钟内正常数据的平均值进行插值修正</p>
                </div>
                <div className="p-3 bg-ocean-900/50 rounded-lg">
                  <p className="text-ocean-200 font-medium mb-1">轨迹断页</p>
                  <p className="text-xs text-ocean-400">检测超过5分钟的数据间隔，标记为需补录</p>
                </div>
                <div className="p-3 bg-ocean-900/50 rounded-lg">
                  <p className="text-ocean-200 font-medium mb-1">坐标漂移</p>
                  <p className="text-xs text-ocean-400">检测相邻点距离突变超过50%的异常点</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-4 bg-gradient-to-br from-ocean-600/20 to-ocean-800/20">
              <h3 className="font-medium text-ocean-100 mb-2">清洗说明</h3>
              <p className="text-xs text-ocean-300 leading-relaxed">
                所有修正操作都会自动生成版本记录，包含修改前后对比、操作人和时间戳。
                修正后的数据需提交海事处复核，通过后方可标记为可用。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
