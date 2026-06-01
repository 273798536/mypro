import { useState } from 'react';
import { Lock, Route, Users, Filter, CheckCircle, Eye, ArrowRight, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { getBuildingName } from '@/utils/graphUtils';
import type { AnomalyType, Anomaly } from '@/types';

export default function Anomalies() {
  const { anomalies, buildings, workOrders, inspectors, resolveAnomaly } = useStore();
  const [typeFilter, setTypeFilter] = useState<AnomalyType | 'all'>('all');
  const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null);

  const filteredAnomalies = anomalies.filter(a => 
    typeFilter === 'all' || a.type === typeFilter
  );

  const typeStats = {
    access_closed: anomalies.filter(a => a.type === 'access_closed' && !a.resolved).length,
    route_break: anomalies.filter(a => a.type === 'route_break' && !a.resolved).length,
    duplicate_inspection: anomalies.filter(a => a.type === 'duplicate_inspection' && !a.resolved).length,
  };

  const getTypeIcon = (type: AnomalyType) => {
    switch (type) {
      case 'access_closed': return Lock;
      case 'route_break': return Route;
      case 'duplicate_inspection': return Users;
    }
  };

  const getTypeConfig = (type: AnomalyType) => {
    const configs = {
      access_closed: {
        label: '门禁关闭',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-500',
        textColor: 'text-red-600',
        iconBg: 'bg-red-500',
      },
      route_break: {
        label: '路线断点',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-500',
        textColor: 'text-orange-600',
        iconBg: 'bg-orange-500',
      },
      duplicate_inspection: {
        label: '人员重复',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-500',
        textColor: 'text-yellow-600',
        iconBg: 'bg-yellow-500',
      },
    };
    return configs[type];
  };

  const getSourceInfo = (anomaly: Anomaly) => {
    const sources: string[] = [];
    anomaly.sourceIds.forEach((id, index) => {
      const type = anomaly.sourceTypes[index];
      if (type === 'building') {
        sources.push(`楼栋: ${getBuildingName(id, buildings)}`);
      } else if (type === 'work_order') {
        const wo = workOrders.find(w => w.id === id);
        if (wo) sources.push(`工单: ${wo.description}`);
      } else if (type === 'route_edge') {
        sources.push(`路线: ${id}`);
      }
    });
    return sources;
  };

  const getDetailsInfo = (anomaly: Anomaly) => {
    const details: string[] = [];
    const d = anomaly.details;
    
    if (d.lastOpenTime) details.push(`最后开启时间: ${d.lastOpenTime}`);
    if (d.affectedInspectors) {
      const names = (d.affectedInspectors as string[]).map(id => 
        inspectors.find(i => i.id === id)?.name || id
      );
      details.push(`影响巡检员: ${names.join(', ')}`);
    }
    if (d.fromBuilding && d.toBuilding) {
      details.push(`断点: ${getBuildingName(d.fromBuilding as string, buildings)} → ${getBuildingName(d.toBuilding as string, buildings)}`);
    }
    if (d.alternativeRoute) {
      const routeBuildings = (d.alternativeRoute as string).split('->').map(id => 
        getBuildingName(id, buildings)
      );
      details.push(`替代路线: ${routeBuildings.join(' → ')}`);
    }
    if (d.buildingId) {
      details.push(`重复楼栋: ${getBuildingName(d.buildingId as string, buildings)}`);
    }
    if (d.times) {
      details.push(`安排时间: ${(d.times as string[]).join(', ')}`);
    }
    
    return details;
  };

  const selectedAnomalyData = anomalies.find(a => a.id === selectedAnomaly);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">异常分析</h1>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AnomalyType | 'all')}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部异常</option>
            <option value="access_closed">门禁关闭</option>
            <option value="route_break">路线断点</option>
            <option value="duplicate_inspection">人员重复</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(['access_closed', 'route_break', 'duplicate_inspection'] as AnomalyType[]).map(type => {
          const Icon = getTypeIcon(type);
          const config = getTypeConfig(type);
          const count = typeStats[type];
          return (
            <div
              key={type}
              className={cn(
                'p-5 rounded-xl border-l-4 cursor-pointer transition-all duration-200 hover:shadow-lg',
                config.bgColor,
                config.borderColor,
                typeFilter === type && 'ring-2 ring-offset-2',
                typeFilter === type && type === 'access_closed' && 'ring-red-500',
                typeFilter === type && type === 'route_break' && 'ring-orange-500',
                typeFilter === type && type === 'duplicate_inspection' && 'ring-yellow-500'
              )}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn('text-sm font-medium', config.textColor)}>{config.label}</div>
                  <div className={cn('text-3xl font-bold mt-2', count > 0 ? 'animate-pulse' : '')}>
                    {count}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">处未处理异常</div>
                </div>
                <div className={cn('p-3 rounded-lg', config.iconBg)}>
                  <Icon size={28} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">异常列表</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredAnomalies.map(anomaly => {
              const Icon = getTypeIcon(anomaly.type);
              const config = getTypeConfig(anomaly.type);
              const sources = getSourceInfo(anomaly);
              
              return (
                <div
                  key={anomaly.id}
                  className={cn(
                    'p-4 hover:bg-slate-50 cursor-pointer transition-colors',
                    selectedAnomaly === anomaly.id && 'bg-blue-50',
                    anomaly.resolved && 'opacity-60'
                  )}
                  onClick={() => setSelectedAnomaly(anomaly.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg flex-shrink-0', config.iconBg)}>
                        <Icon size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{anomaly.description}</span>
                          {anomaly.resolved && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              已处理
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          检测时间: {anomaly.detectedAt}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sources.slice(0, 2).map((source, idx) => (
                            <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {source}
                            </span>
                          ))}
                          {sources.length > 2 && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              +{sources.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnomaly(anomaly.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="查看详情"
                      >
                        <Eye size={16} />
                      </button>
                      {!anomaly.resolved && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveAnomaly(anomaly.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="标记已处理"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredAnomalies.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                暂无异常
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">异常详情</h2>
          </div>
          
          {selectedAnomalyData ? (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-3 rounded-lg', getTypeConfig(selectedAnomalyData.type).iconBg)}>
                  {(() => {
                    const Icon = getTypeIcon(selectedAnomalyData.type);
                    return <Icon size={24} className="text-white" />;
                  })()}
                </div>
                <div>
                  <div className="font-medium text-slate-800">
                    {getTypeConfig(selectedAnomalyData.type).label}
                  </div>
                  <div className={cn(
                    'text-xs px-2 py-0.5 rounded inline-block mt-1',
                    selectedAnomalyData.level === 'high' ? 'bg-red-100 text-red-700' :
                    selectedAnomalyData.level === 'medium' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  )}>
                    {selectedAnomalyData.level === 'high' ? '高优先级' :
                     selectedAnomalyData.level === 'medium' ? '中优先级' : '低优先级'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">异常描述</div>
                <div className="text-sm text-slate-700">{selectedAnomalyData.description}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-2">详细信息</div>
                <div className="space-y-2">
                  {getDetailsInfo(selectedAnomalyData).map((detail, idx) => (
                    <div key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                      <ArrowRight size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500 mb-2 font-medium">数据溯源</div>
                <div className="space-y-2">
                  {getSourceInfo(selectedAnomalyData).map((source, idx) => (
                    <div key={idx} className="text-xs bg-slate-50 px-3 py-2 rounded text-slate-600">
                      ✓ {source}
                    </div>
                  ))}
                  <div className="text-xs text-slate-400 mt-2">
                    数据来源: 楼栋巡检图 + 排程中心 + 工单列表
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500 mb-1">检测时间</div>
                <div className="text-sm text-slate-700">{selectedAnomalyData.detectedAt}</div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <AlertTriangle size={48} className="mx-auto mb-3 text-slate-300" />
              <div>点击左侧异常查看详情</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
