import { useState } from 'react';
import type { Draft, DataRow, AvailabilityStatus } from '@/types';
import { AvailabilityBadge, ReviewBadge } from './AvailabilityBadge';
import { useDraftStore } from '@/store/draftStore';
import { cn } from '@/lib/utils';
import { MessageSquare, AlertOctagon, Copy, Check } from 'lucide-react';

export function DataTable({ draft }: { draft: Draft }) {
  const { setRowAvailability, updateDataRow } = useDraftStore();
  const [filter, setFilter] = useState<'all' | AvailabilityStatus>('all');

  const filtered = filter === 'all' ? draft.dataRows : draft.dataRows.filter((r) => r.availability === filter);

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="font-serif text-sm font-bold text-slate-800">计算草稿明细</h3>
          <p className="text-xs text-slate-500">
            显示 {filtered.length} / {draft.dataRows.length} 条，支持空值、重复、备注混排
          </p>
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'available', 'pending', 'recollect', null] as const).map((f) => (
            <button
              key={f ?? 'unmarked'}
              onClick={() => setFilter(f as any)}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium transition',
                filter === f
                  ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
                  : 'text-slate-500 hover:bg-slate-100',
              )}
            >
              {f === 'all' ? '全部' : f === null ? '未标记' : f === 'available' ? '可用' : f === 'pending' ? '暂缓' : '重新采集'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
            <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">X (频率)</th>
              <th className="px-3 py-2 font-medium">Y (原始)</th>
              <th className="px-3 py-2 font-medium">FFT振幅</th>
              <th className="px-3 py-2 font-medium">滤波后</th>
              <th className="px-3 py-2 font-medium">可用性</th>
              <th className="px-3 py-2 font-medium">复核</th>
              <th className="px-3 py-2 font-medium">备注</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <Row
                key={row.id}
                row={row}
                onAvailability={(s) => setRowAvailability(draft.id, row.id, s)}
                onRemark={(v) => updateDataRow(draft.id, row.id, { remark: v })}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  row,
  onAvailability,
  onRemark,
}: {
  row: DataRow;
  onAvailability: (s: AvailabilityStatus) => void;
  onRemark: (v: string) => void;
}) {
  const [editingRemark, setEditingRemark] = useState(false);

  return (
    <tr
      className={cn(
        'border-b border-slate-100 transition hover:bg-indigo-50/40',
        row.isEmpty && 'bg-slate-50/70',
        row.isDuplicate && 'border-l-4 border-l-amber-400 bg-amber-50/30',
      )}
    >
      <td className="px-3 py-1.5 font-mono text-slate-500">{row.index}</td>
      <td className={cn('px-3 py-1.5 font-mono', row.isEmpty ? 'italic text-slate-400' : 'text-slate-700')}>
        {row.xValue === null ? '—' : row.xValue}
        {row.isEmpty && <span className="ml-1 rounded bg-slate-200 px-1 text-[9px] text-slate-500">空</span>}
      </td>
      <td className={cn('px-3 py-1.5 font-mono', row.isEmpty ? 'italic text-slate-400' : 'text-slate-700')}>
        {row.yValue === null ? '—' : row.yValue}
      </td>
      <td className="px-3 py-1.5 font-mono text-indigo-700">{row.fftAmplitude === null ? '—' : row.fftAmplitude}</td>
      <td className="px-3 py-1.5 font-mono text-emerald-700">
        {row.filteredAmplitude === null ? '—' : row.filteredAmplitude}
      </td>
      <td className="px-3 py-1.5">
        <select
          value={row.availability ?? ''}
          onChange={(e) => onAvailability((e.target.value || null) as AvailabilityStatus)}
          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] focus:border-indigo-400 focus:outline-none"
        >
          <option value="">未标记</option>
          <option value="available">可用</option>
          <option value="pending">暂缓</option>
          <option value="recollect">重新采集</option>
        </select>
      </td>
      <td className="px-3 py-1.5">
        <ReviewBadge status={row.reviewStatus} />
        {row.isDuplicate && (
          <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 text-[9px] text-amber-700">
            <Copy size={8} /> 重复
          </span>
        )}
      </td>
      <td className="px-3 py-1.5 max-w-[220px]">
        {editingRemark ? (
          <input
            autoFocus
            defaultValue={row.remark ?? ''}
            onBlur={(e) => {
              onRemark(e.target.value);
              setEditingRemark(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRemark((e.target as HTMLInputElement).value);
                setEditingRemark(false);
              }
            }}
            className="w-full rounded border border-indigo-300 bg-indigo-50 px-1.5 py-0.5 text-[11px] focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingRemark(true)}
            className={cn(
              'group flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] transition',
              row.remark
                ? 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
            )}
          >
            {row.remark ? (
              <>
                <MessageSquare size={10} />
                <span className="line-clamp-1">{row.remark}</span>
              </>
            ) : (
              <>
                <Check size={10} className="opacity-0 group-hover:opacity-50" />
                <span>添加备注</span>
              </>
            )}
            {row.remark && /评分|补录|补一版|边界|口径/i.test(row.remark) && (
              <span className="ml-auto shrink-0 rounded bg-violet-100 px-1 text-[9px] font-medium text-violet-700">
                <AlertOctagon size={8} className="mr-0.5 inline" />
                修订
              </span>
            )}
          </button>
        )}
      </td>
    </tr>
  );
}
