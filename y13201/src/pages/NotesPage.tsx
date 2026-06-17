import { useEffect, useState, useMemo, useCallback } from 'react'
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
  AlertTriangle,
  CheckCircle2,
  XCircle,
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
  const [authExpired, setAuthExpiredState] = useState(false)
  const [authNote, setAuthNoteState] = useState('')
  const [status, setStatusState] = useState<ConflictStatus>('normal')
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<{
    ok: boolean
    msg: string
  } | null>(null)

  useEffect(() => {
    if (currentConflict) {
      setNote(currentConflict.note)
      setAuthExpiredState(!!currentConflict.auth_expired)
      setAuthNoteState(currentConflict.auth_note)
      setStatusState(currentConflict.status)
      setLastSavedAt(currentConflict.updated_at)
      setSaveResult(null)
    }
  }, [currentConflict])

  const setAuthExpired = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      setAuthExpiredState((prev) => {
        const next = typeof v === 'function' ? (v as (p: boolean) => boolean)(prev) : v
        if (next) {
          setStatusState('auth_expired')
        } else {
          setAuthNoteState('')
          setStatusState((s) => (s === 'auth_expired' ? 'normal' : s))
        }
        return next
      })
    },
    [],
  )

  const setAuthNote = useCallback(
    (v: string | ((prev: string) => string)) => {
      setAuthNoteState((prev) => {
        const next = typeof v === 'function' ? (v as (p: string) => string)(prev) : v
        if (next.trim().length > 0) {
          setAuthExpiredState(true)
          setStatusState('auth_expired')
        }
        return next
      })
    },
    [],
  )

  const setStatus = useCallback((s: ConflictStatus) => {
    setStatusState(s)
    if (s === 'auth_expired') {
      setAuthExpiredState(true)
    } else {
      setAuthExpiredState(false)
      setAuthNoteState('')
    }
  }, [])

  const normalized = useMemo(() => {
    const finalAuthExpired = authExpired || authNote.trim().length > 0
    let finalStatus: ConflictStatus = status
    if (finalAuthExpired) finalStatus = 'auth_expired'
    let finalAuthNote = authNote
    if (!finalAuthExpired) finalAuthNote = ''
    return {
      finalAuthExpired,
      finalStatus,
      finalAuthNote,
    }
  }, [authExpired, authNote, status])

  const dirtyFlags = useMemo(() => {
    if (!currentConflict) return { note: false, status: false, auth: false }
    const base = currentConflict
    return {
      note: note !== base.note,
      status:
        normalized.finalStatus !== base.status ||
        normalized.finalAuthExpired !== !!base.auth_expired ||
        normalized.finalAuthNote !== base.auth_note,
      auth:
        normalized.finalAuthExpired !== !!base.auth_expired ||
        normalized.finalAuthNote !== base.auth_note,
    }
  }, [note, normalized, currentConflict])

  const isDirty = dirtyFlags.note || dirtyFlags.status || dirtyFlags.auth

  const canSave = !saving && !!currentConflict && isDirty

  const statusMismatchBeforeNormalize = useMemo(() => {
    const authFilled = authExpired || authNote.trim().length > 0
    return authFilled && status !== 'auth_expired'
  }, [authExpired, authNote, status])

  const handleSave = async () => {
    if (!currentConflict || !canSave) return
    setSaving(true)
    setSaveResult(null)
    const patch = {
      note,
      authExpired: normalized.finalAuthExpired,
      authNote: normalized.finalAuthNote,
      status: normalized.finalStatus,
      operatorRole: 'manager' as const,
    }
    const ok = await updateConflict(currentConflict.id, patch)
    setSaving(false)
    setLastSavedAt(new Date().toISOString())
    if (ok) {
      setSaveResult({
        ok: true,
        msg:
          normalized.finalStatus === 'auth_expired' && status !== normalized.finalStatus
            ? '状态已自动归一为"授权到期"，所有字段已同步'
            : '所有字段已按归一规则保存并同步',
      })
    } else {
      setSaveResult({
        ok: false,
        msg: '保存失败，请查看上方 toast 提示并修正后重试',
      })
    }
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
                    {statusMismatchBeforeNormalize && (
                      <span className="text-[10px] text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        有授权字段：保存时将归一为"授权到期"
                      </span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(STATUS_LABEL) as ConflictStatus[]).map((s) => {
                      const active = normalized.finalStatus === s
                      return (
                        <button
                          key={s}
                          onClick={() => setStatus(s)}
                          className={cn(
                            'px-3 py-1.5 text-xs rounded-lg border transition-all relative',
                            active
                              ? s === 'normal'
                                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                                : s === 'auth_expired'
                                  ? 'bg-violet-500/20 border-violet-400/40 text-violet-200'
                                  : 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                              : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white',
                          )}
                        >
                          {STATUS_LABEL[s]}
                          {active && status !== s && (
                            <span className="absolute -top-1.5 -right-1.5 text-[9px] px-1 rounded bg-amber-500 text-slate-900 font-medium">
                              归一
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {normalized.finalStatus !== status && (
                    <p className="text-[11px] text-amber-300/80 mt-2 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      保存时会从"
                      <span className="font-medium">{STATUS_LABEL[status]}</span>
                      "自动归为"
                      <span className="font-medium text-violet-300">
                        {STATUS_LABEL[normalized.finalStatus]}
                      </span>
                      "（因授权到期相关字段已填写）
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">
                      冲突备注
                    </span>
                    {dirtyFlags.note && (
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
                      onClick={() => setAuthExpired(!authExpired)}
                      className={cn(
                        'relative w-11 h-6 rounded-full transition-colors',
                        normalized.finalAuthExpired
                          ? 'bg-violet-500'
                          : 'bg-white/10',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                          normalized.finalAuthExpired
                            ? 'translate-x-[22px]'
                            : 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </div>
                  <textarea
                    value={normalized.finalAuthNote}
                    onChange={(e) => setAuthNote(e.target.value)}
                    disabled={!normalized.finalAuthExpired && !authNote}
                    rows={3}
                    placeholder={
                      normalized.finalAuthExpired
                        ? '填写授权备注：到期时间、申请进度、影响范围等...（一旦填写将自动置为授权到期状态）'
                        : '开关开启后可填写。填写内容后，系统会自动把状态归为"授权到期"，并在导出时单独拎出。'
                    }
                    className={cn(
                      'w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors',
                      normalized.finalAuthExpired
                        ? 'bg-black/30 border border-violet-400/20 focus:border-violet-400/50 text-white placeholder:text-slate-600'
                        : 'bg-white/[0.02] border border-white/5 text-slate-500 placeholder:text-slate-600',
                    )}
                  />
                  {!normalized.finalAuthExpired && authNote && (
                    <p className="text-[11px] text-amber-300/80 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      检测到你在关闭开关时仍保留了授权备注——保存时会自动清空。
                    </p>
                  )}
                </div>

                <div
                  className={cn(
                    'rounded-2xl p-4 border',
                    isDirty
                      ? 'bg-amber-500/[0.04] border-amber-400/20'
                      : 'bg-white/[0.02] border-white/5',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isDirty ? (
                        <AlertTriangle className="w-4 h-4 text-amber-300" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      )}
                      <span className="text-xs font-medium text-white">
                        保存预览 · 归一后的字段
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full',
                        isDirty
                          ? 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
                          : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30',
                      )}
                    >
                      {isDirty ? '存在未保存变更' : '已与后端对齐'}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">状态</dt>
                      <dd
                        className={cn(
                          'font-medium',
                          normalized.finalStatus === 'auth_expired'
                            ? 'text-violet-300'
                            : normalized.finalStatus === 'name_mismatch'
                              ? 'text-amber-300'
                              : 'text-emerald-300',
                        )}
                      >
                        {STATUS_LABEL[normalized.finalStatus]}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">授权到期</dt>
                      <dd
                        className={cn(
                          'font-medium',
                          normalized.finalAuthExpired
                            ? 'text-violet-300'
                            : 'text-slate-400',
                        )}
                      >
                        {normalized.finalAuthExpired ? '是' : '否'}
                      </dd>
                    </div>
                    <div className="col-span-2 flex gap-3">
                      <dt className="text-slate-500 shrink-0">备注</dt>
                      <dd className="text-slate-300 line-clamp-1 flex-1">
                        {note || '—'}
                      </dd>
                    </div>
                    <div className="col-span-2 flex gap-3">
                      <dt className="text-slate-500 shrink-0">授权备注</dt>
                      <dd className="text-violet-200/90 line-clamp-1 flex-1">
                        {normalized.finalAuthNote || '—'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {saveResult && (
                  <div
                    className={cn(
                      'rounded-2xl p-3.5 flex items-start gap-2 border',
                      saveResult.ok
                        ? 'bg-emerald-500/[0.05] border-emerald-400/20'
                        : 'bg-rose-500/[0.05] border-rose-400/20',
                    )}
                  >
                    {saveResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-300 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          saveResult.ok ? 'text-emerald-200' : 'text-rose-200',
                        )}
                      >
                        {saveResult.ok ? '保存成功' : '保存失败'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {saveResult.msg}
                        {lastSavedAt && saveResult.ok && (
                          <>
                            {'  ·  '}
                            {formatDateTime(lastSavedAt)}
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setSaveResult(null)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

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
                    {saving
                      ? '保存中...'
                      : !isDirty
                        ? '无变更'
                        : '保存并同步（已自动归一）'}
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
