import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Search, Eye, Copy, Check, File, FileX } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { exportToExcel, exportToCSV } from '@/services/exporter';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDate, formatFileSize } from '@/utils/format';
import type { ExportRecord } from '@/types';

const exportTypeLabels = {
  renewal: '续费清单',
  deduction: '临停抵扣明细',
  discount: '优惠使用记录',
  full: '完整数据包',
};

const formatLabels = {
  xlsx: 'Excel',
  csv: 'CSV',
  pdf: 'PDF',
};

export function ExportPage() {
  const { exportRecords, renewalRecords, addExportRecord } = useDataStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    type: 'renewal' as ExportRecord['exportType'],
    format: 'xlsx' as ExportRecord['format'],
    includeTraceCode: true,
    includeBadRows: false,
  });
  const [copiedTraceCode, setCopiedTraceCode] = useState<string | null>(null);

  const filteredExports = exportRecords.filter(record => {
    const matchesSearch = !searchTerm || 
      record.traceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || record.exportType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleExport = async () => {
    if (!user) return;

    const recordCount = renewalRecords.length;
    const fileSize = recordCount * 1024 + Math.random() * 50000;

    if (exportConfig.format === 'xlsx') {
      exportToExcel(renewalRecords, {
        includeTraceCode: exportConfig.includeTraceCode,
      });
    } else {
      exportToCSV(renewalRecords, {
        includeTraceCode: exportConfig.includeTraceCode,
      });
    }

    addExportRecord({
      exportType: exportConfig.type,
      format: exportConfig.format,
      recordCount,
      fileSize,
      createdBy: user.username,
      traceCode: '',
    });

    setIsExportModalOpen(false);
  };

  const copyTraceCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTraceCode(code);
    setTimeout(() => setCopiedTraceCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">导出中心</h1>
          <p className="text-sm text-slate-500 mt-1">导出续费清单、抵扣明细等数据，所有导出文件均包含追溯码</p>
        </div>
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download size={18} />
          新建导出
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="text-blue-600" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{exportRecords.length}</div>
              <div className="text-sm text-slate-500">总导出次数</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="text-green-600" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {exportRecords.reduce((sum, r) => sum + r.recordCount, 0)}
              </div>
              <div className="text-sm text-slate-500">总导出记录</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <File className="text-amber-600" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatFileSize(exportRecords.reduce((sum, r) => sum + r.fileSize, 0))}
              </div>
              <div className="text-sm text-slate-500">总文件大小</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Eye className="text-purple-600" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {exportRecords.filter(r => r.format === 'xlsx').length}
              </div>
              <div className="text-sm text-slate-500">Excel 格式</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="搜索追溯码、操作人..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部类型</option>
              <option value="renewal">续费清单</option>
              <option value="deduction">临停抵扣</option>
              <option value="discount">优惠记录</option>
              <option value="full">完整数据</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredExports.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">导出类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">文件格式</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">记录数</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">文件大小</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">追溯码</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作人</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">导出时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredExports.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {record.format === 'xlsx' ? (
                          <FileSpreadsheet className="text-green-600" size={18} />
                        ) : record.format === 'csv' ? (
                          <FileText className="text-blue-600" size={18} />
                        ) : (
                          <File className="text-red-600" size={18} />
                        )}
                        <span className="font-medium text-slate-900">
                          {exportTypeLabels[record.exportType]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700">
                        {formatLabels[record.format]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-900">
                      {record.recordCount} 条
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatFileSize(record.fileSize)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 text-xs bg-slate-100 rounded text-slate-700 font-mono">
                          {record.traceCode || '-'}
                        </code>
                        {record.traceCode && (
                          <button
                            onClick={() => copyTraceCode(record.traceCode)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            {copiedTraceCode === record.traceCode ? (
                              <Check size={14} className="text-green-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {record.createdBy}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {formatDate(record.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={<FileX size={48} />}
              title="暂无导出记录"
              description="点击「新建导出」创建第一个导出任务"
            />
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>共 {filteredExports.length} 条导出记录</span>
          </div>
        </div>
      </div>

      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">新建导出</h2>
              <p className="text-sm text-slate-500 mt-1">选择导出类型和格式</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">导出类型</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(exportTypeLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setExportConfig({ ...exportConfig, type: key as ExportRecord['exportType'] })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        exportConfig.type === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium text-sm text-slate-900">{label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">文件格式</label>
                <div className="flex gap-3">
                  {Object.entries(formatLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setExportConfig({ ...exportConfig, format: key as ExportRecord['format'] })}
                      className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                        exportConfig.format === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium text-sm text-slate-900">{label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeTraceCode}
                    onChange={(e) => setExportConfig({ ...exportConfig, includeTraceCode: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">包含追溯码（推荐）</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeBadRows}
                    onChange={(e) => setExportConfig({ ...exportConfig, includeBadRows: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">包含异常行数据</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
