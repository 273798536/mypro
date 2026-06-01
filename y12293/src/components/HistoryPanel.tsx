import { useState } from 'react';
import { History, Trash2, Edit2, Check, X, Filter, AlertTriangle, FileText, Tag } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { HistoryType, HistoryStatus } from '@/types';
import { formatVolume } from '@/utils/mathUtils';

const statusColors: Record<HistoryStatus, string> = {
  normal: 'bg-green-500/20 text-green-400 border-green-500/50',
  warning: 'bg-warning-500/20 text-warning-400 border-warning-500/50',
  missing_field: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  late_edit: 'bg-purple-500/20 text-purple-400 border-purple-500/50'
};

const statusLabels: Record<HistoryStatus, string> = {
  normal: '正常',
  warning: '警告',
  missing_field: '缺字段',
  late_edit: '晚补'
};

const typeLabels: Record<HistoryType, string> = {
  create: '创建',
  update: '更新',
  export: '导出',
  warning: '警告'
};

export function HistoryPanel() {
  const { history, filters, setFilters, selectHistory, selectedHistoryId, updateHistoryRecord, deleteHistoryRecord } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRemark, setEditRemark] = useState('');

  const filteredHistory = history.filter((record) => {
    if (filters.types.length > 0 && !filters.types.includes(record.type)) {
      return false;
    }
    return true;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEditStart = (id: string, remark: string) => {
    setEditingId(id);
    setEditRemark(remark);
  };

  const handleEditSave = (id: string) => {
    updateHistoryRecord(id, { remark: editRemark, status: 'late_edit' });
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditRemark('');
  };

  const toggleFilter = (type: HistoryType) => {
    if (filters.types.includes(type)) {
      setFilters({ ...filters, types: filters.types.filter(t => t !== type) });
    } else {
      setFilters({ ...filters, types: [...filters.types, type] });
    }
  };

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary-400" />
          <h3 className="font-semibold text-white">历史记录</h3>
          <span className="text-xs text-gray-500">({filteredHistory.length})</span>
        </div>
        <div className="relative group">
          <Filter className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" />
          <div className="absolute right-0 top-6 bg-dark-700 border border-gray-600 rounded-lg p-2 hidden group-hover:block z-10 min-w-32">
            <p className="text-xs text-gray-400 mb-2">筛选类型</p>
            {(['create', 'update', 'export', 'warning'] as HistoryType[]).map((type) => (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`w-full text-left px-2 py-1 text-xs rounded ${
                  filters.types.includes(type)
                    ? 'bg-primary-500/30 text-primary-400'
                    : 'text-gray-300 hover:bg-dark-600'
                }`}
              >
                {typeLabels[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无历史记录</p>
          </div>
        ) : (
          filteredHistory.map((record) => (
            <div
              key={record.id}
              onClick={() => selectHistory(record.id === selectedHistoryId ? null : record.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all card-hover ${
                record.id === selectedHistoryId
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-gray-700 hover:border-gray-500'
              } ${
                (record.issues.reversedInterval || record.issues.insufficientSlices) ? 'warning-glow' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs rounded border ${statusColors[record.status]}`}>
                      {statusLabels[record.status]}
                    </span>
                    <span className="text-xs text-gray-500">{typeLabels[record.type]}</span>
                    <span className="text-xs text-gray-500 ml-auto">{formatDate(record.timestamp)}</span>
                  </div>
                  
                  <div className="font-mono text-sm text-white mb-1">
                    f(x) = {record.functionConfig.expression}
                  </div>
                  
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <div>旋转轴: {record.rotationAxis.axis.toUpperCase()}</div>
                    <div>区间: [{record.functionConfig.domain.start}, {record.functionConfig.domain.end}]</div>
                    <div className="text-primary-400">体积: V = {formatVolume(record.volume)}</div>
                  </div>

                  {(record.issues.reversedInterval || record.issues.insufficientSlices) && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-warning-400">
                      <AlertTriangle className="w-3 h-3" />
                      {record.issues.reversedInterval && <span>区间反向</span>}
                      {record.issues.reversedInterval && record.issues.insufficientSlices && <span> | </span>}
                      {record.issues.insufficientSlices && <span>切片过少</span>}
                    </div>
                  )}

                  {record.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {record.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-dark-700 text-gray-300 text-xs rounded"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {editingId === record.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={editRemark}
                        onChange={(e) => setEditRemark(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-2 py-1 bg-dark-700 border border-gray-600 rounded text-xs text-white focus:outline-none focus:border-primary-500"
                        placeholder="添加备注..."
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditSave(record.id); }}
                        className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditCancel(); }}
                        className="p-1 text-gray-400 hover:bg-gray-500/20 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : record.remark ? (
                    <div className="mt-2 text-xs text-gray-400 italic">
                      备注: {record.remark}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1">
                  {editingId !== record.id && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditStart(record.id, record.remark); }}
                        className="p-1 text-gray-400 hover:text-primary-400 hover:bg-primary-500/20 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteHistoryRecord(record.id); }}
                        className="p-1 text-gray-400 hover:text-warning-400 hover:bg-warning-500/20 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
