import React, { useState } from 'react';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { generateReportData, exportReportAsText, exportReportAsPDF, downloadTextFile } from '../utils/exportReport';

interface ReportModalProps {
  onBack: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ onBack }) => {
  const { state } = useGameStore();
  const [exporting, setExporting] = useState<'pdf' | 'text' | null>(null);

  const reportData = generateReportData(state);
  const reportText = exportReportAsText(reportData);

  const handleExportText = () => {
    setExporting('text');
    setTimeout(() => {
      downloadTextFile(reportText, `农田灌溉报告_${new Date().toISOString().slice(0, 10)}.txt`);
      setExporting(null);
    }, 500);
  };

  const handleExportPDF = () => {
    setExporting('pdf');
    setTimeout(() => {
      exportReportAsPDF(reportData);
      setExporting(null);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-green-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              返回结果
            </button>
            <h2 className="text-2xl font-bold">灌溉报告</h2>
            <div className="w-20" />
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-b flex gap-3">
          <button
            onClick={handleExportText}
            disabled={exporting !== null}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-all"
          >
            <FileText size={18} />
            {exporting === 'text' ? '导出中...' : '导出TXT'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting !== null}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-all"
          >
            <Download size={18} />
            {exporting === 'pdf' ? '导出中...' : '导出PDF'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-50 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap">
            {reportText}
          </div>
        </div>

        <div className="p-4 bg-amber-50 border-t border-amber-200">
          <p className="text-xs text-amber-800">
            📝 修正痕迹说明：本系统保留所有操作记录和异常事件，可通过回放功能查看完整处理链。
            所有计算结果均标注数据来源和算法模型，便于教学分析和错误追溯。
          </p>
        </div>
      </div>
    </div>
  );
};
