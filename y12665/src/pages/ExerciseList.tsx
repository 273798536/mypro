import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Upload,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  History,
  Trash2,
  FileUp,
  Loader2,
} from 'lucide-react';
import type { Exercise } from '../../shared/types';
import { useExerciseStore } from '@/store/useExerciseStore';
import { exerciseApi } from '@/lib/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

type StatusFilter = Exercise['status'] | 'all';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'reviewing', label: '审核中' },
  { value: 'confirmed', label: '已确认' },
  { value: 'archived', label: '已归档' },
];

const CONFLICT_STRATEGIES: { value: 'skip' | 'overwrite' | 'merge'; label: string; desc: string }[] = [
  { value: 'skip', label: '跳过', desc: '保留已有数据，忽略重复项' },
  { value: 'overwrite', label: '覆盖', desc: '用新数据覆盖已有数据' },
  { value: 'merge', label: '合并', desc: '合并新旧字段，以新数据优先' },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExerciseList() {
  const navigate = useNavigate();
  const store = useExerciseStore();
  const exercises = store.exercises ?? [];
  const total = store.total ?? 0;
  const totalPages = store.totalPages ?? 0;
  const listLoading = store.listLoading ?? false;
  const listError = store.listError ?? null;
  const selectedIds = store.selectedIds ?? new Set<string>();
  const { fetchExercises, toggleSelected, clearSelected, toggleAllSelected } = store;

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStrategy, setImportStrategy] = useState<'skip' | 'overwrite' | 'merge'>('skip');
  const [importLoading, setImportLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', sourceRemark: '' });
  const [createLoading, setCreateLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
  }, [keyword, statusFilter]);

  useEffect(() => {
    const query: Parameters<typeof fetchExercises>[0] = { page: currentPage, pageSize: 10 };
    if (keyword.trim()) query.search = keyword.trim();
    if (statusFilter !== 'all') query.status = statusFilter;
    fetchExercises(query);
  }, [keyword, statusFilter, currentPage, fetchExercises]);

  const items = exercises;
  const allSelected = items.length > 0 && items.every((it) => selectedIds.has(it.id));

  const openDetail = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest('[data-stop-propagation]')) return;
    navigate(`/exercises/${id}`);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('conflictStrategy', importStrategy);
      await exerciseApi.importFile(fd);
      setImportOpen(false);
      setImportFile(null);
      const query: Parameters<typeof fetchExercises>[0] = { page: currentPage, pageSize: 10 };
      if (keyword.trim()) query.search = keyword.trim();
      if (statusFilter !== 'all') query.status = statusFilter;
      fetchExercises(query);
    } finally {
      setImportLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setCreateLoading(true);
    try {
      const created = await exerciseApi.create({
        name: createForm.name.trim(),
        sourceRemark: createForm.sourceRemark.trim() || null,
        status: 'draft',
      });
      setCreateOpen(false);
      setCreateForm({ name: '', sourceRemark: '' });
      navigate(`/exercises/${created.id}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定删除练习「${name}」？此操作不可恢复。`)) return;
    await exerciseApi.remove(id);
    clearSelected();
    const query: Parameters<typeof fetchExercises>[0] = { page: currentPage, pageSize: 10 };
    if (keyword.trim()) query.search = keyword.trim();
    if (statusFilter !== 'all') query.status = statusFilter;
    fetchExercises(query);
  };

  const pageNumbers = useMemo(() => {
    const arr: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
      return arr;
    }
    arr.push(1);
    if (currentPage > 3) arr.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) arr.push(i);
    if (currentPage < totalPages - 2) arr.push('...');
    arr.push(totalPages);
    return arr;
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-deep-space-900">
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-deep-space-50 mb-1">练习列表</h1>
          <p className="text-sm text-deep-space-300">管理分子构象旋转练习数据</p>
        </div>

        <div className="bg-deep-space-800 border border-deep-space-600 rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-deep-space-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索名称、图片名、来源备注…"
              className="w-full pl-9 pr-3 py-2 bg-deep-space-900 border border-deep-space-600 rounded-md text-sm text-deep-space-100 placeholder-deep-space-400 focus:outline-none focus:border-ice-blue"
            />
          </div>

          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-deep-space-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="pl-9 pr-8 py-2 bg-deep-space-900 border border-deep-space-600 rounded-md text-sm text-deep-space-100 focus:outline-none focus:border-ice-blue appearance-none cursor-pointer"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-deep-space-700 hover:bg-deep-space-600 text-deep-space-100 text-sm rounded-md border border-deep-space-500 transition-colors"
            >
              <Upload size={14} />
              导入
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-ice-blue hover:bg-ice-blue-hover text-deep-space-900 text-sm rounded-md font-medium shadow-glow-ice transition-colors"
            >
              <Plus size={14} />
              新建
            </button>
          </div>
        </div>

        <div className="bg-deep-space-800 border border-deep-space-600 rounded-lg overflow-hidden">
          {listLoading ? (
            <div className="py-16 flex items-center justify-center text-deep-space-300">
              <Loader2 size={20} className="animate-spin mr-2" />
              加载中…
            </div>
          ) : listError ? (
            <EmptyState title="加载失败" description={listError} />
          ) : items.length === 0 ? (
            <EmptyState
              title="暂无数据"
              description="可以通过「新建」或「导入」添加练习数据"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-deep-space-700/50 text-deep-space-200">
                      <th className="w-10 px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleAllSelected(items)}
                          data-stop-propagation
                          className="w-4 h-4 rounded border-deep-space-500 bg-deep-space-900 text-ice-blue focus:ring-ice-blue"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium">名称</th>
                      <th className="px-4 py-3 text-left font-medium">原始行号</th>
                      <th className="px-4 py-3 text-left font-medium">图片名</th>
                      <th className="px-4 py-3 text-left font-medium">来源备注</th>
                      <th className="px-4 py-3 text-left font-medium">状态</th>
                      <th className="px-4 py-3 text-left font-medium">创建时间</th>
                      <th className="px-4 py-3 text-left font-medium">更新时间</th>
                      <th className="px-4 py-3 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr
                        key={it.id}
                        onClick={(e) => openDetail(e, it.id)}
                        className={cn(
                          'border-t border-deep-space-700 cursor-pointer transition-colors',
                          'hover:bg-deep-space-700/40',
                          selectedIds.has(it.id) && 'bg-ice-blue/5',
                        )}
                      >
                        <td className="px-4 py-3" data-stop-propagation>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(it.id)}
                            onChange={() => toggleSelected(it.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-deep-space-500 bg-deep-space-900 text-ice-blue focus:ring-ice-blue"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-deep-space-50">{it.name}</td>
                        <td className="px-4 py-3 font-mono text-deep-space-300">
                          {it.sourceRowNumber ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-deep-space-300 max-w-[180px] truncate" title={it.sourceImageName ?? ''}>
                          {it.sourceImageName ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-deep-space-300 max-w-[200px] truncate" title={it.sourceRemark ?? ''}>
                          {it.sourceRemark ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={it.status} />
                        </td>
                        <td className="px-4 py-3 text-deep-space-300 whitespace-nowrap">{formatDate(it.createdAt)}</td>
                        <td className="px-4 py-3 text-deep-space-300 whitespace-nowrap">{formatDate(it.updatedAt)}</td>
                        <td className="px-4 py-3" data-stop-propagation>
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              title="查看"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/exercises/${it.id}`);
                              }}
                              className="p-1.5 rounded text-deep-space-300 hover:text-ice-blue hover:bg-deep-space-700 transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              title="修正"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/exercises/${it.id}/revise`);
                              }}
                              className="p-1.5 rounded text-deep-space-300 hover:text-ice-blue hover:bg-deep-space-700 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              title="历史"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/exercises/${it.id}/history`);
                              }}
                              className="p-1.5 rounded text-deep-space-300 hover:text-ice-blue hover:bg-deep-space-700 transition-colors"
                            >
                              <History size={14} />
                            </button>
                            <button
                              type="button"
                              title="删除"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(it.id, it.name);
                              }}
                              className="p-1.5 rounded text-deep-space-300 hover:text-red-reject hover:bg-red-reject/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-deep-space-700">
                <div className="text-sm text-deep-space-300">
                  共 <span className="text-deep-space-100 font-medium">{total}</span> 条
                  {selectedIds.size > 0 && (
                    <span className="ml-3 text-ice-blue">已选 {selectedIds.size} 项</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded text-deep-space-300 hover:text-deep-space-50 hover:bg-deep-space-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {pageNumbers.map((n, i) =>
                    n === '...' ? (
                      <span key={`dots-${i}`} className="px-2 text-deep-space-400">…</span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCurrentPage(n)}
                        className={cn(
                          'min-w-[32px] h-8 rounded text-sm transition-colors',
                          currentPage === n
                            ? 'bg-ice-blue text-deep-space-900 font-medium'
                            : 'text-deep-space-200 hover:bg-deep-space-700',
                        )}
                      >
                        {n}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded text-deep-space-300 hover:text-deep-space-50 hover:bg-deep-space-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={importOpen}
        onClose={() => !importLoading && setImportOpen(false)}
        title="导入练习数据"
        footer={
          <>
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              disabled={importLoading}
              className="px-4 py-2 text-sm rounded-md bg-deep-space-700 hover:bg-deep-space-600 text-deep-space-100 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!importFile || importLoading}
              className="px-4 py-2 text-sm rounded-md bg-ice-blue hover:bg-ice-blue-hover text-deep-space-900 font-medium shadow-glow-ice transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {importLoading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              {importLoading ? '导入中…' : '开始导入'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-deep-space-100 mb-1.5">选择文件</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-deep-space-600 rounded-lg p-6 text-center cursor-pointer hover:border-ice-blue/50 hover:bg-ice-blue/5 transition-colors"
            >
              <FileUp size={28} className="mx-auto text-deep-space-400 mb-2" />
              {importFile ? (
                <div>
                  <div className="text-sm text-deep-space-100 font-medium">{importFile.name}</div>
                  <div className="text-xs text-deep-space-400 mt-1">
                    {(importFile.size / 1024).toFixed(1)} KB · 点击重新选择
                  </div>
                </div>
              ) : (
                <div className="text-sm text-deep-space-300">
                  点击选择或拖拽文件到此处
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-deep-space-100 mb-2">重复处理策略</label>
            <div className="space-y-2">
              {CONFLICT_STRATEGIES.map((s) => (
                <label
                  key={s.value}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                    importStrategy === s.value
                      ? 'border-ice-blue bg-ice-blue/10'
                      : 'border-deep-space-600 hover:border-deep-space-500 bg-deep-space-900/60',
                  )}
                >
                  <input
                    type="radio"
                    name="strategy"
                    checked={importStrategy === s.value}
                    onChange={() => setImportStrategy(s.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-deep-space-100">{s.label}</div>
                    <div className="text-xs text-deep-space-400 mt-0.5">{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => !createLoading && setCreateOpen(false)}
        title="新建练习"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              disabled={createLoading}
              className="px-4 py-2 text-sm rounded-md bg-deep-space-700 hover:bg-deep-space-600 text-deep-space-100 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!createForm.name.trim() || createLoading}
              className="px-4 py-2 text-sm rounded-md bg-ice-blue hover:bg-ice-blue-hover text-deep-space-900 font-medium shadow-glow-ice transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {createLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {createLoading ? '创建中…' : '创建'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-deep-space-100 mb-1.5">
              名称 <span className="text-red-reject">*</span>
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="请输入练习名称"
              className="w-full px-3 py-2 bg-deep-space-900 border border-deep-space-600 rounded-md text-sm text-deep-space-100 placeholder-deep-space-400 focus:outline-none focus:border-ice-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-deep-space-100 mb-1.5">来源备注</label>
            <textarea
              value={createForm.sourceRemark}
              onChange={(e) => setCreateForm((f) => ({ ...f, sourceRemark: e.target.value }))}
              rows={3}
              placeholder="可选：数据来源说明等"
              className="w-full px-3 py-2 bg-deep-space-900 border border-deep-space-600 rounded-md text-sm text-deep-space-100 placeholder-deep-space-400 focus:outline-none focus:border-ice-blue resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
