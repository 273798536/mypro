import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Waterfall3D from './components/Waterfall3D';
import ControlPanel from './components/ControlPanel';
import AnomalyList from './components/AnomalyList';
import FrameDetail from './components/FrameDetail';
import SegmentList from './components/SegmentList';
import { 
  AudioSegment, 
  ValidationResult, 
  HighlightPoint, 
  AnomalyType, 
  AnomalySeverity
} from './types';
import { validateSegment, filterAnomaliesByType, filterAnomaliesBySeverity } from './utils/validation';
import { generateSampleSegmentWithAnomalies, generateCleanSampleSegment, getHighlightPointsFromAnomalies } from './data/sampleData';

const App: React.FC = () => {
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'split'>('3d');
  const [filters, setFilters] = useState<{
    showAnomalies: boolean;
    showValidFrames: boolean;
    anomalyTypes: AnomalyType[];
    severityLevels: AnomalySeverity[];
  }>({
    showAnomalies: true,
    showValidFrames: true,
    anomalyTypes: [],
    severityLevels: []
  });

  useEffect(() => {
    const sampleSegments = [
      generateSampleSegmentWithAnomalies(),
      generateCleanSampleSegment(),
      generateSampleSegmentWithAnomalies()
    ];
    
    setSegments(sampleSegments);
    setActiveSegmentId(sampleSegments[0].id);

    const results = new Map<string, ValidationResult>();
    sampleSegments.forEach(segment => {
      results.set(segment.id, validateSegment(segment));
    });
    setValidationResults(results);
  }, []);

  const activeSegment = useMemo(() => {
    return segments.find(s => s.id === activeSegmentId) || null;
  }, [segments, activeSegmentId]);

  const activeValidation = useMemo(() => {
    if (!activeSegmentId) return null;
    return validationResults.get(activeSegmentId) || null;
  }, [activeSegmentId, validationResults]);

  const filteredAnomalies = useMemo(() => {
    if (!activeValidation) return [];
    
    let result = activeValidation.anomalies;
    
    if (filters.anomalyTypes.length > 0) {
      result = filterAnomaliesByType(result, filters.anomalyTypes);
    }
    
    if (filters.severityLevels.length > 0) {
      result = filterAnomaliesBySeverity(result, filters.severityLevels);
    }
    
    return result;
  }, [activeValidation, filters]);

  const highlights = useMemo<HighlightPoint[]>(() => {
    if (!filters.showAnomalies || filteredAnomalies.length === 0) return [];
    return getHighlightPointsFromAnomalies(filteredAnomalies);
  }, [filteredAnomalies, filters.showAnomalies]);

  const selectedFrameData = useMemo(() => {
    if (!activeSegment || selectedFrame === null) return null;
    return activeSegment.frames[selectedFrame] || null;
  }, [activeSegment, selectedFrame]);

  const handleFrameSelect = useCallback((frameIndex: number, _frequencyIndex?: number) => {
    setSelectedFrame(frameIndex);
  }, []);

  const handleAnomalySelect = useCallback((anomalyId: string) => {
    setSelectedAnomalyId(anomalyId);
    
    const anomaly = filteredAnomalies.find(a => a.id === anomalyId);
    if (anomaly && anomaly.frameIndex !== undefined) {
      setSelectedFrame(anomaly.frameIndex);
    }
  }, [filteredAnomalies]);

  const handleFocusAnomaly = useCallback((anomalyId: string) => {
    const anomaly = filteredAnomalies.find(a => a.id === anomalyId);
    if (anomaly && anomaly.frameIndex !== undefined) {
      setSelectedFrame(anomaly.frameIndex);
      setSelectedAnomalyId(anomalyId);
    }
  }, [filteredAnomalies]);

  const handleSegmentSelect = useCallback((segmentId: string) => {
    setActiveSegmentId(segmentId);
    setSelectedFrame(null);
    setSelectedAnomalyId(null);
  }, []);

  const handleResetView = useCallback(() => {
    setSelectedFrame(null);
    setSelectedAnomalyId(null);
  }, []);

  const handleExportData = useCallback(() => {
    if (!activeSegment || !activeValidation) return;

    const report = {
      segment: {
        name: activeSegment.name,
        sourceFile: activeSegment.sourceFile,
        duration: activeSegment.duration,
        frameCount: activeSegment.frames.length
      },
      validation: {
        totalFrames: activeValidation.totalFrames,
        validFrames: activeValidation.validFrames,
        isRejected: activeValidation.isRejected,
        rejectionReasons: activeValidation.rejectionReasons,
        anomalies: activeValidation.anomalies.map(a => ({
          type: a.type,
          severity: a.severity,
          message: a.message,
          suggestion: a.suggestion
        }))
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSegment.name}_validation_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeSegment, activeValidation]);

  const handleUpload = useCallback(() => {
    alert('文件上传功能演示 - 在实际应用中会打开文件选择器');
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-900 via-spectrum-low to-gray-900">
      <header className="h-14 bg-spectrum-mid/80 backdrop-blur-sm border-b border-gray-700/50 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">音乐频谱瀑布图台</h1>
            <p className="text-xs text-gray-400">3D交互式频谱分析工作台</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {activeValidation && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">有效帧:</span>
                <span className={`font-mono font-bold ${
                  activeValidation.validFrames / activeValidation.totalFrames > 0.8 
                    ? 'text-green-400' 
                    : 'text-yellow-400'
                }`}>
                  {activeValidation.validFrames}/{activeValidation.totalFrames}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">异常:</span>
                <span className={`font-mono font-bold ${
                  activeValidation.anomalies.length === 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {activeValidation.anomalies.length}
                </span>
              </div>
              {activeValidation.isRejected && (
                <span className="px-2 py-1 bg-red-600/30 text-red-400 text-xs rounded border border-red-500/50">
                  ⚠️ 已拒收
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 bg-gray-900/50 border-r border-gray-700/50 p-4 flex flex-col gap-4 overflow-y-auto">
          <SegmentList
            segments={segments}
            activeSegmentId={activeSegmentId}
            validationResults={validationResults}
            onSelectSegment={handleSegmentSelect}
            onUpload={handleUpload}
          />
          
          <ControlPanel
            filters={filters}
            onFilterChange={setFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onResetView={handleResetView}
            onExportData={handleExportData}
          />

          {selectedFrameData && (
            <FrameDetail
              frame={selectedFrameData}
              anomalies={activeValidation?.anomalies || []}
              onClose={() => setSelectedFrame(null)}
            />
          )}
        </aside>

        <main className="flex-1 relative">
          {activeSegment ? (
            <Waterfall3D
              segment={activeSegment}
              highlights={highlights}
              anomalies={filteredAnomalies}
              onFrameSelect={handleFrameSelect}
              onAnomalySelect={handleAnomalySelect}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-lg">选择一个音频片段开始分析</p>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span>时间轴 (X)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>振幅 (Y)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span>频率 (Z)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">|</span>
              <span>🖱️ 左键拖拽旋转 · 滚轮缩放</span>
            </div>
          </div>
        </main>

        <aside className="w-80 bg-gray-900/50 border-l border-gray-700/50 p-4">
          <AnomalyList
            anomalies={filteredAnomalies}
            selectedAnomalyId={selectedAnomalyId}
            onSelectAnomaly={handleAnomalySelect}
            onFocusAnomaly={handleFocusAnomaly}
          />
        </aside>
      </div>

      <footer className="h-8 bg-spectrum-mid/80 backdrop-blur-sm border-t border-gray-700/50 flex items-center px-6 text-xs text-gray-500">
        <span>音乐频谱瀑布图台 v1.0</span>
        <span className="mx-2">|</span>
        <span>支持批量音频处理 · 异常检测 · 3D可视化</span>
        <span className="ml-auto">
          {activeSegment ? `当前: ${activeSegment.name}` : '未选择片段'}
        </span>
      </footer>
    </div>
  );
};

export default App;
