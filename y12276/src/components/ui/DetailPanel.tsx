import { useAppStore } from '@/store/useAppStore';
import { musicians } from '@/data/mockMusicians';
import { equipmentBoxes } from '@/data/mockEquipment';
import { cables } from '@/data/mockCables';
import { routes } from '@/data/mockRoutes';
import { stageData } from '@/data/mockStage';
import { getAllConflicts } from '@/utils/conflictDetection';
import {
  formatTime,
  formatTimestamp,
  getDataSourceLabel,
  getDataSourcePriority,
  getConflictTypeLabel,
  getSeverityLabel,
  getSeverityColor,
} from '@/utils/humanizer';
import { X, Music, Speaker, Cable, MapPin, Box, Camera, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const objectIcons = {
  musician: Music,
  equipment: Speaker,
  cable: Cable,
  route: MapPin,
  stage: Box,
};

const sourcePriorityLabels: Record<number, string> = {
  1: '最高优先级',
  2: '中等优先级',
  3: '参考优先级',
};

export function DetailPanel() {
  const { selectedObjectId, showDetailPanel, setShowDetailPanel, setSelectedObjectId, screenshots, currentTime } = useAppStore();
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');
  const allConflicts = getAllConflicts();

  if (!showDetailPanel || !selectedObjectId) return null;

  const selectedObject =
    musicians.find((m) => m.id === selectedObjectId) ||
    equipmentBoxes.find((e) => e.id === selectedObjectId) ||
    cables.find((c) => c.id === selectedObjectId) ||
    routes.find((r) => r.id === selectedObjectId) ||
    (stageData.id === selectedObjectId ? stageData : null);

  const relatedConflicts = allConflicts.filter((c) => c.objectIds.includes(selectedObjectId));
  const relatedScreenshots = screenshots.filter((s) => s.objectIds.includes(selectedObjectId));

  if (!selectedObject) return null;

  const Icon = objectIcons[selectedObject.type as keyof typeof objectIcons] || Box;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getPositionReports = () => {
    if (selectedObject.type === 'musician') {
      return (selectedObject as typeof musicians[0]).positionReports || [];
    }
    return [];
  };

  const positionReports = getPositionReports();

  const allSources = [
    { id: 'main_model', name: '舞台主模型', data: selectedObject.position, confidence: 1.0 },
    ...positionReports.map((pr) => ({
      id: pr.source,
      name: getDataSourceLabel(pr.source),
      data: pr.position,
      confidence: pr.confidence,
    })),
  ];

  return (
    <div className="w-96 h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 flex flex-col animate-slide-in-right">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: selectedObject.color + '40', boxShadow: `0 0 20px ${selectedObject.color}30` }}
          >
            <Icon size={20} style={{ color: selectedObject.color }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{selectedObject.name}</h2>
            <p className="text-xs text-slate-500">
              {selectedObject.type === 'musician' && (selectedObject as typeof musicians[0]).role}
              {selectedObject.type === 'equipment' && (selectedObject as typeof equipmentBoxes[0]).equipmentType}
              {selectedObject.type === 'cable' && (selectedObject as typeof cables[0]).cableType}
              {selectedObject.type === 'route' && '走位路线'}
              {selectedObject.type === 'stage' && '主舞台'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowDetailPanel(false);
            setSelectedObjectId(null);
          }}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('basic')}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="text-sm font-bold text-slate-300 tracking-wider uppercase">基本信息</h3>
            {expandedSection === 'basic' ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </button>
          {expandedSection === 'basic' && (
            <div className="bg-slate-800/40 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">对象ID</span>
                <span className="text-slate-300 font-mono text-xs">{selectedObject.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">类型</span>
                <span className="text-slate-300">{selectedObject.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">位置</span>
                <span className="text-slate-300 font-mono text-xs">
                  ({selectedObject.position.map((n) => n.toFixed(2)).join(', ')})
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">当前时间</span>
                <span className="text-emerald-400 font-mono">{formatTime(currentTime)}</span>
              </div>
              {selectedObject.type === 'equipment' && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">型号</span>
                  <span className="text-slate-300 text-xs">{(selectedObject as typeof equipmentBoxes[0]).model}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {positionReports.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('sources')}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-sm font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-500" />
                三源数据比对
              </h3>
              {expandedSection === 'sources' ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>
            {expandedSection === 'sources' && (
              <div className="space-y-2">
                {allSources
                  .sort((a, b) => getDataSourcePriority(a.id) - getDataSourcePriority(b.id))
                  .map((source, index) => {
                    const priority = getDataSourcePriority(source.id);
                    const isMatch = index === 0 ||
                      Math.abs(source.data[0] - allSources[0].data[0]) < 0.5 &&
                      Math.abs(source.data[2] - allSources[0].data[2]) < 0.5;

                    return (
                      <div
                        key={source.id}
                        className={`p-3 rounded-lg border-l-4 ${
                          isMatch ? 'bg-slate-800/40 border-emerald-500' : 'bg-red-900/20 border-red-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">{source.name}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              priority === 1 ? 'bg-cyan-900/50 text-cyan-300' :
                              priority === 2 ? 'bg-purple-900/50 text-purple-300' :
                              'bg-slate-700/50 text-slate-300'
                            }`}
                          >
                            {sourcePriorityLabels[priority]}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mb-1">
                          位置: ({source.data.map((n) => n.toFixed(2)).join(', ')})
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${source.confidence * 100}%`,
                                backgroundColor: isMatch ? '#10b981' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">
                            {(source.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        {!isMatch && index > 0 && (
                          <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            与主模型数据不一致，已留痕
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {relatedConflicts.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('conflicts')}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-sm font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                关联冲突 ({relatedConflicts.length})
              </h3>
              {expandedSection === 'conflicts' ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>
            {expandedSection === 'conflicts' && (
              <div className="space-y-2">
                {relatedConflicts
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .map((conflict) => {
                    const color = getSeverityColor(conflict.severity);
                    return (
                      <div
                        key={conflict.id}
                        className="p-3 rounded-lg bg-slate-800/40 border-l-4"
                        style={{ borderLeftColor: color }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold" style={{ color }}>
                            {getConflictTypeLabel(conflict.type)}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {formatTime(conflict.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 mb-2">{conflict.humanReadableDesc}</p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              conflict.severity === 'critical' ? 'bg-red-900/50 text-red-300' :
                              conflict.severity === 'warning' ? 'bg-yellow-900/50 text-yellow-300' :
                              'bg-blue-900/50 text-blue-300'
                            }`}
                          >
                            {getSeverityLabel(conflict.severity)}
                          </span>
                          {conflict.traceRecords.length > 0 && (
                            <span className="text-xs text-slate-500">
                              {conflict.traceRecords.length}条留痕
                            </span>
                          )}
                        </div>
                        {conflict.traceRecords.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1">
                            {conflict.traceRecords
                              .sort((a, b) => a.timestamp - b.timestamp)
                              .map((trace) => (
                                <div key={trace.id} className="text-xs text-slate-500">
                                  <span className="text-cyan-400">[{getDataSourceLabel(trace.source)}]</span>
                                  <span className="ml-1">{trace.action}</span>
                                  <p className="text-[10px] text-slate-600">{trace.note}</p>
                                  <p className="text-[10px] text-slate-700">{formatTimestamp(trace.timestamp)}</p>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {relatedScreenshots.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('screenshots')}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-sm font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
                <Camera size={14} className="text-emerald-500" />
                关联截图 ({relatedScreenshots.length})
              </h3>
              {expandedSection === 'screenshots' ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>
            {expandedSection === 'screenshots' && (
              <div className="grid grid-cols-2 gap-2">
                {relatedScreenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    className="relative rounded-lg overflow-hidden border border-slate-700/50"
                  >
                    <img
                      src={screenshot.dataUrl}
                      alt={screenshot.description}
                      className="w-full h-20 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                      <p className="text-[10px] text-white truncate">{screenshot.description}</p>
                      <p className="text-[9px] text-slate-400 font-mono">
                        {new Date(screenshot.timestamp).toLocaleTimeString('zh-CN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={() => toggleSection('export')}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="text-sm font-bold text-slate-300 tracking-wider uppercase">导出关联</h3>
            {expandedSection === 'export' ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </button>
          {expandedSection === 'export' && (
            <div className="bg-slate-800/40 rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">舞台模型</span>
                <span className="text-emerald-400">stage_main_v1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">乐手位置</span>
                <span className="text-cyan-400">
                  {positionReports.length > 0 ? `${positionReports.length}条上报` : '默认位置'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">关联截图</span>
                <span className="text-yellow-400">{relatedScreenshots.length}张</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">关联冲突</span>
                <span className="text-red-400">{relatedConflicts.length}个</span>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-700/50">
                <p className="text-slate-400 text-[10px]">
                  以上对应关系已保存在详情中，导出报告时将自动包含完整数据链路。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
