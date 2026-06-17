import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  RefreshCw,
  Download,
  ChevronDown,
  FileSpreadsheet,
  SearchX,
  FilterX,
} from 'lucide-react';
import { useRampStore } from '@/store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { SOURCE_ORDER, STATUS_ORDER, sourceMeta, statusMeta } from '@/lib/ui';
import { StatCards } from '@/components/StatCards';
import { OverrideTag, SourceBadge, StatusChip } from '@/components/badges';
import { fmtDateTime, relativeDay } from '@/lib/ui';
import type { RampStatus, Source } from '@shared/types';

export default function Home() {
  const navigate = useNavigate();
  const {
    ramps,
    loading,
    error,
    filters,
    lastRun,
    fetchRamps,
    setFilter,
    resetFilters,
    generate,
    rerun,
  } = useRampStore();

  useEffect(() => {
    void fetchRamps();
  }, [fetchRamps]);

  const isEmpty = ramps.length === 0 && !loading;

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            公示清单
          </h1>
          <p className="mt-1 text-sm text-muted">
            每条坡道都可追溯到改判来源与当前状态；筛选、详情、导出全程留标记。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary" onClick={() => generate()} disabled={loading}>
            <Play className="h-4 w-4" />
            启动生成
          </button>
          <button className="btn" onClick={() => rerun()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            重跑
          </button>
          <ExportMenu />
        </div>
      </div>

      {lastRun && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-xs text-ink/80">
          <span className="font-mono uppercase tracking-wider text-accent">
            {lastRun.runType === 'generate' ? '启动' : '重跑'}
          </span>
          <span>{lastRun.message}</span>
          <span className="ml-auto font-mono text-muted">
            已处理 {lastRun.processed} · 待补 {lastRun.pending} · 人工改判 {lastRun.overridden}
            {lastRun.runType === 'rerun' && ` · 对齐 ${lastRun.reconciled}`}
          </span>
        </div>
      )}

      <StatCards ramps={ramps} />

      {isEmpty ? (
        <EmptyState onGenerate={() => generate()} />
      ) : (
        <>
          <FilterBar filters={filters} setFilter={setFilter} resetFilters={resetFilters} />

          {error && (
            <div className="rounded-lg border border-status-overridden/30 bg-status-overridden/5 px-3 py-2 text-sm text-status-overridden">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper text-left font-mono text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-4 py-2.5 font-medium">坡道 / 桥</th>
                    <th className="px-4 py-2.5 font-medium">来源标记</th>
                    <th className="px-4 py-2.5 font-medium">当前状态</th>
                    <th className="px-4 py-2.5 font-medium">最近改判</th>
                    <th className="px-4 py-2.5 text-center font-medium">改判</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {ramps.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/ramps/${r.id}`)}
                      className={cn(
                        'group cursor-pointer border-b border-line/70 transition-colors hover:bg-paper',
                        r.isOverriding && 'bg-signal/[0.035]',
                      )}
                    >
                      <td className="relative px-4 py-3">
                        {r.isOverriding && (
                          <span className="absolute left-0 top-0 h-full w-1 bg-signal" />
                        )}
                        <div className="font-medium text-ink">{r.name}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-muted">
                          {r.bridgeName} · {r.address}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {r.sources.length === 0 && (
                            <span className="text-xs text-muted">—</span>
                          )}
                          {r.sources.map((s) => (
                            <SourceBadge key={s} source={s} />
                          ))}
                          <OverrideTag active={r.isOverriding} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        {r.lastChangeSource ? (
                          <div className="space-y-0.5">
                            <SourceBadge source={r.lastChangeSource} />
                            <div className="font-mono text-[11px] text-muted">
                              {fmtDateTime(r.lastChangeAt)} · {relativeDay(r.lastChangeAt)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-ink/70">
                        {r.changeCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100">
                          查看详情 →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ExportMenu() {
  const items: { label: string; status?: RampStatus }[] = [
    { label: '全部分类', status: undefined },
    { label: statusMeta.processed.label, status: 'processed' },
    { label: statusMeta.pending.label, status: 'pending' },
    { label: statusMeta.overridden.label, status: 'overridden' },
  ];
  return (
    <details className="relative">
      <summary className="btn cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <Download className="h-4 w-4" />
        导出 CSV
        <ChevronDown className="h-3.5 w-3.5" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-52 rounded-md border border-line bg-surface p-1 shadow-card">
        {items.map((it) => (
          <a
            key={it.label}
            href={api.exportCsvUrl(it.status)}
            className="flex items-center gap-2 rounded px-2.5 py-1.5 text-sm text-ink hover:bg-paper"
          >
            <FileSpreadsheet className="h-4 w-4 text-muted" />
            {it.label}
          </a>
        ))}
      </div>
    </details>
  );
}

function FilterBar({
  filters,
  setFilter,
  resetFilters,
}: {
  filters: { source?: Source; status?: RampStatus; overriding?: boolean };
  setFilter: (f: { source?: Source; status?: RampStatus; overriding?: boolean }) => void;
  resetFilters: () => void;
}) {
  const activeCount =
    (filters.source ? 1 : 0) + (filters.status ? 1 : 0) + (filters.overriding !== undefined ? 1 : 0);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
      <FilterGroup label="来源">
        <FilterChip active={!filters.source} onClick={() => setFilter({ source: undefined })}>
          全部
        </FilterChip>
        {SOURCE_ORDER.map((s) => (
          <FilterChip
            key={s}
            active={filters.source === s}
            onClick={() => setFilter({ source: filters.source === s ? undefined : s })}
            dot={sourceMeta[s].alert ? 'bg-signal' : 'bg-accent'}
          >
            {sourceMeta[s].label}
          </FilterChip>
        ))}
      </FilterGroup>

      <span className="hidden h-5 w-px bg-line sm:block" />

      <FilterGroup label="状态">
        <FilterChip active={!filters.status} onClick={() => setFilter({ status: undefined })}>
          全部
        </FilterChip>
        {STATUS_ORDER.map((s) => (
          <FilterChip
            key={s}
            active={filters.status === s}
            onClick={() => setFilter({ status: filters.status === s ? undefined : s })}
            dot={statusMeta[s].dot}
          >
            {statusMeta[s].label}
          </FilterChip>
        ))}
      </FilterGroup>

      <span className="hidden h-5 w-px bg-line sm:block" />

      <FilterGroup label="覆盖">
        <FilterChip active={filters.overriding === undefined} onClick={() => setFilter({ overriding: undefined })}>
          全部
        </FilterChip>
        <FilterChip
          active={filters.overriding === true}
          onClick={() => setFilter({ overriding: filters.overriding === true ? undefined : true })}
          dot="bg-signal"
        >
          仅覆盖
        </FilterChip>
      </FilterGroup>

      {activeCount > 0 && (
        <button className="btn ml-auto" onClick={resetFilters}>
          <FilterX className="h-4 w-4" />
          清除筛选
        </button>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-accent bg-accent text-white'
          : 'border-line bg-paper text-muted hover:text-ink',
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
      {children}
    </button>
  );
}

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
        <SearchX className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">公示清单尚未生成</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
        点击「启动生成」处理材料并得到坡道当前状态；之后每次改判都会记录来源、前后状态与影响的判断。
      </p>
      <button className="btn btn-primary mx-auto mt-4" onClick={onGenerate}>
        <Play className="h-4 w-4" />
        启动生成公示清单
      </button>
    </div>
  );
}
