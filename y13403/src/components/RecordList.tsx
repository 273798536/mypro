import { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { StatusBadge, ResultBadge } from './Badges';
import type { RecordStatus, TopoRecord } from '@shared/types';
import { STATUS_LABEL } from '@shared/types';
import { Search, Filter, Clock, AlertCircle, GitBranch, Loader } from 'lucide-react';
import { clsx } from 'clsx';

const FILTERS: Array<{ value: RecordStatus | 'all'; label: string; color?: string }> = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: STATUS_LABEL.pending },
  { value: 'confirmed', label: STATUS_LABEL.confirmed },
  { value: 'need_evidence', label: STATUS_LABEL.need_evidence },
  { value: 'manual_overruled', label: STATUS_LABEL.manual_overruled },
  { value: 'revoked', label: STATUS_LABEL.revoked },
];

function RecordRow({ record, selected }: { record: TopoRecord; selected: boolean }) {
  const select = useApp((s) => s.setSelectedId);
  const setMode = useApp((s) => s.setRightPanelMode);
  const confirm = useApp((s) => s.doConfirm);
  const revoke = useApp((s) => s.doRevoke);

  const handleSelect = () => {
    select(record.id);
    setMode('computation');
  };

  const fmt = (t: string) => new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div
      onClick={handleSelect}
      className={clsx(
        'group px-3 py-2.5 border-b border-white/5 cursor-pointer transition-colors',
        selected ? 'bg-sky-500/10' : 'hover:bg-white/5',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-zinc-100">{record.recordNo}</span>
            {record.noMismatch && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-px rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <AlertCircle className="w-2.5 h-2.5" />
                编号不一致
              </span>
            )}
            {record.isLateSubmission && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-px rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Clock className="w-2.5 h-2.5" />
                迟到材料
              </span>
            )}
            {record.currentVersion > 1 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-px rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <GitBranch className="w-2.5 h-2.5" />
                v{record.currentVersion}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-zinc-500 font-mono">{record.paramVersion}</span>
            <span className="text-zinc-700">·</span>
            <StatusBadge status={record.status} />
            <ResultBadge result={record.boundaryResult} />
          </div>
          {record.remark && (
            <p className="text-[11px] text-zinc-400 mt-1.5 truncate max-w-md">
              💬 {record.remark}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-zinc-500 font-mono mr-1">{fmt(record.updatedAt)}</span>
          <button
            onClick={() => confirm(record.id)}
            disabled={record.status === 'confirmed'}
            className="text-[11px] px-2 py-1 rounded border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            确认
          </button>
          <button
            onClick={() => revoke(record.id)}
            className="text-[11px] px-2 py-1 rounded border border-zinc-500/30 text-zinc-300 hover:bg-zinc-500/10 transition"
          >
            撤回
          </button>
          <button
            onClick={() => {
              select(record.id);
              setMode('exception');
            }}
            className="text-[11px] px-2 py-1 rounded border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 transition"
          >
            改判
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecordList() {
  const records = useApp((s) => s.records);
  const loading = useApp((s) => s.loading);
  const selectedId = useApp((s) => s.selectedId);
  const statusFilter = useApp((s) => s.statusFilter);
  const setStatusFilter = useApp((s) => s.setStatusFilter);
  const keyword = useApp((s) => s.keyword);
  const setKeyword = useApp((s) => s.setKeyword);
  const loadRecords = useApp((s) => s.loadRecords);
  const doExport = useApp((s) => s.doExport);

  useEffect(() => {
    const t = setTimeout(() => loadRecords(), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, keyword]);

  return (
    <div className="flex flex-col h-full rounded-lg border border-white/10 bg-surface-800/60 shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索编号、备注、版本..."
            className="w-full pl-8 pr-3 py-1.5 rounded bg-surface-900/70 border border-white/10 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500/40"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1" />
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={clsx(
                'text-[11px] px-2 py-1 rounded border transition',
                statusFilter === f.value
                  ? 'border-sky-500/50 bg-sky-500/15 text-sky-200'
                  : 'border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={doExport}
          className="text-[11px] px-2.5 py-1.5 rounded border border-white/10 text-zinc-300 hover:bg-white/5 transition"
        >
          导出 CSV
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader className="w-5 h-5 text-sky-400 animate-spin" />
            <p className="text-xs text-zinc-500">加载中...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Search className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">没有符合条件的记录</p>
            <p className="text-[11px] text-zinc-600">试试调整筛选或导入新数据</p>
          </div>
        ) : (
          records.map((r) => <RecordRow key={r.id} record={r} selected={r.id === selectedId} />)
        )}
      </div>
    </div>
  );
}
