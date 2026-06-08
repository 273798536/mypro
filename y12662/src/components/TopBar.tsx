import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Download,
  User,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function TopBar() {
  const navigate = useNavigate();
  const { batches, currentBatchId, setCurrentBatch, exportReport } =
    useAppStore();
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const currentBatch = batches.find((b) => b.id === currentBatchId);

  const handleExport = (
    onlyAnomalies: boolean,
    format: 'xlsx' | 'csv'
  ) => {
    const { blob, filename } = exportReport({ onlyAnomalies, format });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <header className="h-14 bg-marine-800/80 border-b border-marine-700/50 px-5 flex items-center justify-between backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowBatchMenu(!showBatchMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-marine-700/60 hover:bg-marine-700 border border-marine-600/50 rounded text-sm text-marine-100 transition-colors"
          >
            <span className="text-marine-400 text-xs mr-1">当前批次</span>
            <span className="font-medium">
              {currentBatch?.name || '未选择'}
            </span>
            <ChevronDown className="w-4 h-4 text-marine-400" />
          </button>
          {showBatchMenu && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-marine-800 border border-marine-600/50 rounded shadow-panel-lg z-50 overflow-hidden">
              {batches.length === 0 && (
                <div className="px-4 py-3 text-sm text-marine-400">
                  暂无运行批次
                </div>
              )}
              {batches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setCurrentBatch(b.id);
                    setShowBatchMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-marine-700 transition-colors ${
                    b.id === currentBatchId
                      ? 'bg-marine-700/70 text-white'
                      : 'text-marine-200'
                  }`}
                >
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-marine-400 mt-0.5">
                    {new Date(b.runAt).toLocaleString('zh-CN')} · {b.operator}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {currentBatch && (
          <div className="text-xs text-marine-400 hidden lg:block">
            运行时间：
            <span className="text-marine-200 font-mono ml-1">
              {new Date(currentBatch.runAt).toLocaleString('zh-CN')}
            </span>
            <span className="mx-2 text-marine-600">|</span>
            操作人：
            <span className="text-marine-200 ml-1">{currentBatch.operator}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-600/90 hover:bg-amber-600 text-white rounded text-sm font-medium transition-colors shadow-panel"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-marine-800 border border-marine-600/50 rounded shadow-panel-lg z-50 overflow-hidden">
              <button
                onClick={() => handleExport(false, 'xlsx')}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-marine-200 hover:bg-marine-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-400" />
                导出全部（Excel）
              </button>
              <button
                onClick={() => handleExport(true, 'xlsx')}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-marine-200 hover:bg-marine-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                仅异常（Excel）
              </button>
              <button
                onClick={() => handleExport(true, 'csv')}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-marine-200 hover:bg-marine-700 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                仅异常（CSV）
              </button>
            </div>
          )}
        </div>
        <div
          onClick={() => navigate('/audit')}
          className="flex items-center gap-2 px-3 py-1.5 bg-marine-700/60 hover:bg-marine-700 rounded text-sm text-marine-200 cursor-pointer transition-colors"
        >
          <User className="w-4 h-4" />
          当前工程师
        </div>
      </div>
    </header>
  );
}
