import { useState, useMemo } from 'react';
import { Table2, Plus, Upload, Trash2, Edit3 } from 'lucide-react';
import { useCondProbStore } from '@/store/useCondProbStore';
import { CondProbParam, DataStatus } from '@/types';
import { DataStatusBadge, ReviewStatusBadge } from '@/components/StatusBadge';
import { formatPercent } from '@/utils';
import EditParamModal from '@/components/EditParamModal';
import ImportModal from '@/components/ImportModal';
import SampleBanner from '@/components/SampleBanner';
import StatusFilterBar from '@/components/StatusFilterBar';

export default function ParamsManagement() {
  const { params, filterStatus, boundaryOnly, deleteParam, setEditingParam } = useCondProbStore();
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () =>
      params.filter((p) => {
        if (filterStatus !== 'all' && p.status !== filterStatus) return false;
        if (boundaryOnly && !p.isBoundary) return false;
        return true;
      }),
    [params, filterStatus, boundaryOnly],
  );

  const openEdit = (p?: CondProbParam) => {
    setEditingParam(p ?? null);
    setEditOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id)));
  };

  const bulkDelete = () => {
    if (selected.size === 0) return;
    if (!confirm(`确定删除选中的 ${selected.size} 条参数？`)) return;
    selected.forEach((id) => deleteParam(id));
    setSelected(new Set());
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <SampleBanner />

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-ink-800 flex items-center gap-2">
            <Table2 className="w-6 h-6 text-ink-500" />
            参数表管理
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            整理参数、批量处理、导入 CSV 并自动去重。人工修正会自动留痕，前后变化清晰可追溯。
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <button
              onClick={bulkDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              删除选中（{selected.size}）
            </button>
          )}
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-ink-200 text-ink-700 text-sm font-medium hover:border-ink-400 hover:bg-ink-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            导入 CSV
          </button>
          <button
            onClick={() => openEdit()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ink-700 hover:bg-ink-800 text-white text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增行
          </button>
        </div>
      </div>

      <div className="mb-4">
        <StatusFilterBar />
      </div>

      <div className="bg-white rounded-xl border border-ink-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/70 text-ink-600 text-xs uppercase tracking-wider border-b border-ink-100">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-ink-300"
                  />
                </th>
                <th className="text-left px-3 py-3 font-medium">条件 A</th>
                <th className="text-left px-3 py-3 font-medium">结果 B</th>
                <th className="text-right px-3 py-3 font-medium">N(A)</th>
                <th className="text-right px-3 py-3 font-medium">N(A∩B)</th>
                <th className="text-right px-3 py-3 font-medium">P(B|A)</th>
                <th className="text-left px-3 py-3 font-medium">状态</th>
                <th className="text-left px-3 py-3 font-medium">审核</th>
                <th className="w-20 px-3 py-3 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-ink-400 py-16">
                    暂无数据，点击右上角「新增行」或「导入 CSV」。
                  </td>
                </tr>
              )}
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-t border-ink-50 hover:bg-ink-50/60 transition-colors ${
                    i % 2 ? 'bg-ink-50/20' : ''
                  } ${p.isBoundary ? 'bg-amber-50/40' : ''}`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 rounded border-ink-300"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-serif text-ink-800">
                    {p.condition}
                    {p.isBoundary && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        边界
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-ink-700">{p.outcome}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-ink-600">{p.conditionCount}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-ink-600">{p.jointCount}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono font-semibold text-ink-800">{formatPercent(p.probability)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <DataStatusBadge status={p.status as DataStatus} />
                  </td>
                  <td className="px-3 py-2.5">
                    <ReviewStatusBadge status={p.reviewStatus} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-md text-ink-500 hover:text-ink-800 hover:bg-ink-100 transition-colors"
                        title="编辑"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确认删除该参数？相关变更日志也会被清除。')) deleteParam(p.id);
                        }}
                        className="p-1.5 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-ink-100 bg-ink-50/50 text-xs text-ink-500 flex items-center justify-between">
          <span>共 {filtered.length} 条参数 · 选中 {selected.size} 条</span>
          <span>相同「条件 + 结果」视为同一条数据，导入时会自动去重。</span>
        </div>
      </div>

      <EditParamModal open={editOpen} onClose={() => setEditOpen(false)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
