import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  TrendingDown,
  Zap,
  Target,
  Clock,
} from 'lucide-react';
import { COLORS } from '../physics';
import { exportReport, exportToJSON, exportToCSV, copyReportToClipboard } from '../utils/export';
import type { SimulationMetrics, SimulationParams, TrajectoryPoint, Warning } from '../physics';

interface ReportPanelProps {
  params: SimulationParams;
  metrics: SimulationMetrics | null;
  noDragTrajectory: TrajectoryPoint[];
  withDragTrajectory: TrajectoryPoint[];
  warnings: Warning[];
  showNoDrag: boolean;
  showWithDrag: boolean;
  onToggleNoDrag: () => void;
  onToggleWithDrag: () => void;
}

export const ReportPanel: React.FC<ReportPanelProps> = ({
  params,
  metrics,
  noDragTrajectory,
  withDragTrajectory,
  warnings,
  showNoDrag,
  showWithDrag,
  onToggleNoDrag,
  onToggleWithDrag,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'data'>('metrics');

  const handleCopy = async () => {
    if (!metrics) return;
    const success = await copyReportToClipboard({ params, metrics, warnings });
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportReport = () => {
    if (!metrics) return;
    exportReport({ params, metrics, warnings });
  };

  const handleExportJSON = () => {
    if (!metrics) return;
    exportToJSON({ params, metrics, noDragTrajectory, withDragTrajectory, warnings });
  };

  const handleExportCSV = () => {
    exportToCSV(noDragTrajectory, withDragTrajectory);
  };

  if (!metrics) {
    return (
      <div className="bg-gray-800/50 backdrop-blur rounded-xl p-5 border border-gray-700 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">数据报告</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>运行模拟后显示数据报告</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl p-5 border border-gray-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">数据报告</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="复制报告"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleExportReport}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="导出文本报告"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            activeTab === 'metrics'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          指标对比
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            activeTab === 'data' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          导出数据
        </button>
      </div>

      {activeTab === 'metrics' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="flex gap-2 mb-4">
            <button
              onClick={onToggleNoDrag}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
                showNoDrag
                  ? 'bg-green-600/20 border border-green-500/50 text-green-400'
                  : 'bg-gray-700/50 text-gray-500'
              }`}
            >
              {showNoDrag ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              无阻力
            </button>
            <button
              onClick={onToggleWithDrag}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
                showWithDrag
                  ? 'bg-amber-600/20 border border-amber-500/50 text-amber-400'
                  : 'bg-gray-700/50 text-gray-500'
              }`}
            >
              {showWithDrag ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              有阻力
            </button>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">射程对比</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.noDrag }} />
                  <span className="text-sm text-gray-400">无阻力</span>
                </div>
                <span className="text-white font-mono">{metrics.noDragLanding.x.toFixed(2)}m</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.withDrag }} />
                  <span className="text-sm text-gray-400">有阻力</span>
                </div>
                <span className="text-white font-mono">{metrics.withDragLanding.x.toFixed(2)}m</span>
              </div>
              <div className="pt-2 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">射程误差</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {metrics.landingError.toFixed(2)}m
                    <span className="text-xs text-gray-500 ml-1">
                      ({((metrics.landingError / metrics.noDragLanding.x) * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">最大高度</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">无阻力</span>
                <span className="text-white font-mono">{metrics.maxHeight.noDrag.toFixed(2)}m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">有阻力</span>
                <span className="text-white font-mono">{metrics.maxHeight.withDrag.toFixed(2)}m</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-gray-300">飞行时间</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">无阻力</span>
                <span className="text-white font-mono">{metrics.timeOfFlight.noDrag.toFixed(2)}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">有阻力</span>
                <span className="text-white font-mono">{metrics.timeOfFlight.withDrag.toFixed(2)}s</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-gray-300">靶处垂直误差</span>
            </div>
            <div className="text-center py-2">
              <span className="text-2xl font-bold text-amber-400 font-mono">
                {metrics.verticalErrorAtTarget.toFixed(3)}m
              </span>
              {metrics.isExtrapolated && (
                <p className="text-xs text-amber-500 mt-1">※ 包含外推数据</p>
              )}
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-400 mb-2">⚠ 计算警告 ({warnings.length})</p>
              {warnings.slice(0, 3).map((w, i) => (
                <p key={i} className="text-xs text-amber-300/80 mb-1">
                  • {w.message}
                </p>
              ))}
              {warnings.length > 3 && (
                <p className="text-xs text-amber-300/60">还有 {warnings.length - 3} 条警告...</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'data' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <p className="text-sm text-gray-400 mb-4">选择导出格式下载轨迹数据：</p>

          <button
            onClick={handleExportJSON}
            className="w-full p-4 bg-gray-900/50 hover:bg-gray-700/50 rounded-lg text-left transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                <span className="text-blue-400 font-bold text-sm">JSON</span>
              </div>
              <div>
                <p className="text-white font-medium">完整数据导出</p>
                <p className="text-xs text-gray-500">包含参数、指标和轨迹采样数据</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleExportCSV}
            className="w-full p-4 bg-gray-900/50 hover:bg-gray-700/50 rounded-lg text-left transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
                <span className="text-green-400 font-bold text-sm">CSV</span>
              </div>
              <div>
                <p className="text-white font-medium">轨迹点数据</p>
                <p className="text-xs text-gray-500">可导入 Excel 进行分析</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleExportReport}
            className="w-full p-4 bg-gray-900/50 hover:bg-gray-700/50 rounded-lg text-left transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center group-hover:bg-purple-600/30 transition-colors">
                <span className="text-purple-400 font-bold text-sm">TXT</span>
              </div>
              <div>
                <p className="text-white font-medium">文本报告</p>
                <p className="text-xs text-gray-500">格式化的对比报告</p>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
