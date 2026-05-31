import React, { useState } from 'react';
import { useCollectionStore } from '../store/collectionStore';

export const ExportPanel: React.FC = () => {
  const { exportRecords, getFilteredRecords } = useCollectionStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeDiscrepancies, setIncludeDiscrepancies] = useState(true);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      const exportData = exportRecords();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `专利许可里程碑收款_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExporting(false);
    }, 500);
  };

  const records = getFilteredRecords();

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800">数据导出</h3>
          <span className="text-sm text-gray-500">
            将导出 {records.length} 条记录
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={includeHistory}
                onChange={(e) => setIncludeHistory(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="ml-1 text-sm text-gray-700">包含变更历史</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={includeEvidence}
                onChange={(e) => setIncludeEvidence(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="ml-1 text-sm text-gray-700">包含证据信息</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={includeDiscrepancies}
                onChange={(e) => setIncludeDiscrepancies(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="ml-1 text-sm text-gray-700">包含差异说明</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="json">JSON 格式</option>
              <option value="csv">CSV 格式</option>
            </select>
            <button
              onClick={handleExport}
              disabled={isExporting || records.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  导出中...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  导出数据
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-700">
          <span className="font-medium">导出内容说明：</span>
          导出文件将包含许可合同信息、里程碑详情、开票记录、销售补报、核验记录
          {includeHistory && '、完整的变更历史'}
          {includeEvidence && '、证据文件清单'}
          {includeDiscrepancies && '、差异说明及解决方案'}
          。所有导出的数据都将带有时间戳和操作人信息，确保可追溯性。
        </div>
      </div>
    </div>
  );
};
