import { Download, FileText, FileJson, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useCalibrationStore } from '../../store/useCalibrationStore';
import { ExportFormat } from '../../types';
import { generateSummary } from '../../utils/export';

export const ExportPanel = () => {
  const { records, phase, exportData } = useCalibrationStore();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const summary = records.length > 0 ? generateSummary(records, phase) : null;

  const handleExport = (format: ExportFormat) => {
    setExporting(format);
    setTimeout(() => {
      exportData(format);
      setExporting(null);
    }, 500);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 rounded-lg">
          <Download className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">结果导出</h3>
          <p className="text-sm text-gray-500">导出完整校准报告</p>
        </div>
      </div>

      {summary && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">总记录数</span>
              <span className="font-mono font-medium">{summary.totalRecords}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">已校准</span>
              <span className="font-mono font-medium text-green-600">{summary.calibratedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">异常记录</span>
              <span className="font-mono font-medium text-red-600">{summary.anomalyCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">平均误差</span>
              <span className="font-mono font-medium">{summary.averageError.toFixed(2)}%</span>
            </div>
            {phase === 'phase2' && (
              <div className="flex justify-between col-span-2">
                <span className="text-gray-500">材质影响记录</span>
                <span className="font-mono font-medium text-yellow-600">{summary.recordsAffectedByMaterial}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={() => handleExport('csv')}
          disabled={records.length === 0 || exporting !== null}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
            records.length === 0 || exporting
              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-gray-200 hover:border-[#3E92CC] hover:bg-[#3E92CC]/5 text-gray-700'
          }`}
        >
          <div className="flex items-center gap-3">
            {exporting === 'csv' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            <div className="text-left">
              <p className="font-medium">CSV 格式</p>
              <p className="text-xs text-gray-500">适用于 Excel 等表格软件</p>
            </div>
          </div>
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleExport('json')}
          disabled={records.length === 0 || exporting !== null}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
            records.length === 0 || exporting
              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-gray-200 hover:border-[#3E92CC] hover:bg-[#3E92CC]/5 text-gray-700'
          }`}
        >
          <div className="flex items-center gap-3">
            {exporting === 'json' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <FileJson className="w-5 h-5" />
            )}
            <div className="text-left">
              <p className="font-medium">JSON 格式</p>
              <p className="text-xs text-gray-500">包含完整校准轨迹和异常信息</p>
            </div>
          </div>
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
