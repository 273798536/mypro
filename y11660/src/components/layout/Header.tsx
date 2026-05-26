import { useState } from 'react';
import {
  Camera,
  Download,
  RefreshCw,
  FileSpreadsheet,
  FileJson,
  HelpCircle,
  Activity,
  Database,
} from 'lucide-react';
import { useAppStore, useAnomalyStats } from '@/store/useAppStore';
import { captureScreenshot, exportAnomalyReport, exportFullData } from '@/utils/export';

export const Header = () => {
  const { isLoading, loadMockData, dataPoints, annotations } = useAppStore();
  const stats = useAnomalyStats();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleScreenshot = async () => {
    try {
      await captureScreenshot('app-container', 'volatility-surface');
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  };

  const handleExportReport = (format: 'csv' | 'json') => {
    exportAnomalyReport(dataPoints, annotations, format);
    setShowExportMenu(false);
  };

  const handleExportData = (format: 'csv' | 'json') => {
    exportFullData(dataPoints, format);
    setShowExportMenu(false);
  };

  return (
    <header className="h-14 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              波动率曲面检查器
            </h1>
            <p className="text-xs text-slate-500">Volatility Surface Inspector</p>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-700" />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-slate-500" />
            <span className="text-sm text-slate-400">
              共 <span className="text-white font-medium">{stats.total}</span> 个数据点
            </span>
          </div>
          {stats.withAnomalies > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-950/50 border border-rose-800 rounded-full">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              <span className="text-sm text-rose-400 font-medium">
                {stats.withAnomalies} 个异常
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={loadMockData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-sm text-slate-300 transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          加载示例数据
        </button>

        <div className="h-6 w-px bg-slate-700" />

        <button
          onClick={handleScreenshot}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300 transition-colors"
          title="截图导出"
        >
          <Camera size={14} />
          截图
        </button>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-sm text-white font-medium transition-colors"
          >
            <Download size={14} />
            导出
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
              <div className="py-1">
                <button
                  onClick={() => handleExportReport('csv')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  <FileSpreadsheet size={14} className="text-green-400" />
                  异常报告 (CSV)
                </button>
                <button
                  onClick={() => handleExportReport('json')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  <FileJson size={14} className="text-blue-400" />
                  异常报告 (JSON)
                </button>
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => handleExportData('csv')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  <FileSpreadsheet size={14} className="text-amber-400" />
                  完整数据 (CSV)
                </button>
                <button
                  onClick={() => handleExportData('json')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  <FileJson size={14} className="text-purple-400" />
                  完整数据 (JSON)
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-700" />

        <button
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-300 transition-colors"
          title="帮助"
        >
          <HelpCircle size={18} />
        </button>
      </div>
    </header>
  );
};
