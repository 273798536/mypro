import { useState } from 'react';
import { ChevronDown, ChevronUp, Sun, Cloud, AlertTriangle } from 'lucide-react';
import { useAppStore, useCurrentBuilding, useBuildingAnalysis } from '@/store/useAppStore';
import { formatTime } from '@/utils/shadowDetector';

export function ApartmentTable() {
  const { selectedFloor, setSelectedFloor } = useAppStore();
  const currentBuilding = useCurrentBuilding();
  const buildingAnalysis = currentBuilding 
    ? useBuildingAnalysis(currentBuilding.id) 
    : [];
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredApartments = selectedFloor !== null
    ? currentBuilding?.apartments.filter(a => a.floor === selectedFloor) || []
    : currentBuilding?.apartments || [];

  if (!currentBuilding) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <div className="text-4xl mb-2">🏠</div>
        <p className="text-sm">选择建筑后查看住户明细</p>
      </div>
    );
  }

  const getStatusColor = (hours: number, needsReview: boolean) => {
    if (needsReview) return 'text-dawn-gold';
    if (hours >= 2) return 'text-mint-green';
    if (hours >= 1) return 'text-dawn-gold';
    return 'text-coral-red';
  };

  const getStatusIcon = (hours: number, needsReview: boolean) => {
    if (needsReview) return <AlertTriangle className="w-3.5 h-3.5" />;
    if (hours >= 2) return <Sun className="w-3.5 h-3.5" />;
    return <Cloud className="w-3.5 h-3.5" />;
  };

  const getStatusText = (hours: number, needsReview: boolean) => {
    if (needsReview) return '需复核';
    if (hours >= 2) return '达标';
    if (hours >= 1) return '偏低';
    return '不足';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-200">
          {currentBuilding.name} · 住户明细
        </h4>
        {selectedFloor !== null && (
          <button
            onClick={() => setSelectedFloor(null)}
            className="text-xs text-sun-orange hover:underline"
          >
            显示全部
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-ocean-light z-10">
            <tr className="text-left text-slate-400">
              <th className="py-2 px-2 font-medium">房号</th>
              <th className="py-2 px-2 font-medium">楼层</th>
              <th className="py-2 px-2 font-medium">朝向</th>
              <th className="py-2 px-2 font-medium text-right">日照</th>
              <th className="py-2 px-2 font-medium text-center">状态</th>
              <th className="py-2 px-1 w-6"></th>
            </tr>
          </thead>
          <tbody>
            {filteredApartments.map((apt) => {
              const analysis = buildingAnalysis.find(a => a.apartmentId === apt.id);
              const isExpanded = expandedRows.has(apt.id);
              const sunlightHours = analysis?.totalSunlightHours || 0;
              const needsReview = analysis?.needsReview || false;

              return (
                <>
                  <tr
                    key={apt.id}
                    className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                      needsReview ? 'bg-dawn-gold/10' : ''
                    }`}
                    onClick={() => toggleRow(apt.id)}
                  >
                    <td className="py-2 px-2 font-mono text-slate-200">{apt.unitNumber}</td>
                    <td className="py-2 px-2 text-slate-400">{apt.floor}F</td>
                    <td className="py-2 px-2 text-slate-400">{apt.orientation}</td>
                    <td className={`py-2 px-2 text-right font-semibold ${getStatusColor(sunlightHours, needsReview)}`}>
                      {sunlightHours.toFixed(1)}h
                    </td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                        needsReview 
                          ? 'bg-dawn-gold/20 text-dawn-gold' 
                          : sunlightHours >= 2 
                            ? 'bg-mint-green/20 text-mint-green'
                            : 'bg-coral-red/20 text-coral-red'
                      }`}>
                        {getStatusIcon(sunlightHours, needsReview)}
                        {getStatusText(sunlightHours, needsReview)}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </td>
                  </tr>
                  {isExpanded && analysis && (
                    <tr className="bg-white/5">
                      <td colSpan={6} className="p-3">
                        <div className="space-y-2">
                          {analysis.issues.length > 0 && (
                            <div className="text-xs text-dawn-gold">
                              <span className="font-medium">⚠️ 问题：</span>
                              {analysis.issues.join('；')}
                            </div>
                          )}
                          
                          <div className="text-xs text-slate-400">
                            <span className="font-medium text-slate-300">遮挡时段：</span>
                            {analysis.shadowPeriods.length > 0 ? (
                              <span className="space-x-2">
                                {analysis.shadowPeriods.map((period, idx) => (
                                  <span key={idx} className="inline-block bg-slate-700/50 px-2 py-0.5 rounded">
                                    {formatTime(period.start)} - {formatTime(period.end)}
                                    {period.reason && ` (${period.reason})`}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className="text-mint-green">全天无遮挡</span>
                            )}
                          </div>

                          <div className="flex gap-1 mt-2">
                            {Array.from({ length: 13 }, (_, i) => 6 + i).map((hour) => {
                              const inShadow = analysis.shadowPeriods.some(
                                p => hour >= p.start && hour < p.end
                              );
                              return (
                                <div
                                  key={hour}
                                  className={`flex-1 h-6 rounded-sm ${
                                    inShadow ? 'bg-slate-600' : 'bg-gradient-to-b from-sun-orange to-dawn-gold'
                                  }`}
                                  title={`${hour}:00 - ${inShadow ? '被遮挡' : '有日照'}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-mint-green/10 rounded-lg p-2">
            <div className="text-lg font-semibold text-mint-green">
              {buildingAnalysis.filter(a => a.totalSunlightHours >= 2).length}
            </div>
            <div className="text-xs text-slate-400">达标</div>
          </div>
          <div className="bg-dawn-gold/10 rounded-lg p-2">
            <div className="text-lg font-semibold text-dawn-gold">
              {buildingAnalysis.filter(a => a.needsReview).length}
            </div>
            <div className="text-xs text-slate-400">需复核</div>
          </div>
          <div className="bg-coral-red/10 rounded-lg p-2">
            <div className="text-lg font-semibold text-coral-red">
              {buildingAnalysis.filter(a => a.totalSunlightHours < 2 && !a.needsReview).length}
            </div>
            <div className="text-xs text-slate-400">不达标</div>
          </div>
        </div>
      </div>
    </div>
  );
}
