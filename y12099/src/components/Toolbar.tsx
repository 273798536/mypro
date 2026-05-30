import { useState } from 'react';
import {
  Filter,
  Camera,
  PlayCircle,
  RotateCcw,
  Save,
  Trash2,
  Eye,
  Zap,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { ShadowSeverity, ShadowCause, Season, CameraView } from '../data/types';
import { runFullDiagnostic } from '../engine/diagnosticService';
import { summarizeIssues } from '../engine/diagnosticService';

interface ToolbarProps {
  currentCameraPosition: [number, number, number];
  currentCameraTarget: [number, number, number];
  onRestoreView: (view: CameraView) => void;
}

const SEVERITY_OPTIONS: { value: ShadowSeverity | 'all'; label: string }[] = [
  { value: 'all', label: '全部严重度' },
  { value: 'critical', label: '严重' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const CAUSE_OPTIONS: { value: ShadowCause | 'all'; label: string }[] = [
  { value: 'all', label: '全部原因' },
  { value: 'obstacle', label: '障碍物' },
  { value: 'self', label: '自遮挡' },
  { value: 'azimuth', label: '方位角' },
];

const SEASON_OPTIONS: { value: Season | 'all'; label: string }[] = [
  { value: 'all', label: '全部季节' },
  { value: 'spring', label: '春季' },
  { value: 'summer', label: '夏季' },
  { value: 'autumn', label: '秋季' },
  { value: 'winter', label: '冬季' },
];

export function Toolbar({
  currentCameraPosition,
  currentCameraTarget,
  onRestoreView,
}: ToolbarProps) {
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const savedViews = useAppStore((s) => s.savedViews);
  const saveView = useAppStore((s) => s.saveView);
  const deleteView = useAppStore((s) => s.deleteView);
  const roof = useAppStore((s) => s.roof);
  const panels = useAppStore((s) => s.panels);
  const obstacles = useAppStore((s) => s.obstacles);
  const setDiagnosticResult = useAppStore((s) => s.setDiagnosticResult);
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);
  const setIsAnalyzing = useAppStore((s) => s.setIsAnalyzing);
  const diagnosticResult = useAppStore((s) => s.diagnosticResult);

  const handleRunAnalysis = async () => {
    if (!roof || !panels.length || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const result = await runFullDiagnostic(roof, panels, obstacles);
      setDiagnosticResult(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    saveView(newViewName.trim(), currentCameraPosition, currentCameraTarget);
    setNewViewName('');
    setShowViewMenu(false);
  };

  const summary = diagnosticResult ? summarizeIssues(diagnosticResult) : null;

  return (
    <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        <span className="text-slate-100 font-semibold text-sm tracking-wide">太阳能阵列阴影台</span>
        {roof && (
          <span className="text-slate-500 text-xs font-mono">
            {roof.id} | 倾角{roof.tilt}° | 方位角{roof.azimuth}°
          </span>
        )}
      </div>

      <div className="h-6 w-px bg-slate-700" />

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={filters.severity}
          onChange={(e) => setFilters({ severity: e.target.value as ShadowSeverity | 'all' })}
          className="bg-slate-800 text-slate-200 text-xs px-2 py-1 border border-slate-600 rounded-none focus:outline-none focus:border-blue-500 font-mono"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.cause}
          onChange={(e) => setFilters({ cause: e.target.value as ShadowCause | 'all' })}
          className="bg-slate-800 text-slate-200 text-xs px-2 py-1 border border-slate-600 rounded-none focus:outline-none focus:border-blue-500 font-mono"
        >
          {CAUSE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.season}
          onChange={(e) => setFilters({ season: e.target.value as Season | 'all' })}
          className="bg-slate-800 text-slate-200 text-xs px-2 py-1 border border-slate-600 rounded-none focus:outline-none focus:border-blue-500 font-mono"
        >
          {SEASON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={resetFilters}
          className="text-slate-400 hover:text-slate-200 p-1 transition-colors"
          title="重置筛选"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="h-6 w-px bg-slate-700" />

      <div className="relative">
        <button
          onClick={() => setShowViewMenu(!showViewMenu)}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 border border-slate-600 rounded-none transition-colors"
        >
          <Camera className="w-4 h-4" />
          <span>视角</span>
          <span className="text-slate-500">({savedViews.length})</span>
        </button>

        {showViewMenu && (
          <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 shadow-xl z-50 min-w-56">
            <div className="p-2 border-b border-slate-700">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="输入视角名称"
                  className="flex-1 bg-slate-900 text-slate-200 text-xs px-2 py-1 border border-slate-600 rounded-none focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSaveView}
                  disabled={!newViewName.trim() || isSaving}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs px-2 py-1 rounded-none transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {savedViews.length === 0 ? (
                <div className="p-3 text-slate-500 text-xs text-center">暂无保存的视角</div>
              ) : (
                savedViews.map((view) => (
                  <div
                    key={view.id}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-700 group"
                  >
                    <button
                      onClick={() => onRestoreView(view)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-200 text-xs">{view.name}</span>
                    </button>
                    <button
                      onClick={() => deleteView(view.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {summary && (
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">阴影:</span>
            <span className="text-red-400 font-mono font-semibold">{summary.shadowIssues}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">方位角:</span>
            <span className="text-orange-400 font-mono font-semibold">{summary.azimuthIssues}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">季节:</span>
            <span className="text-cyan-400 font-mono font-semibold">{summary.seasonIssues}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">损失:</span>
            <span className="text-yellow-400 font-mono font-semibold">{summary.totalLossKwh}kWh</span>
          </div>
        </div>
      )}

      <button
        onClick={handleRunAnalysis}
        disabled={!roof || isAnalyzing}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs px-4 py-2 rounded-none transition-colors font-medium"
      >
        {isAnalyzing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <PlayCircle className="w-4 h-4" />
        )}
        {diagnosticResult ? '重新分析' : '开始阴影分析'}
      </button>
    </div>
  );
}
