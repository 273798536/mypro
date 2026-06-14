import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import StatusBadge from '@/components/StatusBadge'
import {
  Music2,
  CheckCircle2,
  Circle,
  PackagePlus,
  Clock,
  GitBranch,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { formatDateTime, formatDate } from '@/utils/format'
import { cn } from '@/lib/utils'
import type { TrackItem } from '@/types'

export default function TracksPage() {
  const { tracks, conflicts, fetchTracks, fetchConflicts, toggleTrackConfirmed } = useAppStore()
  const [openBatches, setOpenBatches] = useState<Set<number>>(new Set([1, 2, 3]))

  useEffect(() => {
    void fetchTracks()
    void fetchConflicts()
  }, [fetchTracks, fetchConflicts])

  const batches = useMemo(() => {
    return Object.keys(tracks)
      .map(Number)
      .sort((a, b) => a - b)
  }, [tracks])

  const toggleBatch = (b: number) => {
    const next = new Set(openBatches)
    if (next.has(b)) next.delete(b)
    else next.add(b)
    setOpenBatches(next)
  }

  const totalTracks = batches.reduce((s, b) => s + (tracks[b]?.length || 0), 0)
  const confirmedCount = batches.reduce(
    (s, b) => s + (tracks[b]?.filter((t) => t.confirmed).length || 0),
    0,
  )
  const supplementaryCount = batches.reduce(
    (s, b) => s + (tracks[b]?.filter((t) => t.is_supplementary).length || 0),
    0,
  )

  const conflictMap = useMemo(() => {
    const m = new Map<string, (typeof conflicts)[number]>()
    for (const c of conflicts) m.set(c.id, c)
    return m
  }, [conflicts])

  // Main line: 阿蓝从曲目表拼出的主线
  const mainLineTracks = batches.flatMap((b) => tracks[b] || [])

  return (
    <div className="space-y-6">
      <header className="animate-fade-in-up">
        <h2 className="font-display text-3xl text-white mb-1">曲目表 · 分批凑齐</h2>
        <p className="text-slate-400 text-sm">
          曲目表常分几次凑齐，演出统筹阿蓝能从列表拼出巡演主线。
          <span className="text-amber-300"> 后补材料（批次 ≥3）</span>
          不会无声覆盖早先判断，补入时间一目了然。
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 animate-count-in stagger-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/60 mb-1">曲目总数</p>
              <p className="font-display text-4xl text-white">{totalTracks}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/20 flex items-center justify-center">
              <Music2 className="w-5 h-5 text-violet-300" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">覆盖 {batches.length} 个提交批次</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-count-in stagger-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/60 mb-1">已确认曲目</p>
              <p className="font-display text-4xl text-emerald-300">
                {confirmedCount}
                <span className="text-lg text-slate-500 font-sans ml-2">
                  / {totalTracks}
                </span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400"
              style={{ width: `${totalTracks ? (confirmedCount / totalTracks) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-count-in stagger-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/60 mb-1">后补材料</p>
              <p className="font-display text-4xl text-amber-300">{supplementaryCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/20 flex items-center justify-center">
              <PackagePlus className="w-5 h-5 text-amber-300" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            已标记保留早先判断，不做覆盖
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 space-y-4">
          {batches.map((b, i) => {
            const arr = tracks[b] || []
            const isSupp = b >= 3
            const open = openBatches.has(b)
            const submitDate = arr[0]?.submitted_at
            return (
              <div
                key={b}
                className={cn(
                  'glass-card rounded-2xl overflow-hidden animate-fade-in-up',
                  isSupp && 'border-amber-400/30',
                  `stagger-${Math.min(6, i + 1)}`,
                )}
              >
                <button
                  onClick={() => toggleBatch(b)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center font-display text-lg',
                        isSupp
                          ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 text-amber-200 border border-amber-400/30'
                          : 'bg-violet-500/15 text-violet-200 border border-violet-400/20',
                      )}
                    >
                      {b}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">第 {b} 批曲目</p>
                        {isSupp && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200">
                            <PackagePlus className="w-3 h-3" />
                            后补材料
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        提交于 {submitDate ? formatDate(submitDate) : '—'} · 共 {arr.length} 首
                      </p>
                    </div>
                  </div>
                  <GitBranch
                    className={cn(
                      'w-4 h-4 text-slate-500 transition-transform',
                      open && 'rotate-90',
                    )}
                  />
                </button>
                {open && (
                  <div className="border-t border-white/5 px-5 py-3 space-y-2">
                    {arr.map((t) => (
                      <TrackRow
                        key={t.id}
                        track={t}
                        conflict={t.conflict_id ? conflictMap.get(t.conflict_id) : undefined}
                        isSupplementary={!!t.is_supplementary}
                        onToggleConfirmed={(v) => void toggleTrackConfirmed(t.id, v)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="xl:col-span-2">
          <div className="glass-card rounded-2xl p-5 sticky top-6 animate-fade-in-up stagger-3">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-violet-300" />
              <h3 className="font-display text-lg text-white">阿蓝拼出的巡演主线</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-5">
              从分批曲目表里拼出的主线顺序，已确认项高亮。老师只需看"学生哪里进步"会在末尾时间戳出现。
            </p>

            <ol className="relative pl-2 space-y-4">
              <span className="absolute left-[18px] top-3 bottom-3 w-px bg-gradient-to-b from-violet-500/50 via-amber-500/40 to-transparent" />
              {mainLineTracks.map((t, i) => {
                const c = t.conflict_id ? conflictMap.get(t.conflict_id) : undefined
                return (
                  <li key={t.id} className="relative pl-10 animate-fade-in-up">
                    <div
                      className={cn(
                        'absolute left-1 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                        t.confirmed
                          ? 'bg-emerald-500 border-emerald-400'
                          : c
                            ? c.status === 'auth_expired'
                              ? 'bg-violet-500/30 border-violet-400'
                              : c.status === 'name_mismatch'
                                ? 'bg-amber-500/30 border-amber-400'
                                : 'bg-slate-700 border-slate-500'
                            : 'bg-slate-700 border-slate-500',
                      )}
                    >
                      {t.confirmed && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2.5 border transition-colors',
                        t.confirmed
                          ? 'bg-emerald-500/5 border-emerald-400/20'
                          : 'bg-white/[0.02] border-white/5',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-white text-sm">{t.display_name}</p>
                            <span className="text-[10px] text-slate-500">#{i + 1}</span>
                            {t.is_supplementary && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-200 border border-amber-400/25">
                                后补
                              </span>
                            )}
                          </div>
                          {t.name !== t.display_name && (
                            <p className="text-[11px] text-amber-300 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              原始名称与展示名不一致: "{t.name}"
                            </p>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 shrink-0">
                          批次 {t.batch}
                        </div>
                      </div>
                      {c && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <StatusBadge status={c.status} />
                          <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            {c.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
              <li className="relative pl-10">
                <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-amber-500 shadow-lg shadow-amber-500/40" />
                <div className="rounded-lg px-3 py-2.5 bg-gradient-to-r from-violet-500/10 to-amber-500/5 border border-violet-400/20">
                  <p className="text-xs font-medium text-white flex items-center gap-2">
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                      收尾
                    </span>
                    老师查看学生进步情况
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    进度总结 · 最后一次补充 {formatDateTime(new Date().toISOString())}
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  )
}

function TrackRow({
  track,
  conflict,
  isSupplementary,
  onToggleConfirmed,
}: {
  track: TrackItem
  conflict?: ReturnType<typeof useAppStore.getState>['conflicts'][number]
  isSupplementary: boolean
  onToggleConfirmed: (v: boolean) => void
}) {
  const mismatch = track.name !== track.display_name
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border transition-all',
        isSupplementary
          ? 'bg-amber-500/[0.04] border-amber-400/15 hover:border-amber-400/30'
          : 'bg-white/[0.02] border-white/5 hover:border-white/10',
      )}
    >
      <button
        onClick={() => onToggleConfirmed(!track.confirmed)}
        className="mt-0.5 shrink-0 transition-transform hover:scale-110"
      >
        {track.confirmed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-white text-sm truncate">{track.display_name}</p>
          {mismatch && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-200 border border-amber-400/30">
              <AlertCircle className="w-3 h-3" />
              名称不一致
            </span>
          )}
        </div>
        {mismatch && (
          <p className="text-[11px] text-amber-300/90 mt-1">
            原始名: "{track.name}" — 可能是后补版本，已保留不覆盖
          </p>
        )}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDateTime(track.submitted_at)}
          </span>
          {conflict && <StatusBadge status={conflict.status} />}
        </div>
      </div>
    </div>
  )
}
