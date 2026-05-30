import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { exportToCSV, exportAllResults, exportAnalysisReport } from '@/utils/export';
import { Download, FileSpreadsheet, FileText, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DataExport() {
  const { analysisResult, analysisParams } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [exportedType, setExportedType] = useState<string | null>(null);

  if (!analysisResult) return null;

  const handleExport = (type: 'aligned' | 'correlation' | 'lag' | 'trend' | 'warnings') => {
    exportToCSV(analysisResult, analysisParams, type);
    setExportedType(type);
    setTimeout(() => setExportedType(null), 2000);
  };

  const handleExportAll = () => {
    exportAllResults(analysisResult, analysisParams);
    setExportedType('all');
    setTimeout(() => setExportedType(null), 2000);
  };

  const handleExportReport = () => {
    exportAnalysisReport(analysisResult, analysisParams);
    setExportedType('report');
    setTimeout(() => setExportedType(null), 2000);
  };

  const typeLabels: Record<string, string> = {
    aligned: '对齐后数据',
    correlation: '相关性矩阵',
    lag: '滞后分析结果',
    trend: '趋势分析结果',
    warnings: '警告信息',
    all: '全部数据',
    report: '分析报告'
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
        >
          <Download className="h-4 w-4" />
          导出全部
        </button>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            选择性导出
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </button>
          
          {isOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                <div className="p-2">
                  <p className="text-xs text-slate-500 px-2 py-1">导出 CSV 文件</p>
                  {(['aligned', 'correlation', 'lag', 'trend', 'warnings'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => handleExport(type)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors"
                    >
                      <span>{typeLabels[type]}</span>
                      {exportedType === type && (
                        <Check className="h-4 w-4 text-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-700 p-2">
                  <p className="text-xs text-slate-500 px-2 py-1">导出报告</p>
                  <button
                    onClick={handleExportReport}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      分析报告 (TXT)
                    </span>
                    {exportedType === 'report' && (
                      <Check className="h-4 w-4 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {exportedType && (
        <div className="absolute -bottom-8 left-0 text-xs text-emerald-400 flex items-center gap-1">
          <Check className="h-3 w-3" />
          {typeLabels[exportedType]} 已导出
        </div>
      )}
    </div>
  );
}
