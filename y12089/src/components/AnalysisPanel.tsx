import {
  Eye,
  EyeOff,
  Layers,
  Camera,
  Maximize2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/store';
import { ViewMode, CameraMode, AnalysisResult, EvidenceLink } from '@/types';

interface AnalysisPanelProps {
  result: AnalysisResult;
  onExportScreenshot: () => void;
  onEnterDemo: () => void;
}

export function AnalysisPanel({
  result,
  onExportScreenshot,
  onEnterDemo
}: AnalysisPanelProps) {
  const {
    analysisState,
    setShowContactPoints,
    setShowMalocclusions,
    setShowGrindingAreas,
    setShowAnnotations,
    setViewMode,
    setCameraMode,
    setSelectedItemId
  } = useAppStore();

  const [expandedSections, setExpandedSections] = useState({
    view: true,
    contacts: true,
    malocclusions: true,
    grinding: true,
    evidence: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const viewModes: { label: string; value: ViewMode }[] = [
    { label: '组合视图', value: 'combined' },
    { label: '仅上颌', value: 'upper' },
    { label: '仅下颌', value: 'lower' },
    { label: '分离视图', value: 'exploded' }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'text-yellow-500 bg-yellow-500/10';
      case 'moderate': return 'text-orange-500 bg-orange-500/10';
      case 'severe': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'mild': return '轻度';
      case 'moderate': return '中度';
      case 'severe': return '重度';
      default: return severity;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-900 border-l border-gray-700">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">分析控制</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onExportScreenshot}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
              title="导出截图"
            >
              <Download size={16} />
            </button>
            <button
              onClick={onEnterDemo}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              title="演示模式"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {result.isComplexCase && (
          <div className="p-3 rounded-lg bg-purple-900/30 border border-purple-500/30">
            <div className="flex items-start gap-2">
              <Zap className="text-purple-400 shrink-0 mt-0.5" size={16} />
              <div>
                <div className="text-sm font-medium text-purple-300">复杂病例检测</div>
                <div className="text-xs text-purple-400 mt-1">
                  检测到错位与磨改重叠区域，已启用冲突分离算法
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 rounded-lg bg-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">置信度</span>
            <span className={`text-sm font-bold ${
              result.confidence >= 90 ? 'text-green-400' :
              result.confidence >= 75 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {result.confidence}%
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                result.confidence >= 90 ? 'bg-green-500' :
                result.confidence >= 75 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${result.confidence}%` }}
            />
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <button
            onClick={() => toggleSection('view')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-white">视图控制</span>
            </div>
            {expandedSections.view ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </button>
          
          {expandedSections.view && (
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-2">显示模式</div>
                <div className="grid grid-cols-2 gap-2">
                  {viewModes.map(mode => (
                    <button
                      key={mode.value}
                      onClick={() => setViewMode(mode.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        analysisState.viewMode === mode.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">相机模式</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCameraMode('orthographic')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      analysisState.cameraMode === 'orthographic'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    正交视图
                  </button>
                  <button
                    onClick={() => setCameraMode('perspective')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      analysisState.cameraMode === 'perspective'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    透视视图
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4">
          <button
            onClick={() => toggleSection('contacts')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              {analysisState.showContactPoints ? (
                <Eye size={16} className="text-green-400" />
              ) : (
                <EyeOff size={16} className="text-gray-500" />
              )}
              <span className="text-sm font-medium text-white">
                接触点 ({result.contactPoints.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowContactPoints(!analysisState.showContactPoints);
                }}
                className="p-1 rounded hover:bg-gray-700"
              >
                {analysisState.showContactPoints ? (
                  <Eye size={14} className="text-gray-400" />
                ) : (
                  <EyeOff size={14} className="text-gray-500" />
                )}
              </button>
              {expandedSections.contacts ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </div>
          </button>

          {expandedSections.contacts && (
            <div className="mt-3 space-y-2">
              {result.contactPoints.map(cp => (
                <button
                  key={cp.id}
                  onClick={() => setSelectedItemId(cp.id)}
                  className={`w-full p-2 rounded-lg text-left transition-colors ${
                    analysisState.selectedItemId === cp.id
                      ? 'bg-gray-700 ring-1 ring-blue-500'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: cp.type === 'normal' ? '#36B37E' :
                                            cp.type === 'misaligned' ? '#F53F3F' :
                                            cp.type === 'grinding' ? '#FF7D00' :
                                            '#722ED1'
                        }}
                      />
                      <span className="text-xs text-gray-300">
                        {cp.jaw === 'upper' ? '上颌' : '下颌'}牙{cp.toothNumber}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {cp.type === 'normal' ? '正常' :
                       cp.type === 'misaligned' ? '错位' :
                       cp.type === 'grinding' ? '磨改' : '冲突'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4">
          <button
            onClick={() => toggleSection('malocclusions')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className={result.malocclusions.length > 0 ? 'text-red-400' : 'text-gray-500'} />
              <span className="text-sm font-medium text-white">
                错位检测 ({result.malocclusions.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMalocclusions(!analysisState.showMalocclusions);
                }}
                className="p-1 rounded hover:bg-gray-700"
              >
                {analysisState.showMalocclusions ? (
                  <Eye size={14} className="text-gray-400" />
                ) : (
                  <EyeOff size={14} className="text-gray-500" />
                )}
              </button>
              {expandedSections.malocclusions ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </div>
          </button>

          {expandedSections.malocclusions && result.malocclusions.length > 0 && (
            <div className="mt-3 space-y-2">
              {result.malocclusions.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedItemId(m.id)}
                  className={`w-full p-2 rounded-lg text-left transition-colors ${
                    analysisState.selectedItemId === m.id
                      ? 'bg-gray-700 ring-1 ring-red-500'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-200">
                      {m.type === 'horizontal' ? '水平错位' :
                       m.type === 'vertical' ? '垂直错位' : '旋转错位'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(m.severity)}`}>
                      {getSeverityLabel(m.severity)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    位移 {m.distance}mm · 涉及 {m.affectedTeeth.length} 颗牙
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4">
          <button
            onClick={() => toggleSection('grinding')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              {result.grindingAreas.some(g => g.isExcessive) ? (
                <AlertTriangle size={16} className="text-orange-400" />
              ) : (
                <CheckCircle2 size={16} className="text-green-400" />
              )}
              <span className="text-sm font-medium text-white">
                磨改分析 ({result.grindingAreas.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGrindingAreas(!analysisState.showGrindingAreas);
                }}
                className="p-1 rounded hover:bg-gray-700"
              >
                {analysisState.showGrindingAreas ? (
                  <Eye size={14} className="text-gray-400" />
                ) : (
                  <EyeOff size={14} className="text-gray-500" />
                )}
              </button>
              {expandedSections.grinding ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </div>
          </button>

          {expandedSections.grinding && result.grindingAreas.length > 0 && (
            <div className="mt-3 space-y-2">
              {result.grindingAreas.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedItemId(g.id)}
                  className={`w-full p-2 rounded-lg text-left transition-colors ${
                    analysisState.selectedItemId === g.id
                      ? 'bg-gray-700 ring-1 ring-orange-500'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-200">
                      牙{g.toothNumber}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      g.isExcessive 
                        ? 'text-red-400 bg-red-500/10' 
                        : 'text-green-400 bg-green-500/10'
                    }`}>
                      {g.isExcessive ? '过量' : '正常'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    深度 {g.depth}mm · 面积 {g.area.toFixed(1)}mm²
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4 pb-4">
          <button
            onClick={() => toggleSection('evidence')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-white">
                证据溯源 ({result.evidenceLinks.length})
              </span>
            </div>
            {expandedSections.evidence ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </button>

          {expandedSections.evidence && (
            <div className="mt-3 space-y-2">
              {result.evidenceLinks.map(ev => (
                <div
                  key={ev.id}
                  className="p-2 rounded-lg bg-gray-800 border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-blue-400">
                      {ev.sourceType === 'model' ? '模型数据' :
                       ev.sourceType === 'report' ? '接触报告' : '就诊记录'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {ev.sourceFile}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {ev.sourceLocation}
                  </div>
                  <div className="text-xs text-gray-300 bg-gray-900/50 p-2 rounded">
                    "{ev.sourceContent}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
