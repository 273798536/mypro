import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import StatusBadge from '@/components/StatusBadge'
import {
  FileEdit,
  ShieldAlert,
  Calendar,
  ArrowLeft,
  Save,
  PackagePlus,
  History,
  User,
  Sparkles,
} from 'lucide-react'
import { formatDateTime } from '@/utils/format'
import { ROLE_LABEL, STATUS_LABEL } from '@/types'
import type { ConflictStatus } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  conflictId?: string
}

export default function NotesPage({ conflictId }: Props) {
  const navigate = useNavigate()
  const {
    currentConflict,
    currentHistory,
    fetchConflictDetail,
    updateConflict,
    loading,
    conflicts,
    fetchConflicts,
  } = useAppStore()

  useEffect(() => {
    void fetchConflicts()
  }, [fetchConflicts])

  const activeId = conflictId || currentConflict?.id || conflicts[0]?.id

  useEffect(() => {
    if (activeId) void fetchConflictDetail(activeId)
  }, [activeId, fetchConflictDetail])

  const [note, setNote] = useState('')
  const [authExpired, setAuthExpired] = useState(false)
  const [authNote, setAuthNote] = useState('')
  const [status, setStatus] = useState<ConflictStatus>('normal')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentConflict) {
      setNote(currentConflict.note)
      setAuthExpired(!!currentConflict.auth_expired)
      setAuthNote(currentConflict.auth_note)
      setStatus(currentConflict.status)
    }
  }, [currentConflict])

  const canSave = !saving && !!currentConflict

  const handleSave = async () => {
    if (!currentConflict || !canSave) return
    setSaving(true)
    await updateConflict(currentConflict.id, { note, authExpired, authNote, status })
    setSaving(false)
  }

  if (!activeId) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center animate-fade-in-up">
        <p className="text-slate-400">暂无冲突记录可编辑</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="animate-fade-in-up flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="font-display text-3xl text-white flex items-center gap-2">
            <FileEdit className="w-7 h-7 text-violet-400" />
            备注编辑
          </h2>
          <p className="text-slate-400 text-sm">
            修改后即时同步后端数据与导出清单；后补材料以"补充"标记保留历史，不覆盖早先判断。
          </p>
        </div>
      </header>

      {loading && !currentConflict && (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400 animate-pulse">
          加载中...
        </div>
      )}

      {currentConflict && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <div className="xl:col-span-3 space-y-4">
            <div className="glass-card rounded-2xl p-6 animate-fade-in-up stagger-1">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="font-display text-xl text-white mb-2">
                    {currentConflict.title}
                  </h3>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      创建 {formatDateTime(currentConflict.created_at)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <History className="w-3 h-3" />
                      更新 {formatDateTime(currentConflict.updated_at)}
                    </span>
                  </div>
                </div>
                <StatusBadge status={currentConflict.status} size="md" />
              </div>

              <div className="space-y-5">
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">状态</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(STATUS_LABEL) as ConflictStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={cn(
                          'px-3 py-1.5 text-xs rounded-lg border transition-all',
                          status === s
                            ? s === 'normal'
                              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                              : s === 'auth_expired'
                                ? 'bg-violet-500/20 border-violet-400/40 text-violet-200'
                                : 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                            : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white',
                        )}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">
                      冲突备注
                    </span>
                    {note !== currentConflict.note && (
                      <span className="text-[10px] text-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        有未保存更改
                      </span>
                    )}
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={5}
                    placeholder="填写对这场巡演耳返排期冲突的判断、协调进展、收尾问题等..."
                    className="w-full rounded-xl bg-black/30 border border-white/5 focus:border-violet-400/50 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-colors resize-none"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    保存后，早先判断会以变更历史保留，后补材料不会无声覆盖。
                  </p>
                </div>

                <div className="rounded-2xl p-4 bg-violet-500/[0.04] border border-violet-400/15">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-violet-300" />
                      <span className="text-sm font-medium text-violet-200">
                        授权到期
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setAuthExpired((v) => {
                          const nv = !v
                          if (nv && status === 'normal') setStatus('auth_expired')
                          return nv
                        })
                      }}
                      className={cn(
                        'relative w-11 h-6 rounded-full transition-colors',
                        authExpired ? 'bg-violet-500' : 'bg-white/10',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                          authExpired ? 'translate-x-[22px]' : 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </div>
                  <textarea
                    value={authNote}
                    onChange={(e) => setAuthNote(e.target.value)}
                    disabled={!authExpired}
                    rows={3}
                    placeholder={
                      authExpired
                        ? '填写授权备注：到期时间、申请进度、影响范围等...'
                        : '开关开启后可填写。授权到期记录将在导出时单独拎出。'
                    }
                    className={cn(
                      'w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors',
                      authExpired
                        ? 'bg-black/30 border border-violet-400/20 focus:border-violet-400/50 text-white placeholder:text-slate-600'
                        : 'bg-white/[0.02] border border-white/5 text-slate-500 placeholder:text-slate-600',
                    )}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-slate-500">
                    保存后：后端数据更新 → 导出清单同步 → 状态摘要对得上
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={!canSave}
                    className={cn(
                      'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all',
                      canSave
                        ? 'bg-gradient-to-r from-violet-500 to-amber-500 hover:from-violet-400 hover:to-amber-400 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40'
                        : 'bg-white/5 text-slate-500 cursor-not-allowed',
                    )}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? '保存中...' : '保存并同步'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-2">
            <div className="glass-card rounded-2xl p-5 sticky top-6 animate-fade-in-up stagger-2">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-violet-300" />
                <h3 className="font-display text-lg text-white">变更历史</h3>
              </div>
              <p className="text-[11px] text-slate-500 mb-5">
                早先判断完整保留，后补材料标记为"补充"。老师在收尾时补充的内容也会记录在案。
              </p>

              <ol className="relative space-y-4 pl-1">
                <span className="absolute left-[14px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-500/50 via-amber-500/40 to-transparent" />
                {currentHistory.length === 0 && (
                  <li className="text-center text-slate-500 text-sm py-6">暂无历史记录</li>
                )}
                {currentHistory.map((h, i) => (
                  <li
                    key={h.id}
                    className={cn(
                      'relative pl-9 animate-fade-in-up',
                      `stagger-${Math.min(6, i + 1)}`,
                    )}
                  >
                    <div
                      className={cn(
                        'absolute left-0 top-1 w-7 h-7 rounded-full border-2 flex items-center justify-center',
                        h.is_supplementary
                          ? 'bg-amber-500/20 border-amber-400/60'
                          : h.operator_role === 'teacher'
                            ? 'bg-sky-500/20 border-sky-400/50'
                            : 'bg-violet-500/20 border-violet-400/50',
                      )}
                    >
                      <User className="w-3 h-3 text-white/80" />
                    </div>
                    <div
                      className={cn(
                        'rounded-xl p-3 border',
                        h.is_supplementary
                          ? 'bg-amber-500/[0.05] border-amber-400/20'
                          : 'bg-white/[0.02] border-white/5',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-white">
                            {ROLE_LABEL[h.operator_role]}
                          </span>
                          {h.is_supplementary && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200">
                              <PackagePlus className="w-2.5 h-2.5" />
                              补充（不覆盖）
                            </span>
                          )}
                          {h.operator_role === 'teacher' && !h.is_supplementary && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-200">
                              老师在收尾补充
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {formatDateTime(h.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {h.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
