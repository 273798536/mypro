import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store';
import { STATUS_LABELS } from '@/types';
import { formatDate } from '@/utils/fileParser';
import {
  generateExportCSV,
  generateExportJSON,
  downloadFile,
  checkExportWarnings,
} from '@/utils/exportUtils';
import FilterBar from '@/components/FilterBar';

export default function ExportPage() {
  const [exportType, setExportType] = useState<'csv' | 'json'>('csv');
  const [showWarnings, setShowWarnings] = useState(false);
  
  const filteredRecords = useStore((state) => state.getFilteredRecords());
  const versions = useStore((state) => state.versions);
  const comments = useStore((state) => state.comments);
  const screenshots = useStore((state) => state.screenshots);
  const addExportLog = useStore((state) => state.addExportLog);
  const exportLogs = useStore((state) => state.exportLogs);

  const warnings = checkExportWarnings(filteredRecords, versions);
  const hasWarnings = warnings.length > 0;

  const handleExport = () => {
    if (hasWarnings && !showWarnings) {
      setShowWarnings(true);
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    if (exportType === 'csv') {
      const result = generateExportCSV(filteredRecords, versions, comments, screenshots);
      content = result.csv;
      filename = `音乐节摊位复核清单_${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv;charset=utf-8';
    } else {
      const result = generateExportJSON(filteredRecords, versions, comments, screenshots);
      content = result.json;
      filename = `音乐节摊位复核数据_${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    }

    downloadFile(content, filename, mimeType);
    addExportLog(
      filteredRecords.map((r) => r.id),
      exportType,
      '当前用户'
    );
    setShowWarnings(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary/5">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">返回复核主页</span>
            </Link>
            <h1 className="font-serif text-xl font-bold text-gray-900">
              导出交付清单
            </h1>
            <div className="w-28" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-serif text-lg font-bold text-gray-900 mb-4">导出设置</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                导出格式
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setExportType('csv')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    exportType === 'csv'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <FileText className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-medium">CSV 表格</p>
                  <p className="text-xs mt-0.5 opacity-75">适合 Excel 查看</p>
                </button>
                <button
                  onClick={() => setExportType('json')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    exportType === 'json'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <FileText className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-medium">JSON 数据</p>
                  <p className="text-xs mt-0.5 opacity-75">完整数据备份</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                导出预览
              </label>
              <div className="bg-gray-50 rounded-xl p-4 h-full">
                <p className="text-sm text-gray-600 mb-2">
                  将导出 <span className="font-bold text-primary">{filteredRecords.length}</span> 条记录
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  {Object.entries(
                    filteredRecords.reduce((acc, r) => {
                      acc[r.status] = (acc[r.status] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([status, count]) => (
                    <div key={status} className="flex justify-between">
                      <span>{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</span>
                      <span>{count} 条</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {showWarnings && hasWarnings && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800 mb-2">
                    导出前请注意以下问题：
                  </p>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link to="/" className="flex-1 btn-secondary text-center">
              取消
            </Link>
            <button
              onClick={handleExport}
              className={`flex-1 ${
                hasWarnings && !showWarnings ? 'btn-secondary' : 'btn-primary'
              } flex items-center justify-center gap-2`}
            >
              {hasWarnings && !showWarnings ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  检查异常并导出
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  确认导出
                </>
              )}
            </button>
          </div>
        </div>

        <FilterBar />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-serif text-lg font-bold text-gray-900">
              待导出记录预览
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    摊位编号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    音频文件
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    授权期限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    版本数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    更新时间
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => {
                  const recordVersions = versions.filter((v) => v.recordId === record.id);
                  const currentVersion = recordVersions.find(
                    (v) => v.id === record.currentVersionId
                  );
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">
                          摊位 {record.stallNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`status-badge status-${record.status}`}>
                          {STATUS_LABELS[record.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 max-w-[200px] truncate block">
                          {currentVersion?.audioFileName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {currentVersion?.authorizationDate
                            ? formatDate(currentVersion.authorizationDate)
                            : '未设置'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        v{recordVersions.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {exportLogs.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-serif text-lg font-bold text-gray-900 mb-4">
              导出历史
            </h3>
            <div className="space-y-3">
              {exportLogs
                .sort((a, b) => b.exportedAt.localeCompare(a.exportedAt))
                .slice(0, 5)
                .map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {log.exportType.toUpperCase()} 格式导出
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.exportedBy} · {log.recordIds.length} 条记录
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(log.exportedAt)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
