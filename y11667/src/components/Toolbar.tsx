import { useState } from 'react';
import { Camera, Download, FileText, History, Database, ChevronDown } from 'lucide-react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { STATUS_COLORS, STATUS_LABELS } from '@/data/warehouseConfig';
import { exportScreenshot, exportReceiptsCSV, exportHistoryCSV, generateSandboxReport, downloadTextFile } from '@/utils/exportUtils';

interface ToolbarProps {
  onOpenHistory: () => void;
}

export function Toolbar({ onOpenHistory }: ToolbarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { receipts, slots, alerts, addHistory, dataVersion } = useWarehouseStore();

  const handleExportScreenshot = async () => {
    try {
      await exportScreenshot('sandbox-container', `sandbox-${Date.now()}.png`);
      addHistory({
        operationType: 'export',
        operator: '当前用户',
        description: '导出沙盘截图',
      });
    } catch (e) {
      console.error('导出截图失败', e);
    }
    setShowExportMenu(false);
  };

  const handleExportReceipts = () => {
    exportReceiptsCSV(receipts, slots, `receipts-${Date.now()}.csv`);
    addHistory({
      operationType: 'export',
      operator: '当前用户',
      description: '导出仓单数据CSV',
    });
    setShowExportMenu(false);
  };

  const handleExportReport = () => {
    const report = generateSandboxReport(receipts, slots, alerts);
    downloadTextFile(report, `sandbox-report-${Date.now()}.txt`);
    addHistory({
      operationType: 'export',
      operator: '当前用户',
      description: '导出沙盘报告',
    });
    setShowExportMenu(false);
  };

  const handleExportHistory = () => {
    const { history } = useWarehouseStore.getState();
    exportHistoryCSV(history, `history-${Date.now()}.csv`);
    addHistory({
      operationType: 'export',
      operator: '当前用户',
      description: '导出操作历史',
    });
    setShowExportMenu(false);
  };

  return (
    <div className="h-14 bg-slate-900/95 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-400" />
          <h1 className="text-white font-bold text-lg">期货仓单库容沙盘</h1>
        </div>
        <div className="h-6 w-px bg-slate-700" />
        <div className="flex items-center gap-4">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-400">
                {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-500 mr-2">
          数据版本：{dataVersion}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/50 rounded text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
            <ChevronDown className="w-3 h-3" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <button
                onClick={handleExportScreenshot}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
                沙盘截图
              </button>
              <button
                onClick={handleExportReceipts}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                仓单数据CSV
              </button>
              <button
                onClick={handleExportReport}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                沙盘报告
              </button>
              <button
                onClick={handleExportHistory}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <History className="w-4 h-4" />
                操作历史CSV
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onOpenHistory}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 rounded text-sm font-medium transition-colors"
        >
          <History className="w-4 h-4" />
          历史记录
        </button>
      </div>
    </div>
  );
}
