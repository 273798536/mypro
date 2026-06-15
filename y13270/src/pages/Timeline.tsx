import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Filter } from 'lucide-react';
import { usePointStore } from '../store';
import { TimelineItem } from '../components/TimelineItem';
import { EmptyState } from '../components/EmptyState';
import { HistoryAction, ACTION_LABELS } from '../types';
import { formatDate } from '../utils/geo';

const ACTION_FILTERS: (HistoryAction | 'all')[] = ['all', 'import', 'merge', 'confirm', 'withdraw', 'note', 'status'];

export function Timeline() {
  const { history, mergedPoints, exportHistory, exportHistoryCSV } = usePointStore();
  const [actionFilter, setActionFilter] = useState<HistoryAction | 'all'>('all');
  const [pointFilter, setPointFilter] = useState<string>('all');

  const hasData = history.length > 0;

  const filteredHistory = history.filter((record) => {
    if (actionFilter !== 'all' && record.action !== actionFilter) return false;
    if (pointFilter !== 'all' && record.targetId !== pointFilter) return false;
    return true;
  });

  const handleExportJSON = () => {
    const json = exportHistory();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `公交港湾点位历史记录_${formatDate(new Date().toISOString())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const csv = exportHistoryCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `公交港湾点位历史记录_${formatDate(new Date().toISOString())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hasData) {
    return <EmptyState />;
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-serif-cn font-bold text-gray-800 mb-2">
            历史时间线
          </h2>
          <p className="text-gray-500 text-sm">
            全量操作记录，支持筛选和导出，页面状态与文件内容完全一致
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="btn-secondary flex items-center gap-2 text-sm py-2"
          >
            <FileJson className="w-4 h-4" />
            导出 JSON
          </button>
          <button
            onClick={handleExportCSV}
            className="btn-primary flex items-center gap-2 text-sm py-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            导出 CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">筛选条件</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">操作类型</label>
            <div className="flex flex-wrap gap-1">
              {ACTION_FILTERS.map((action) => (
                <button
                  key={action}
                  onClick={() => setActionFilter(action)}
                  className={`px-3 py-1 text-xs rounded border transition-all ${
                    actionFilter === action
                      ? 'bg-city-blue-600 text-white border-city-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {action === 'all' ? '全部' : ACTION_LABELS[action]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">关联点位</label>
            <select
              value={pointFilter}
              onChange={(e) => setPointFilter(e.target.value)}
              className="input-field text-sm py-1.5 min-w-48"
            >
              <option value="all">全部点位</option>
              {mergedPoints.map((mp) => (
                <option key={mp.id} value={mp.id}>
                  {mp.canonicalName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="timeline-line" />

        {filteredHistory.length > 0 ? (
          filteredHistory.map((record, index) => (
            <TimelineItem key={record.id} record={record} index={index} />
          ))
        ) : (
          <div className="text-center py-12 text-gray-400">
            暂无符合筛选条件的历史记录
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-6 p-4 bg-city-blue-50 rounded-lg border border-city-blue-200">
          <div className="flex items-start gap-2 text-sm text-city-blue-700">
            <Download className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">导出数据一致性保证</p>
              <p className="text-xs text-city-blue-600">
                导出的 JSON/CSV 文件包含当前页面显示的完整状态：
                {history.length} 条操作记录，
                {mergedPoints.length} 个归并点位，
                所有原始数据和操作痕迹完整保留，确保页面状态与文件内容完全一致。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
