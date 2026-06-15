import React, { useState, useMemo } from 'react';
import {
  History,
  ArrowRight,
  ArrowLeft,
  Clock,
  User,
  MapPin,
  Ship,
  Droplets,
  Filter,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
} from 'lucide-react';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, getVersionHistory } from '../mock/data';
import { DataQuality, DATA_QUALITY_LABELS, SHIP_LIST } from '../types';
import StatCard from '../components/StatCard';

export default function HistoryTraceback() {
  const { versionRecords, trackPoints, reviewTasks, addNotification } = useAppStore();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedShipId, setSelectedShipId] = useState<string>('all');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  const operators = useMemo(() => {
    const opSet = new Set(versionRecords.map(r => r.operatorName));
    return Array.from(opSet);
  }, [versionRecords]);

  const filteredRecords = useMemo(() => {
    let filtered = [...versionRecords];
    
    if (selectedShipId !== 'all') {
      const shipPointIds = new Set(
        trackPoints.filter(p => p.shipId === selectedShipId).map(p => p.id)
      );
      filtered = filtered.filter(r => shipPointIds.has(r.recordId));
    }
    
    if (selectedOperator !== 'all') {
      filtered = filtered.filter(r => r.operatorName === selectedOperator);
    }
    
    if (timeRange !== 'all') {
      const days = timeRange === '7d' ? 7 : 30;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(r => r.timestamp >= cutoff);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [versionRecords, trackPoints, selectedShipId, selectedOperator, timeRange]);

  const selectedRecord = useMemo(() => 
    versionRecords.find(r => r.id === selectedRecordId) || null,
    [versionRecords, selectedRecordId]
  );

  const relatedPoint = useMemo(() => {
    if (!selectedRecord) return null;
    return trackPoints.find(p => p.id === selectedRecord.recordId);
  }, [selectedRecord, trackPoints]);

  const relatedTasks = useMemo(() => {
    if (!selectedRecord) return [];
    return reviewTasks.filter(t => 
      t.relatedRecordIds.includes(selectedRecord.recordId)
    );
  }, [selectedRecord, reviewTasks]);

  const recordStats = useMemo(() => ({
    total: versionRecords.length,
    manual: versionRecords.filter(r => r.changeType.includes('人工')).length,
    auto: versionRecords.filter(r => r.changeType.includes('自动')).length,
  }), [versionRecords]);

  const toggleExpand = (id: string) => {
    setExpandedRecords(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRevert = (record: typeof versionRecords[0]) => {
    addNotification(`已恢复到 ${formatDateTime(record.timestamp)} 的版本`, 'success');
  };

  const handleExportAudit = () => {
    addNotification('审计日志导出成功', 'success');
  };

  const getRecordIcon = (changeType: string) => {
    if (changeType.includes('深度')) return MapPin;
    if (changeType.includes('轨迹')) return Ship;
    if (changeType.includes('水质')) return Droplets;
    return FileText;
  };

  return (
    <div className="min-h-screen bg-ocean-gradient bg-grid-pattern bg-grid p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-ocean-100">历史回溯</h1>
            <p className="text-sm text-ocean-400 mt-1">追溯数据修改历史，将结论拉回来源材料</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportAudit}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出审计日志
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="总修改记录"
            value={recordStats.total}
            icon={History}
            color="default"
          />
          <StatCard
            title="人工修正"
            value={recordStats.manual}
            icon={User}
            color="suspended"
          />
          <StatCard
            title="自动清洗"
            value={recordStats.auto}
            icon={Play}
            color="available"
          />
          <StatCard
            title="今日修改"
            value={versionRecords.filter(r => 
              r.timestamp >= Date.now() - 24 * 60 * 60 * 1000
            ).length}
            icon={Clock}
            color="pending"
          />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 space-y-4">
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-ocean-100 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  修改历史时间线
                </h3>
                <div className="flex items-center gap-2">
                  {(['7d', '30d', 'all'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1 text-xs rounded-md transition-all ${
                        timeRange === range
                          ? 'bg-ocean-600/50 text-ocean-100'
                          : 'text-ocean-400 hover:bg-ocean-800/50'
                      }`}
                    >
                      {range === '7d' ? '7天' : range === '30d' ? '30天' : '全部'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <select
                  value={selectedShipId}
                  onChange={(e) => setSelectedShipId(e.target.value)}
                  className="input-field text-xs py-1.5 flex-1"
                >
                  <option value="all">全部船舶</option>
                  {SHIP_LIST.map(ship => (
                    <option key={ship.id} value={ship.id}>{ship.name}</option>
                  ))}
                </select>
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="input-field text-xs py-1.5 flex-1"
                >
                  <option value="all">全部操作人</option>
                  {operators.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 max-h-[650px] overflow-y-auto pr-2">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-12 text-ocean-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无修改记录</p>
                  </div>
                ) : (
                  filteredRecords.map((record, index) => {
                    const Icon = getRecordIcon(record.changeType);
                    const point = trackPoints.find(p => p.id === record.recordId);
                    const isExpanded = expandedRecords.has(record.id);
                    const isSelected = selectedRecordId === record.id;
                    const showDate = index === 0 || 
                      formatDateTime(record.timestamp).slice(0, 10) !== 
                      formatDateTime(filteredRecords[index - 1].timestamp).slice(0, 10);

                    return (
                      <div key={record.id}>
                        {showDate && (
                          <div className="py-2 px-2 text-xs text-ocean-400 font-medium">
                            {formatDateTime(record.timestamp).slice(0, 10)}
                          </div>
                        )}
                        
                        <div
                          className={`relative pl-6 py-2 cursor-pointer transition-all ${
                            isSelected ? 'bg-ocean-700/20 -mx-2 px-8 rounded-lg' : ''
                          }`}
                          onClick={() => setSelectedRecordId(record.id)}
                        >
                          {index < filteredRecords.length - 1 && (
                            <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-ocean-700/50" />
                          )}
                          <div className={`absolute left-0 top-2.5 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                            record.changeType.includes('人工') 
                              ? 'bg-data-suspended/20 border-data-suspended/50' 
                              : 'bg-data-available/20 border-data-available/50'
                          }`}>
                            <Icon className={`w-2.5 h-2.5 ${
                              record.changeType.includes('人工') ? 'text-data-suspended' : 'text-data-available'
                            }`} />
                          </div>
                          
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-ocean-100">
                                  {record.changeType}
                                </span>
                                {point && (
                                  <StatusBadge status={point.dataQuality} type="data-quality" />
                                )}
                              </div>
                              <p className="text-xs text-ocean-400 mb-1">
                                {record.operatorName} · {formatDateTime(record.timestamp).slice(11, 16)}
                              </p>
                              {record.before && record.after && (
                                <div className="flex items-center gap-2 text-[10px] font-mono">
                                  <span className="line-through text-data-recollect">
                                    {typeof record.before === 'object' 
                                      ? JSON.stringify(record.before) 
                                      : String(record.before)}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-ocean-600" />
                                  <span className="text-data-available">
                                    {typeof record.after === 'object' 
                                      ? JSON.stringify(record.after) 
                                      : String(record.after)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(record.id);
                              }}
                              className="p-1 hover:bg-ocean-700/50 rounded flex-shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-ocean-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-ocean-400" />
                              )}
                            </button>
                          </div>

                          {isExpanded && record.remark && (
                            <div className="mt-2 p-2 bg-ocean-800/30 rounded text-xs text-ocean-300 italic">
                              备注: {record.remark}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="col-span-7 space-y-4">
            {!selectedRecord ? (
              <div className="glass-panel p-12 text-center">
                <Eye className="w-16 h-16 mx-auto mb-4 text-ocean-600" />
                <h3 className="text-lg font-medium text-ocean-200 mb-2">选择记录查看详情</h3>
                <p className="text-sm text-ocean-400">
                  从左侧时间线中选择一条修改记录，查看完整的变更详情和来源材料
                </p>
              </div>
            ) : (
              <>
                <div className="glass-panel p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          selectedRecord.changeType.includes('人工')
                            ? 'bg-data-suspended/20 text-data-suspended'
                            : 'bg-data-available/20 text-data-available'
                        }`}>
                          {getRecordIcon(selectedRecord.changeType) && 
                            React.createElement(getRecordIcon(selectedRecord.changeType), { className: 'w-6 h-6' })}
                        </div>
                        <div>
                          <h2 className="text-lg font-display font-bold text-ocean-100">
                            {selectedRecord.changeType}
                          </h2>
                          <p className="text-xs text-ocean-400">
                            {formatDateTime(selectedRecord.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevert(selectedRecord)}
                      className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      恢复此版本
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-ocean-900/50 rounded-lg">
                    <div>
                      <p className="text-xs text-ocean-400 mb-1">操作人</p>
                      <p className="text-sm text-ocean-100 flex items-center gap-2">
                        <User className="w-4 h-4 text-ocean-500" />
                        {selectedRecord.operatorName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ocean-400 mb-1">操作类型</p>
                      <p className="text-sm text-ocean-100">
                        {selectedRecord.changeType.includes('人工') ? '人工修正' : '自动清洗'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ocean-400 mb-1">记录ID</p>
                      <p className="text-sm text-ocean-100 font-mono text-xs">
                        {selectedRecord.recordId}
                      </p>
                    </div>
                  </div>

                  {selectedRecord.before && selectedRecord.after && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-ocean-100 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-data-suspended" />
                        变更对比
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-data-recollect/10 rounded-lg border border-data-recollect/30">
                          <p className="text-xs text-ocean-400 mb-2 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-data-recollect" />
                            修改前 (原值)
                          </p>
                          <pre className="text-xs font-mono text-data-recollect bg-ocean-900/50 p-3 rounded overflow-x-auto">
                            {JSON.stringify(selectedRecord.before, null, 2)}
                          </pre>
                        </div>
                        <div className="p-4 bg-data-available/10 rounded-lg border border-data-available/30">
                          <p className="text-xs text-ocean-400 mb-2 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-data-available" />
                            修改后 (新值)
                          </p>
                          <pre className="text-xs font-mono text-data-available bg-ocean-900/50 p-3 rounded overflow-x-auto">
                            {JSON.stringify(selectedRecord.after, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {relatedPoint && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-ocean-100 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        来源数据详情
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-ocean-900/50 rounded-lg">
                          <p className="text-xs text-ocean-400 mb-1">船舶</p>
                          <p className="text-sm text-ocean-100">{relatedPoint.shipName}</p>
                        </div>
                        <div className="p-3 bg-ocean-900/50 rounded-lg">
                          <p className="text-xs text-ocean-400 mb-1">经度</p>
                          <p className="text-sm text-ocean-100 font-mono">
                            {relatedPoint.longitude.toFixed(6)}°E
                          </p>
                        </div>
                        <div className="p-3 bg-ocean-900/50 rounded-lg">
                          <p className="text-xs text-ocean-400 mb-1">纬度</p>
                          <p className="text-sm text-ocean-100 font-mono">
                            {relatedPoint.latitude.toFixed(6)}°N
                          </p>
                        </div>
                        <div className="p-3 bg-ocean-900/50 rounded-lg">
                          <p className="text-xs text-ocean-400 mb-1">深度</p>
                          <p className={`text-sm font-mono font-bold ${
                            relatedPoint.depth < 0 ? 'text-data-recollect' : 'text-ocean-100'
                          }`}>
                            {relatedPoint.depth.toFixed(2)} m
                          </p>
                        </div>
                        <div className="p-3 bg-ocean-900/50 rounded-lg">
                          <p className="text-xs text-ocean-400 mb-1">航速</p>
                          <p className="text-sm text-ocean-100 font-mono">
                            {relatedPoint.speed.toFixed(1)} kn
                          </p>
                        </div>
                        <div className="p-3 bg-ocean-900/50 rounded-lg">
                          <p className="text-xs text-ocean-400 mb-1">航向</p>
                          <p className="text-sm text-ocean-100 font-mono">
                            {relatedPoint.heading}°
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-ocean-900/50 rounded-lg">
                        <p className="text-xs text-ocean-400 mb-1">数据质量状态</p>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={relatedPoint.dataQuality} type="data-quality" />
                          <span className="text-sm text-ocean-300">
                            {DATA_QUALITY_LABELS[relatedPoint.dataQuality]}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {relatedTasks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-ocean-100 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        关联复核任务
                      </h4>
                      <div className="space-y-2">
                        {relatedTasks.map(task => (
                          <div
                            key={task.id}
                            className="p-3 bg-ocean-900/50 rounded-lg flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <StatusBadge status={task.status} type="review" />
                              <div>
                                <p className="text-sm text-ocean-100">{task.title}</p>
                                <p className="text-xs text-ocean-400">
                                  {task.submitterName} · {formatDateTime(task.createdAt).slice(5, 16)}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-ocean-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRecord.remark && (
                    <div className="mt-6 p-4 bg-ocean-800/30 rounded-lg border border-ocean-700/50">
                      <p className="text-xs text-ocean-400 mb-1">处理备注</p>
                      <p className="text-sm text-ocean-200 italic">"{selectedRecord.remark}"</p>
                    </div>
                  )}
                </div>

                <div className="glass-panel p-4 bg-gradient-to-br from-ocean-600/20 to-ocean-800/20">
                  <h3 className="font-medium text-ocean-100 mb-2">历史回溯说明</h3>
                  <p className="text-xs text-ocean-300 leading-relaxed">
                    系统完整记录每一次数据修改操作，包括自动清洗和人工修正。每条记录都包含
                    修改前后对比、操作人、时间戳和处理备注。通过历史回溯功能，
                    可以将任何结论追溯回原始来源材料，确保数据可核查、可追溯。
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
