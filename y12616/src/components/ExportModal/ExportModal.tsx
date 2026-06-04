
import React, { useState } from 'react';
import { X, Download, FileJson, FileText, Copy, Check } from 'lucide-react';
import { usePathStore } from '../../store/usePathStore';
import { exportToJSON, exportToPDF, generateAuditReport } from '../../utils/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const paths = usePathStore((state) => state.paths);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    exportToJSON(paths);
    onClose();
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(paths, 'chessboard-svg');
      onClose();
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyReport = () => {
    const report = generateAuditReport(paths);
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalAnomalies = paths.reduce(
    (c, p) => c + p.nodes.reduce((cc, n) => cc + n.anomalies.length, 0),
    0
  );
  const unresolvedAnomalies = paths.reduce(
    (c, p) => c + p.nodes.reduce((cc, n) => cc + n.anomalies.filter((a) => !a.isFixed).length, 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Download size={18} className="text-orange-400" />
            导出审核报告
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-sm font-medium text-slate-200 mb-2">审核概览</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800/50 rounded p-2">
                <div className="text-xl font-bold text-orange-400">{paths.length}</div>
                <div className="text-[10px] text-slate-400">路径数量</div>
              </div>
              <div className="bg-slate-800/50 rounded p-2">
                <div className="text-xl font-bold text-red-400">{totalAnomalies}</div>
                <div className="text-[10px] text-slate-400">总异常</div>
              </div>
              <div className="bg-slate-800/50 rounded p-2">
                <div className="text-xl font-bold text-yellow-400">{unresolvedAnomalies}</div>
                <div className="text-[10px] text-slate-400">待处理</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-200">导出格式</div>

            <button
              onClick={handleExportJSON}
              disabled={isExporting}
              className="w-full flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <div className="p-2 bg-blue-500/20 rounded">
                <FileJson size={18} className="text-blue-400" />
              </div>
              <div className="text-left flex-1">
                <div className="text-sm font-medium text-white">JSON 数据文件</div>
                <div className="text-xs text-slate-400">包含完整路径和异常数据</div>
              </div>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="w-full flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <div className="p-2 bg-red-500/20 rounded">
                <FileText size={18} className="text-red-400" />
              </div>
              <div className="text-left flex-1">
                <div className="text-sm font-medium text-white">PDF 审核报告</div>
                <div className="text-xs text-slate-400">包含棋盘截图和异常汇总</div>
              </div>
              {isExporting && (
                <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              )}
            </button>

            <button
              onClick={handleCopyReport}
              disabled={isExporting}
              className="w-full flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <div className="p-2 bg-green-500/20 rounded">
                {copied ? (
                  <Check size={18} className="text-green-400" />
                ) : (
                  <Copy size={18} className="text-green-400" />
                )}
              </div>
              <div className="text-left flex-1">
                <div className="text-sm font-medium text-white">
                  {copied ? '已复制!' : '复制审核摘要'}
                </div>
                <div className="text-xs text-slate-400">复制 JSON 格式报告到剪贴板</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
