import { useState, useEffect, useRef } from 'react';
import { Download, Camera, FileSpreadsheet, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { api } from '@/utils/api';
import { useStore } from '@/store/useStore';
import type { DeliveryRecord, FilterCriteria, ExportOptions } from '@shared/types';
import { getStatusLabel, getSourceLabel, generateFilterNote, downloadBlob } from '@/utils/helpers';

export default function ExportPage() {
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [filterNote, setFilterNote] = useState('');
  const screenshotRef = useRef<HTMLDivElement>(null);

  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);
  const filters = useStore((state) => state.filters);
  const exportOptions = useStore((state) => state.exportOptions);
  const setExportOptions = useStore((state) => state.setExportOptions);
  const setFilters = useStore((state) => state.setFilters);
  const resetFilters = useStore((state) => state.resetFilters);
  const setGlobalRecords = useStore((state) => state.setRecords);

  useEffect(() => {
    loadPreview();
  }, [filters]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const result = await api.export.preview(filters);
      setRecords(result.records);
      setFilterNote(result.filterNote);
      setExportOptions({ filterNote: result.filterNote });
      setGlobalRecords(result.records);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const blob = await api.export.excel(filters, exportOptions);
      const fileName = `菜场卸货公示清单_${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadBlob(blob, fileName);
      setExportSuccess(`Excel文件已导出：${fileName}`);
      setTimeout(() => setExportSuccess(null), 5000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleScreenshot = async () => {
    if (!screenshotRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(screenshotRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob | null>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('截图生成失败'));
        }, 'image/png');
      });

      if (blob) {
        const fileName = `菜场卸货公示清单_截图_${new Date().toISOString().split('T')[0]}.png`;
        downloadBlob(blob, fileName);
        setExportSuccess(`截图已保存：${fileName}`);
        setTimeout(() => setExportSuccess(null), 5000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const activeFiltersCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-semibold text-gray-800 mb-2">导出交付</h2>
        <p className="text-gray-600">
          生成带筛选口径说明的截图和完整数据文件，可直接用于沟通
        </p>
      </div>

      {exportSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-fade-in-up">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-800">{exportSuccess}</span>
        </div>
      )}

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="w-80 flex-shrink-0 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary-500" />
              导出设置
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">筛选条件</label>
                <div className="space-y-2 text-sm">
                  {activeFiltersCount > 0 ? (
                    <>
                      {filters.status && (
                        <div className="flex items-center justify-between p-2 bg-primary-50 rounded">
                          <span className="text-gray-600">状态</span>
                          <span className="text-gray-800">{getStatusLabel(filters.status).label}</span>
                        </div>
                      )}
                      {filters.source && (
                        <div className="flex items-center justify-between p-2 bg-primary-50 rounded">
                          <span className="text-gray-600">来源</span>
                          <span className="text-gray-800">{getSourceLabel(filters.source)}</span>
                        </div>
                      )}
                      {filters.searchText && (
                        <div className="flex items-center justify-between p-2 bg-primary-50 rounded">
                          <span className="text-gray-600">关键词</span>
                          <span className="text-gray-800">{filters.searchText}</span>
                        </div>
                      )}
                      {filters.goodsType && (
                        <div className="flex items-center justify-between p-2 bg-primary-50 rounded">
                          <span className="text-gray-600">货物类型</span>
                          <span className="text-gray-800">{filters.goodsType}</span>
                        </div>
                      )}
                      {filters.hasIssues && (
                        <div className="flex items-center justify-between p-2 bg-warning-50 rounded">
                          <span className="text-gray-600">仅显示有问题</span>
                          <AlertCircle className="w-4 h-4 text-warning-500" />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-center py-2">无筛选条件（导出全部）</p>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setFilters({ status: 'cleaned' });
                    }}
                    className="flex-1 px-3 py-1.5 text-xs text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors"
                  >
                    仅已清洗
                  </button>
                  <button
                    onClick={resetFilters}
                    className="flex-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    重置筛选
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">导出选项</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeRawData}
                      onChange={(e) => setExportOptions({ includeRawData: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">包含原始数据列</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeIssues}
                      onChange={(e) => setExportOptions({ includeIssues: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">包含数据问题说明</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeHistory}
                      onChange={(e) => setExportOptions({ includeHistory: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">包含修改历史记录</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">筛选口径说明</label>
                <textarea
                  value={exportOptions.filterNote}
                  onChange={(e) => setExportOptions({ filterNote: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  rows={4}
                  placeholder="此说明将附加在截图和Excel的筛选说明页中..."
                />
                <button
                  onClick={() => setExportOptions({ filterNote })}
                  className="mt-2 text-xs text-primary-600 hover:text-primary-700"
                >
                  ← 使用自动生成的说明
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-primary-500" />
              导出生成
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleExportExcel}
                disabled={exporting || records.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-5 h-5" />
                导出 Excel 文件
              </button>
              <button
                onClick={handleScreenshot}
                disabled={exporting || records.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-warning-500 text-white rounded-md hover:bg-warning-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-5 h-5" />
                生成沟通截图
              </button>
              <button
                onClick={loadPreview}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                刷新预览
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              当前预览共 {records.length} 条记录
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">导出预览</h3>
                <p className="text-sm text-gray-500 mt-1">
                  以下内容将被导出到Excel或截图中
                </p>
              </div>
              <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                {records.length} 条记录
              </span>
            </div>

            <div ref={screenshotRef} className="p-6">
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-serif font-semibold text-gray-800 text-lg mb-2">
                  菜场卸货公示清单
                </h4>
                <p className="text-xs text-gray-500">
                  {exportOptions.filterNote}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left font-medium text-gray-600 border border-gray-300 whitespace-nowrap">记录编号</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 border border-gray-300 whitespace-nowrap">菜场名称</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 border border-gray-300 whitespace-nowrap">卸货地点</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 border border-gray-300 whitespace-nowrap">卸货时间</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 border border-gray-300 whitespace-nowrap">车牌号</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 border border-gray-300 whitespace-nowrap">货物类型</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 border border-gray-300 whitespace-nowrap">状态</th>
                      {exportOptions.includeIssues && (
                        <th className="px-3 py-2 text-left font-medium text-gray-600 border border-gray-300 whitespace-nowrap">问题说明</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, idx) => {
                      const statusInfo = getStatusLabel(record.status);
                      const hasIssues = record.issues.some((i) => !i.resolved);
                      return (
                        <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 border border-gray-300 font-mono text-xs">{record.recordId}</td>
                          <td className="px-3 py-2 border border-gray-300">{record.marketName}</td>
                          <td className="px-3 py-2 border border-gray-300">{record.location}</td>
                          <td className="px-3 py-2 border border-gray-300 whitespace-nowrap">{record.deliveryTime || '-'}</td>
                          <td className="px-3 py-2 border border-gray-300">{record.truckNumber || '-'}</td>
                          <td className="px-3 py-2 border border-gray-300">{record.goodsType || '-'}</td>
                          <td className="px-3 py-2 border border-gray-300">
                            <span className={`px-2 py-0.5 text-xs border rounded ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          {exportOptions.includeIssues && (
                            <td className="px-3 py-2 border border-gray-300">
                              {hasIssues ? (
                                <span className="text-warning-600 text-xs">
                                  {record.issues.filter(i => !i.resolved).length}个问题待处理
                                </span>
                              ) : (
                                <span className="text-green-600 text-xs">正常</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={exportOptions.includeIssues ? 8 : 7} className="px-4 py-8 text-center text-gray-500 border border-gray-300">
                          暂无符合条件的记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400 text-right">
                  导出时间：{new Date().toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
