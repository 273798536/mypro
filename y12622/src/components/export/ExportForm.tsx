import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, FileText, Download, Filter, Eye, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Severity, ExportFilters, ExportRow } from '../../types';
import { SEVERITY_LABELS } from '../../types';
import { exportToExcel, exportToHTML, generateExportSummary } from '../../utils/exportFormatter';

export function ExportForm() {
  const equipment = useAppStore((state) => state.equipment);
  const getExportData = useAppStore((state) => state.getExportData);

  const [filters, setFilters] = useState<ExportFilters>({
    severity: [],
  });
  const [format, setFormat] = useState<'excel' | 'html'>('excel');
  const [previewData, setPreviewData] = useState<ExportRow[] | null>(null);

  const exportData = useMemo(() => {
    return getExportData(filters);
  }, [filters, getExportData]);

  const summary = useMemo(() => {
    return generateExportSummary(exportData);
  }, [exportData]);

  const handleSeverityToggle = (severity: Severity) => {
    setFilters((prev) => {
      const current = prev.severity || [];
      const newSeverity = current.includes(severity)
        ? current.filter((s) => s !== severity)
        : [...current, severity];
      return { ...prev, severity: newSeverity };
    });
  };

  const handleExport = () => {
    if (exportData.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    if (format === 'excel') {
      exportToExcel(exportData, '显微图像异常报告');
    } else {
      exportToHTML(exportData, filters, summary, '显微图像异常报告');
    }
  };

  const handlePreview = () => {
    setPreviewData(exportData);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 font-serif mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          导出筛选条件
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              时间范围 - 开始
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              时间范围 - 结束
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              关联设备
            </label>
            <select
              value={filters.equipmentId || ''}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, equipmentId: e.target.value || undefined }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">全部设备</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              严重程度
            </label>
            <div className="flex flex-wrap gap-2">
              {(['low', 'medium', 'high', 'critical'] as Severity[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSeverityToggle(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.severity?.includes(s)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {SEVERITY_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">导出格式</h4>
        <div className="flex gap-3">
          <button
            onClick={() => setFormat('excel')}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
              format === 'excel'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
          >
            <FileSpreadsheet className="w-6 h-6" />
            <div className="text-left">
              <p className="font-medium">Excel 格式</p>
              <p className="text-xs opacity-70">适合数据处理和分析</p>
            </div>
          </button>

          <button
            onClick={() => setFormat('html')}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
              format === 'html'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
          >
            <FileText className="w-6 h-6" />
            <div className="text-left">
              <p className="font-medium">HTML 报告</p>
              <p className="text-xs opacity-70">适合打印和分享阅读</p>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <strong>提示：</strong>导出文件中的"异常原因"已自动转换为通俗语言，
          方便不懂技术的人员阅读。所有数据均来自同一处理记录，确保一致性。
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          符合条件的数据：<strong className="text-gray-900">{exportData.length}</strong> 条
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            预览
          </button>
          <button
            onClick={handleExport}
            disabled={exportData.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>

      {previewData && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 font-serif">数据预览</h3>
            <button
              onClick={() => setPreviewData(null)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-700">设备名称</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">严重程度</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">异常原因（通俗说明）</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">处理意见</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">追溯编号</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">{row['设备名称']}</td>
                    <td className="px-3 py-2">{row['严重程度']}</td>
                    <td className="px-3 py-2 bg-amber-50">{row['异常原因（通俗说明）']}</td>
                    <td className="px-3 py-2">{row['处理意见']}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row['追溯编号']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            预览显示关键列，完整导出包含全部 12 列数据
          </p>
        </div>
      )}
    </div>
  );
}
