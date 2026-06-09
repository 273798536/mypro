import { Link } from 'react-router-dom';
import { Clock, User, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { Draft } from '@/types';
import { useDraftStore } from '@/store/draftStore';
import { AvailabilityBadge } from './AvailabilityBadge';
import { cn } from '@/lib/utils';

export function DraftSidebar() {
  const { drafts, activeDraftId, setActiveDraft } = useDraftStore();

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-indigo-900/50 bg-gradient-to-b from-indigo-950 via-indigo-950 to-slate-950 text-slate-200">
      <div className="border-b border-indigo-900/60 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/50">
            <span className="text-lg">📡</span>
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold tracking-wide text-white">傅里叶噪声滤波台</h1>
            <p className="text-xs text-indigo-300/80">计算草稿 · 可追溯可复核</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-300/70">
          草稿时间线
        </div>
        <div className="relative space-y-1">
          <div className="absolute left-[17px] top-2 bottom-2 w-px bg-indigo-800/50" />
          {drafts.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              isActive={d.id === activeDraftId}
              onClick={() => setActiveDraft(d.id)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-indigo-900/60 px-4 py-3">
        <Link
          to="/operation"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-700/50 bg-indigo-900/40 px-3 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-800/50"
        >
          <span>👁</span>
          切换运营视图
        </Link>
      </div>
    </aside>
  );
}

function DraftCard({
  draft,
  isActive,
  onClick,
}: {
  draft: Draft;
  isActive: boolean;
  onClick: () => void;
}) {
  const available = draft.dataRows.filter((r) => r.availability === 'available').length;
  const pending = draft.dataRows.filter((r) => r.availability === 'pending').length;
  const recollect = draft.dataRows.filter((r) => r.availability === 'recollect').length;
  const last = draft.versionLogs[draft.versionLogs.length - 1];

  return (
    <Link
      to={`/draft/${draft.id}`}
      onClick={onClick}
      className={cn(
        'group relative block rounded-lg border px-3 py-3 transition',
        isActive
          ? 'border-indigo-500/70 bg-indigo-900/50 shadow-inner shadow-indigo-950'
          : 'border-transparent hover:border-indigo-800/60 hover:bg-indigo-900/30',
      )}
    >
      <div className="absolute left-[-9px] top-5 h-3 w-3 rounded-full border-2 border-indigo-950 bg-indigo-400 shadow ring-2 ring-indigo-500/40 group-hover:bg-indigo-300" />

      <div className="flex items-start justify-between gap-2 pl-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-white">{draft.title}</h3>
            <span className="rounded bg-indigo-800/60 px-1.5 py-0.5 text-[10px] font-mono text-indigo-200">
              {draft.currentVersion}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-indigo-300/80">
            <span className="flex items-center gap-1">
              <User size={10} />
              {draft.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {draft.updatedAt.slice(5)}
            </span>
          </div>
          {last && (
            <p className="mt-1.5 line-clamp-1 flex items-start gap-1 text-[11px] text-indigo-200/70">
              <FileText size={10} className="mt-0.5 shrink-0" />
              {last.changelog}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 pl-3">
        <span className="flex items-center gap-1 rounded bg-emerald-900/40 px-1.5 py-0.5 text-[10px] text-emerald-300">
          <CheckCircle2 size={9} /> {available}
        </span>
        <span className="flex items-center gap-1 rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-300">
          <AlertTriangle size={9} /> {pending}
        </span>
        <span className="flex items-center gap-1 rounded bg-rose-900/40 px-1.5 py-0.5 text-[10px] text-rose-300">
          <XCircle size={9} /> {recollect}
        </span>
        <span className="ml-auto text-[10px] text-indigo-400">共 {draft.dataRows.length} 条</span>
      </div>

      <AvailabilityBar available={available} pending={pending} recollect={recollect} total={draft.dataRows.length} />
    </Link>
  );
}

function AvailabilityBar({
  available,
  pending,
  recollect,
  total,
}: {
  available: number;
  pending: number;
  recollect: number;
  total: number;
}) {
  if (total === 0) return null;
  return (
    <div className="mt-2 ml-3 flex h-1 overflow-hidden rounded-full bg-indigo-950/80">
      <div className="bg-emerald-500" style={{ width: `${(available / total) * 100}%` }} />
      <div className="bg-amber-500" style={{ width: `${(pending / total) * 100}%` }} />
      <div className="bg-rose-500" style={{ width: `${(recollect / total) * 100}%` }} />
    </div>
  );
}
