import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { FarmMap } from '../components/FarmMap';
import { StatusBadge } from '../components/StatusBadge';
import { generateMockMapData } from '../data/mockMapData';
import { generateMockTideData } from '../data/mockTideData';
import { generateMockWaterData } from '../data/mockWaterData';
import { MapPoint, MapZone } from '../types/task';
import { DataStatus } from '../types/common';
import { Map, Layers, Info, ChevronRight, FileText, Droplets, Waves, AlertTriangle } from 'lucide-react';

export const MapPanelPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [mapZones, setMapZones] = useState<MapZone[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'tide' | 'water' | 'risk'>('all');

  useEffect(() => {
    if (!taskId) return;

    const mapData = generateMockMapData(taskId);
    setMapZones(mapData.zones);

    const tideRecords = generateMockTideData(taskId);
    const waterRecords = generateMockWaterData(taskId);

    const pointsWithData = mapData.points.map(point => {
      const pointTideRecords = tideRecords.filter(r => r.pointId === point.id);
      const pointWaterRecords = waterRecords.filter(r => r.pointId === point.id);

      const worstTideStatus = pointTideRecords.length > 0
        ? pointTideRecords.reduce((worst, r) => {
            const priority: Record<DataStatus, number> = {
              [DataStatus.RECOLLECT]: 4,
              [DataStatus.NEED_REVIEW]: 3,
              [DataStatus.PENDING]: 2,
              [DataStatus.AVAILABLE]: 1,
            };
            return priority[r.status] > priority[worst] ? r.status : worst;
          }, DataStatus.AVAILABLE)
        : undefined;

      const worstWaterStatus = pointWaterRecords.length > 0
        ? pointWaterRecords.reduce((worst, r) => {
            const priority: Record<DataStatus, number> = {
              [DataStatus.RECOLLECT]: 4,
              [DataStatus.NEED_REVIEW]: 3,
              [DataStatus.PENDING]: 2,
              [DataStatus.AVAILABLE]: 1,
            };
            return priority[r.overallStatus] > priority[worst] ? r.overallStatus : worst;
          }, DataStatus.AVAILABLE)
        : undefined;

      const allStatuses = [worstTideStatus, worstWaterStatus].filter(Boolean) as DataStatus[];
      const worstStatus = allStatuses.length > 0
        ? allStatuses.reduce((worst, s) => {
            const priority: Record<DataStatus, number> = {
              [DataStatus.RECOLLECT]: 4,
              [DataStatus.NEED_REVIEW]: 3,
              [DataStatus.PENDING]: 2,
              [DataStatus.AVAILABLE]: 1,
            };
            return priority[s] > priority[worst] ? s : worst;
          })
        : undefined;

      const avgSalinity = pointWaterRecords.length > 0
        ? pointWaterRecords.reduce((sum, r) => sum + (r.salinity || 0), 0) / pointWaterRecords.length
        : undefined;

      const avgDO = pointWaterRecords.length > 0
        ? pointWaterRecords.reduce((sum, r) => sum + (r.dissolvedOxygen || 0), 0) / pointWaterRecords.length
        : undefined;

      const avgPH = pointWaterRecords.length > 0
        ? pointWaterRecords.reduce((sum, r) => sum + (r.ph || 0), 0) / pointWaterRecords.length
        : undefined;

      const tideCount = pointTideRecords.length;
      const waterCount = pointWaterRecords.length;
      const totalRecords = tideCount + waterCount;
      const issueCount = pointTideRecords.filter(r => r.status !== DataStatus.AVAILABLE).length +
                        pointWaterRecords.filter(r => r.overallStatus !== DataStatus.AVAILABLE).length;
      const qualityScore = totalRecords > 0 ? Math.round(((totalRecords - issueCount) / totalRecords) * 100) : 100;

      return {
        ...point,
        worstStatus,
        salinity: avgSalinity,
        dissolvedOxygen: avgDO,
        ph: avgPH,
        dataQuality: qualityScore,
        recordCount: totalRecords,
        issueCount,
      };
    });

    setMapPoints(pointsWithData);
  }, []);

  const handlePointClick = (point: MapPoint) => {
    setSelectedPoint(point);
  };

  const layerButtons = [
    { id: 'all' as const, label: '全部', icon: Layers },
    { id: 'tide' as const, label: '潮汐', icon: Waves },
    { id: 'water' as const, label: '水质', icon: Droplets },
    { id: 'risk' as const, label: '风险', icon: AlertTriangle },
  ];

  return (
    <AppLayout
      title="地图面板"
      subtitle="明珠海珍品 · 2026年6月巡检 · 空间数据联动"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(`/tasks/${taskId}/review`)}
            className="text-slate-500 hover:text-ocean-600 transition-colors text-sm flex items-center gap-1"
          >
            ← 返回复核工作台
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 text-sm">地图面板</span>
        </div>

        <div className="bg-gradient-to-r from-ocean-900 to-ocean-800 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Map className="w-6 h-6 text-tide-400" />
                <span className="text-tide-400 text-sm font-medium">地图联动</span>
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">
                明珠海珍品养殖场 · 监测点位分布
              </h2>
              <p className="text-ocean-200 max-w-2xl leading-relaxed">
                点击地图上的监测点位查看详细数据。颜色代表该点位的数据质量状态，
                绿色表示数据可用，黄色表示暂缓使用，橙色表示需场长复核，红色表示建议重新采集。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4 mt-6">
            {['A1', 'A2', 'A3', 'B1', 'C1'].map((zone, index) => {
              const zonePoints = mapPoints.filter(p => p.id.startsWith(zone.charAt(0)));
              const avgQuality = zonePoints.length > 0
                ? Math.round(zonePoints.reduce((sum, p) => sum + (p.dataQuality || 0), 0) / zonePoints.length)
                : 0;
              const worstPoint = zonePoints.length > 0
                ? zonePoints.reduce((worst, p) => (p.dataQuality || 0) < (worst.dataQuality || 100) ? p : worst)
                : null;

              return (
                <div key={zone} className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="text-sm text-ocean-300 mb-1">{zone}区</div>
                  <div className="text-2xl font-bold text-white mb-1">{avgQuality}</div>
                  <div className="text-xs text-ocean-300">平均质量分</div>
                  {worstPoint && worstPoint.dataQuality !== undefined && worstPoint.dataQuality < 80 && (
                    <div className="mt-2 text-xs text-status-pending">
                      ⚠️ 点位{worstPoint.id}质量较低
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">图层：</span>
            <div className="flex bg-slate-100 rounded-lg p-1">
              {layerButtons.map((btn) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.id}
                    onClick={() => setActiveLayer(btn.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeLayer === btn.id
                        ? 'bg-white text-ocean-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-status-available" />
              <span className="text-slate-500">可用</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-status-pending" />
              <span className="text-slate-500">暂缓</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-status-review" />
              <span className="text-slate-500">需复核</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-status-recollect" />
              <span className="text-slate-500">需重采</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 h-[600px]">
            <FarmMap
              points={mapPoints}
              zones={mapZones}
              onPointClick={handlePointClick}
              selectedPointId={selectedPoint?.id}
            />
          </div>

          <div className="space-y-4">
            {selectedPoint ? (
              <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-display font-semibold text-slate-900">
                      点位 {selectedPoint.id}
                    </h3>
                    <p className="text-sm text-slate-500">{selectedPoint.zone}</p>
                  </div>
                  {selectedPoint.worstStatus && (
                    <StatusBadge status={selectedPoint.worstStatus} size="sm" />
                  )}
                </div>

                {selectedPoint.description && (
                  <p className="text-sm text-slate-600 mb-4">{selectedPoint.description}</p>
                )}

                <div className="space-y-3">
                  {selectedPoint.dataQuality !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">数据质量</span>
                      <span
                        className="font-mono font-bold text-lg"
                        style={{
                          color: selectedPoint.dataQuality >= 80 ? '#2DD4BF' :
                                 selectedPoint.dataQuality >= 60 ? '#F59E0B' : '#EF4444'
                        }}
                      >
                        {selectedPoint.dataQuality}/100
                      </span>
                    </div>
                  )}
                  {selectedPoint.recordCount !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">记录总数</span>
                      <span className="font-mono">{selectedPoint.recordCount} 条</span>
                    </div>
                  )}
                  {selectedPoint.issueCount !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">异常记录</span>
                      <span className={`font-mono ${selectedPoint.issueCount > 0 ? 'text-status-recollect' : 'text-status-available'}`}>
                        {selectedPoint.issueCount} 条
                      </span>
                    </div>
                  )}
                  {selectedPoint.salinity !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">平均盐度</span>
                      <span className="font-mono">{selectedPoint.salinity.toFixed(1)} PSU</span>
                    </div>
                  )}
                  {selectedPoint.dissolvedOxygen !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">平均溶解氧</span>
                      <span className={`font-mono ${selectedPoint.dissolvedOxygen < 5 ? 'text-status-recollect' : ''}`}>
                        {selectedPoint.dissolvedOxygen.toFixed(1)} mg/L
                      </span>
                    </div>
                  )}
                  {selectedPoint.ph !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">平均pH</span>
                      <span className={`font-mono ${selectedPoint.ph < 7.5 || selectedPoint.ph > 8.5 ? 'text-status-review' : ''}`}>
                        {selectedPoint.ph.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    关联数据溯源
                  </h4>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-ocean-50 text-sm text-ocean-700 flex items-center justify-between group">
                      <span>潮汐记录</span>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-ocean-50 text-sm text-ocean-700 flex items-center justify-between group">
                      <span>水质记录</span>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-ocean-50 text-sm text-ocean-700 flex items-center justify-between group">
                      <span>风险评估</span>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">点击地图上的点位查看详情</p>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-ocean-500" />
                点位说明
              </h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p>• <strong>A区（近岸）</strong>：靠近岸边，水深较浅，受潮汐影响较大</p>
                <p>• <strong>B区（深水）</strong>：远离岸边，水深较深，水质相对稳定</p>
                <p>• <strong>C区（进水渠）</strong>：进水口区域，需重点关注水质变化</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            onClick={() => navigate(`/tasks/${taskId}/export`)}
            className="flex items-center gap-2 px-6 py-2.5 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-all shadow-sm hover:shadow-md"
          >
            下一步：结果导出
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </AppLayout>
  );
};
