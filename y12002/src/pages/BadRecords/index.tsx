import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  Square,
  Eye,
  Trash2,
  CheckCircle2,
  Database,
  FileWarning,
  Hash,
  FileText,
  Search,
  Filter,
  X,
  Wrench,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { StatusTag } from '@/components/ui/StatusTag';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { BadRecord, ErrorType, SourceType } from '@/types';

const errorTypeFilters: { key: ErrorType | 'all'; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'all', label: '全部', icon: Filter },
  { key: '空行', label: '空行', icon: FileText },
  { key: '缺列', label: '缺列', icon: FileWarning },
  { key: '格式错误', label: '格式错误', icon: AlertTriangle },
  { key: '数据异常', label: '数据异常', icon: Database },
];

const sourceTypeFilters: SourceType[] = ['会员账户', '里程流水', '兑换订单', '过期日历'];

export const BadRecordsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [errorTypeFilter, setErrorTypeFilter] = useState<ErrorType | 'all'>('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceType | 'all'>('all');
  const [showProcessed, setShowProcessed] = useState(true);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; record: BadRecord | null }>({
    isOpen: false,
    record: null,
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'process';
    ids: string[];
  }>({ isOpen: false, type: 'delete', ids: [] });

  const badRecords = useAppStore((state) => state.badRecords);
  const selectedRecords = useAppStore((state) => state.selectedRecords);
  const toggleSelected = useAppStore((state) => state.toggleSelected);
  const clearSelected = useAppStore((state) => state.clearSelected);
  const selectAll = useAppStore((state) => state.selectAll);
  const currentUser = useAppStore((state) => state.currentUser);
  const markBatchBadRecordsProcessed = useAppStore((state) => state.markBatchBadRecordsProcessed);
  const deleteBadRecords = useAppStore((state) => state.deleteBadRecords);
  const markBadRecordProcessed = useAppStore((state) => state.markBadRecordProcessed);

  const stats = useMemo(() => {
    const total = badRecords.length;
    const unprocessed = badRecords.filter(r => !r.isProcessed).length;
    const byErrorType = badRecords.reduce((acc, r) => {
      acc[r.errorType] = (acc[r.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const bySourceType = badRecords.reduce((acc, r) => {
      acc[r.sourceType] = (acc[r.sourceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, unprocessed, byErrorType, bySourceType };
  }, [badRecords]);

  const displayRecords = useMemo(() => {
    let filtered = [...badRecords];

    if (!showProcessed) {
      filtered = filtered.filter(r => !r.isProcessed);
    }

    if (errorTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.errorType === errorTypeFilter);
    }

    if (sourceTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.sourceType === sourceTypeFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.sourceFile.toLowerCase().includes(term) ||
        r.errorDescription.toLowerCase().includes(term) ||
        r.importBatchNo.toLowerCase().includes(term) ||
        JSON.stringify(r.originalData).toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => {
      if (a.isProcessed !== b.isProcessed) return a.isProcessed ? 1 : -1;
      return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
    });
  }, [badRecords, errorTypeFilter, sourceTypeFilter, searchTerm, showProcessed]);

  const allSelectedOnPage = displayRecords.length > 0 && displayRecords.every(r => selectedRecords.includes(r.id));

  const handleSelectAll = () => {
    if (allSelectedOnPage) {
      clearSelected();
    } else {
      selectAll(displayRecords.map(r => r.id));
    }
  };

  const handleBatchProcess = () => {
    if (selectedRecords.length === 0) return;
    setConfirmModal({ isOpen: true, type: 'process', ids: [...selectedRecords] });
  };

  const handleBatchDelete = () => {
    if (selectedRecords.length === 0) return;
    setConfirmModal({ isOpen: true, type: 'delete', ids: [...selectedRecords] });
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === 'delete') {
      deleteBadRecords(confirmModal.ids);
    } else {
      markBatchBadRecordsProcessed(confirmModal.ids, currentUser);
    }
    setConfirmModal({ isOpen: false, type: 'delete', ids: [] });
  };

  const handleSingleProcess = (record: BadRecord) => {
    markBadRecordProcessed(record.id, currentUser);
  };

  const getOriginalDataPreview = (data: Record<string, any>) => {
    const entries = Object.entries(data);
    if (entries.length === 0) return '<空行>';
    return entries.slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') + (entries.length > 3 ? '...' : '');
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-gray-900">
          坏行管理
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          管理数据导入过程中产生的坏行记录，进行查看、修复和清理
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card-secondary card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总计坏行</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="stat-card-secondary card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待处理</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.unprocessed}</p>
            </div>
          </div>
        </div>

        <div className="stat-card-secondary card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已处理</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.total - stats.unprocessed}</p>
            </div>
          </div>
        </div>

        <div className="stat-card-secondary card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">数据源类型</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{Object.keys(stats.bySourceType).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {errorTypeFilters.map(filter => {
          const Icon = filter.icon;
          const count = filter.key === 'all' ? stats.total : (stats.byErrorType[filter.key] || 0);
          const isActive = errorTypeFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => setErrorTypeFilter(filter.key)}
              className={cn(
                'p-3 rounded-lg border-2 text-left transition-all',
                isActive
                  ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn('w-4 h-4', isActive ? 'text-[#1E3A5F]' : 'text-gray-400')} />
                <span className={cn('text-sm font-medium', isActive ? 'text-[#1E3A5F]' : 'text-gray-700')}>
                  {filter.label}
                </span>
                <span className={cn(
                  'ml-auto text-sm font-bold',
                  count > 0 ? 'text-red-600' : 'text-gray-400'
                )}>
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="card mb-4">
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索文件名、错误描述、批次号..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">数据源:</span>
            <select
              className="select w-36"
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter(e.target.value as SourceType | 'all')}
            >
              <option value="all">全部</option>
              {sourceTypeFilters.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showProcessed}
              onChange={(e) => setShowProcessed(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
            />
            <span className="text-sm text-gray-600">显示已处理</span>
          </label>

          {selectedRecords.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500">
                已选择 {selectedRecords.length} 条
              </span>
              <button
                onClick={handleBatchProcess}
                className="btn btn-success gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                批量标记已处理
              </button>
              <button
                onClick={handleBatchDelete}
                className="btn btn-danger gap-2"
              >
                <Trash2 className="w-4 h-4" />
                批量删除
              </button>
              <button
                onClick={clearSelected}
                className="btn btn-ghost"
              >
                取消选择
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1400px]">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="table-header w-12">
                  <button onClick={handleSelectAll} className="p-1">
                    {allSelectedOnPage ? (
                      <CheckSquare className="w-4 h-4 text-[#1E3A5F]" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="table-header w-20">行号</th>
                <th className="table-header">数据源</th>
                <th className="table-header">错误类型</th>
                <th className="table-header">源文件</th>
                <th className="table-header">原始数据预览</th>
                <th className="table-header">错误信息</th>
                <th className="table-header">修复建议</th>
                <th className="table-header">状态</th>
                <th className="table-header">处理人</th>
                <th className="table-header">创建时间</th>
                <th className="table-header text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {displayRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="table-cell text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-12 h-12 text-gray-300" />
                      <p>暂无坏行记录</p>
                      <p className="text-sm">请尝试调整筛选条件</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayRecords.map((record, idx) => (
                  <BadRecordRow
                    key={record.id}
                    record={record}
                    isSelected={selectedRecords.includes(record.id)}
                    onToggleSelect={() => toggleSelected(record.id)}
                    onViewDetail={() => setDetailModal({ isOpen: true, record })}
                    onProcess={() => handleSingleProcess(record)}
                    stagger={idx % 4}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="text-sm text-gray-500">
            显示 {displayRecords.length} 条 / 共 {badRecords.length} 条
          </div>
          <div className="text-sm text-gray-500">
            未处理 {stats.unprocessed} 条，已处理 {stats.total - stats.unprocessed} 条
          </div>
        </div>
      </div>

      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, record: null })}
        title="坏行详情"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setDetailModal({ isOpen: false, record: null })}
              className="btn btn-ghost"
            >
              关闭
            </button>
            {detailModal.record && !detailModal.record.isProcessed && (
              <button
                onClick={() => {
                  handleSingleProcess(detailModal.record!);
                  setDetailModal({ isOpen: false, record: null });
                }}
                className="btn btn-success"
              >
                标记已处理
              </button>
            )}
          </>
        }
      >
        {detailModal.record && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">行号</p>
                <p className="font-mono font-semibold text-lg">{detailModal.record.rowNumber}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">数据源类型</p>
                <p className="font-semibold">{detailModal.record.sourceType}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">源文件</p>
                <p className="font-mono text-sm">{detailModal.record.sourceFile}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">导入批次</p>
                <p className="font-mono text-sm">{detailModal.record.importBatchNo}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                错误信息
              </p>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <StatusTag status={detailModal.record.errorType} type="error" />
                </div>
                <p className="text-sm text-red-700">{detailModal.record.errorDescription}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                修复建议
              </p>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">{detailModal.record.repairSuggestion}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                原始数据
              </p>
              <div className="p-4 bg-gray-900 rounded-lg overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify(detailModal.record.originalData, null, 2)}
                </pre>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">创建时间</p>
                <p className="font-medium">{formatDateTime(detailModal.record.createTime)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">处理状态</p>
                <p className="font-medium">
                  {detailModal.record.isProcessed ? (
                    <span className="text-emerald-600">
                      已处理 · {detailModal.record.processor} · {formatDateTime(detailModal.record.processTime!)}
                    </span>
                  ) : (
                    <span className="text-amber-600">未处理</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: 'delete', ids: [] })}
        title={confirmModal.type === 'delete' ? '确认删除' : '确认标记已处理'}
        size="md"
        footer={
          <>
            <button
              onClick={() => setConfirmModal({ isOpen: false, type: 'delete', ids: [] })}
              className="btn btn-ghost"
            >
              取消
            </button>
            <button
              onClick={handleConfirmAction}
              className={cn('btn', confirmModal.type === 'delete' ? 'btn-danger' : 'btn-success')}
            >
              {confirmModal.type === 'delete' ? '确认删除' : '确认标记'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className={cn(
            'p-4 rounded-lg',
            confirmModal.type === 'delete' ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'
          )}>
            <p className={cn(
              'text-sm font-medium',
              confirmModal.type === 'delete' ? 'text-red-700' : 'text-emerald-700'
            )}>
              {confirmModal.type === 'delete'
                ? `即将删除 ${confirmModal.ids.length} 条坏行记录`
                : `即将标记 ${confirmModal.ids.length} 条坏行记录为已处理`}
            </p>
          </div>
          <p className="text-sm text-gray-600">
            {confirmModal.type === 'delete'
              ? '此操作不可恢复，删除后数据将永久丢失。建议先确认数据已无用或已重新导入正确数据。'
              : '标记后这些记录将不再显示在待处理列表中，但仍可通过"显示已处理"查看。'}
          </p>
          <p className="text-xs text-gray-500">
            操作人：{currentUser}
          </p>
        </div>
      </Modal>
    </div>
  );
};

const BadRecordRow: React.FC<{
  record: BadRecord;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewDetail: () => void;
  onProcess: () => void;
  stagger: number;
}> = ({ record, isSelected, onToggleSelect, onViewDetail, onProcess, stagger }) => {
  const getOriginalDataPreview = (data: Record<string, any>) => {
    const entries = Object.entries(data);
    if (entries.length === 0) return '<空行>';
    return entries.slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') + (entries.length > 3 ? '...' : '');
  };

  return (
    <tr
      className={cn(
        'table-row',
        record.isProcessed && 'table-row-reviewed',
        `animate-fade-in stagger-${stagger + 1}`
      )}
    >
      <td className="table-cell">
        <button onClick={onToggleSelect} className="p-1">
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-[#1E3A5F]" />
          ) : (
            <Square className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </td>
      <td className="table-cell">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-mono font-semibold text-[#1E3A5F]">{record.rowNumber}</span>
        </div>
      </td>
      <td className="table-cell">
        <span className={cn(
          'px-2 py-1 rounded text-xs font-medium',
          record.sourceType === '会员账户' && 'bg-blue-50 text-blue-700',
          record.sourceType === '里程流水' && 'bg-purple-50 text-purple-700',
          record.sourceType === '兑换订单' && 'bg-emerald-50 text-emerald-700',
          record.sourceType === '过期日历' && 'bg-orange-50 text-orange-700',
        )}>
          {record.sourceType}
        </span>
      </td>
      <td className="table-cell">
        <StatusTag status={record.errorType} type="error" />
      </td>
      <td className="table-cell">
        <div className="font-mono text-xs text-gray-600 max-w-[150px] truncate" title={record.sourceFile}>
          {record.sourceFile}
        </div>
      </td>
      <td className="table-cell">
        <div className="max-w-[200px] truncate text-xs text-gray-600 font-mono" title={getOriginalDataPreview(record.originalData)}>
          {getOriginalDataPreview(record.originalData)}
        </div>
      </td>
      <td className="table-cell">
        <div className="max-w-[200px] text-sm text-gray-700">
          {record.errorDescription}
        </div>
      </td>
      <td className="table-cell">
        <div className="max-w-[180px] text-xs text-gray-500 flex items-start gap-1">
          <Wrench className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <span>{record.repairSuggestion}</span>
        </div>
      </td>
      <td className="table-cell">
        <span className={cn(
          'px-2 py-1 rounded text-xs font-medium',
          record.isProcessed
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-amber-100 text-amber-700'
        )}>
          {record.isProcessed ? '已处理' : '未处理'}
        </span>
      </td>
      <td className="table-cell text-sm text-gray-500">
        {record.processor || '-'}
      </td>
      <td className="table-cell text-xs text-gray-500">
        {formatDateTime(record.createTime)}
      </td>
      <td className="table-cell">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={onViewDetail}
            className="p-1.5 text-gray-400 hover:text-[#1E3A5F] hover:bg-[#1E3A5F]/10 rounded transition-colors"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!record.isProcessed && (
            <button
              onClick={onProcess}
              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
              title="标记已处理"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
