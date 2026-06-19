import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSnapshotStore } from '@/store/snapshotStore';
import { StatusBadge, GrayErrorBadge } from '@/components/StatusBadge';
import { modelVersions } from '@/data/snapshots';
import { exportSnapshotsToCsv } from '@/utils/csv';
import { formatDateTime, formatRelativeTime } from '@/utils/date';
import {
  Search,
  Filter,
  Download,
  Eye,
  GitCompare,
  AlertTriangle,
  Layers,
  Clock,
  User,
  X,
} from 'lucide-react';
import type { SnapshotStatus } from '@/types';

const SnapshotList: React.FC = () => {
  const navigate = useNavigate();
  const { snapshots, filters, setFilters, resetFilters, getFilteredSnapshots, toggleGrayError } =
    useSnapshotStore();
  const [showFilters, setShowFilters] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const filteredSnapshots = getFilteredSnapshots();

  const statusOptions: { value: SnapshotStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: 'pending', label: '待审核' },
    { value: 'approved', label: '已放行' },
    { value: 'need_supplement', label: '需补充' },
    { value: 'gray_error', label: '灰度错误' },
  ];

  const grayErrorOptions = [
    { value: 'all', label: '全部' },
    { value: 'true', label: '有灰度错误' },
    { value: 'false', label: '无灰度错误' },
  ];

  const handleCompareToggle = (snapshotId: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(snapshotId)) {
        return prev.filter((id) => id !== snapshotId);
      }
      if (prev.length >= 2) {
        return [prev[1], snapshotId];
      }
      return [...prev, snapshotId];
    });
  };

  const handleStartCompare = () => {
    if (selectedForCompare.length === 2) {
      navigate(`/compare?left=${selectedForCompare[0]}&right=${selectedForCompare[1]}`);
    }
  };

  const handleExport = () => {
    exportSnapshotsToCsv(filteredSnapshots);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">特征血缘版本快照</h1>
            <p className="text-slate-500 mt-1">
              共 {snapshots.length} 条快照记录，当前筛选 {filteredSnapshots.length} 条
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                compareMode
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              {compareMode ? '对比模式' : '版本对比'}
              {compareMode && selectedForCompare.length > 0 && (
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                  {selectedForCompare.length}/2
                </span>
              )}
            </button>
            {compareMode && selectedForCompare.length === 2 && (
              <button
                onClick={handleStartCompare}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30"
              >
                开始对比
              </button>
            )}
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出CSV
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索快照名称、备注、创建人..."
                value={filters.searchKeyword}
                onChange={(e) => setFilters({ searchKeyword: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            筛选
          </button>
        </div>

        {showFilters && (
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">状态</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ status: e.target.value as SnapshotStatus | 'all' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  灰度错误
                </label>
                <select
                  value={String(filters.hasGrayError)}
                  onChange={(e) =>
                    setFilters({
                      hasGrayError:
                        e.target.value === 'all'
                          ? 'all'
                          : e.target.value === 'true',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {grayErrorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  模型版本
                </label>
                <select
                  value={filters.modelVersion}
                  onChange={(e) => setFilters({ modelVersion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">全部版本</option>
                  {modelVersions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={resetFilters}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                重置筛选
              </button>
            </div>
          </div>
        )}
      </div>

      {compareMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitCompare className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">对比模式已开启</p>
              <p className="text-xs text-blue-700">
                选择 2 个快照进行版本对比，当前已选择 {selectedForCompare.length} 个
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setCompareMode(false);
              setSelectedForCompare([]);
            }}
            className="text-blue-700 hover:text-blue-900 text-sm font-medium"
          >
            退出对比模式
          </button>
        </div>
      )}

      <div className="grid gap-4">
        {filteredSnapshots.map((snapshot) => {
          const isSelected = selectedForCompare.includes(snapshot.id);
          return (
            <div
              key={snapshot.id}
              className={`bg-white rounded-xl border shadow-sm transition-all hover:shadow-md ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
              }`}
            >
              {compareMode && (
                <div
                  className="cursor-pointer"
                  onClick={() => handleCompareToggle(snapshot.id)}
                >
                  <div
                    className={`absolute top-4 left-4 w-5 h-5 rounded border-2 flex items-center justify-center z-10 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <X className="w-3 h-3 text-white" />}
                  </div>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">
                        {snapshot.name}
                      </h3>
                      {snapshot.hasGrayError && <GrayErrorBadge hasError={true} />}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        模型版本：{snapshot.modelVersion}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {formatRelativeTime(snapshot.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        {snapshot.createdBy}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{snapshot.remark}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <StatusBadge status={snapshot.status} />
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/snapshot/${snapshot.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        详情
                      </Link>
                      <button
                        onClick={() => toggleGrayError(snapshot.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          snapshot.hasGrayError
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-slate-500 hover:bg-slate-50'
                        }`}
                        title={snapshot.hasGrayError ? '取消灰度错误标记' : '标记为灰度错误'}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        {snapshot.hasGrayError ? '取消标记' : '标记灰度'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">步骤数</p>
                    <p className="text-lg font-semibold text-slate-900">{snapshot.stepCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">参数变化</p>
                    <p className="text-lg font-semibold text-blue-600">{snapshot.changeCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">灰度比例</p>
                    <p
                      className={`text-lg font-semibold ${
                        snapshot.hasGrayError ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {snapshot.grayRatio || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">创建时间</p>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDateTime(snapshot.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSnapshots.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500">没有找到符合条件的快照</p>
          <button
            onClick={resetFilters}
            className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700"
          >
            重置筛选条件
          </button>
        </div>
      )}
    </div>
  );
};

export default SnapshotList;
