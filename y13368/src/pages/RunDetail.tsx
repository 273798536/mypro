import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFunnelStore } from '@/store'
import type { Note, GrayscaleResult } from '@/types'
import {
  ArrowLeft, Plus, Link2, ChevronDown, ChevronRight, Image as ImageIcon,
  AlertTriangle, Upload, X, FileText, GitBranch, CheckCircle2, Clock, Activity
} from 'lucide-react'

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const {
    findRun, addNote, linkNoteToConclusion, setConclusion, updateConclusion,
    addScreenshot, removeScreenshot, updateRun, requestConfirmation, checkRunExists,
    activeConfirmation, resolveConfirmation,
  } = useFunnelStore()

  const run = findRun(runId || '')
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteIsSupplementary, setNoteIsSupplementary] = useState(false)
  const [expandedGrayscale, setExpandedGrayscale] = useState<Set<string>>(new Set())
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!run) {
    return (
      <div className="min-h-screen bg-base-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">未找到运行记录: {runId}</p>
          <button onClick={() => navigate('/')} className="text-amber-primary hover:text-amber-light text-sm">
            返回看板
          </button>
        </div>
      </div>
    )
  }

  const handleAddNote = () => {
    if (!noteContent.trim()) return
    const note: Note = {
      id: crypto.randomUUID(),
      run_id: run.run_id,
      stage_id: null,
      content: noteContent,
      is_supplementary: noteIsSupplementary,
      linked_conclusion_id: null,
      created_at: new Date().toISOString(),
    }
    addNote(run.run_id, note)
    if (run.scenario_type === 'smooth') {
      updateRun(run.run_id, { scenario_type: 'supplementary' })
    }
    setNoteContent('')
    setShowAddNote(false)
  }

  const handleLinkNote = (noteId: string) => {
    if (!run.conclusion) return
    linkNoteToConclusion(run.run_id, noteId, run.conclusion.id)
  }

  const handleSetConclusion = (content: string) => {
    if (run.conclusion) {
      updateConclusion(run.run_id, { content, updated_at: new Date().toISOString() })
    } else {
      const id = crypto.randomUUID()
      setConclusion(run.run_id, {
        id,
        run_id: run.run_id,
        content,
        linked_note_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  const handleComplete = () => {
    updateRun(run.run_id, { status: 'completed' })
  }

  const handleRerunSameId = () => {
    if (checkRunExists(run.run_id)) {
      requestConfirmation(run.run_id, `检测到 run_id ${run.run_id} 已存在历史数据`, '选择合并（保留历史备注追加新数据）或覆盖（清空重新开始）')
    }
  }

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const data = ev.target?.result as string
        addScreenshot(run.run_id, {
          id: crypto.randomUUID(),
          run_id: run.run_id,
          note_id: null,
          image_data: data,
          description: file.name,
          created_at: new Date().toISOString(),
        })
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const toggleGrayscale = (id: string) => {
    setExpandedGrayscale((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const timelineItems = [
    ...run.stages.map((s) => ({
      type: 'stage' as const,
      id: s.id,
      time: s.recorded_at,
      title: s.stage_name,
      data: s.data,
      hasParamChange: s.has_param_change,
    })),
    ...run.notes.map((n) => ({
      type: 'note' as const,
      id: n.id,
      time: n.created_at,
      title: n.is_supplementary ? '后补备注' : '备注',
      content: n.content,
      isSupplementary: n.is_supplementary,
      linkedConclusionId: n.linked_conclusion_id,
    })),
    ...(run.conclusion
      ? [
          {
            type: 'conclusion' as const,
            id: run.conclusion.id,
            time: run.conclusion.updated_at,
            title: '最终结论',
            content: run.conclusion.content,
            linkedNoteIds: run.conclusion.linked_note_ids,
          },
        ]
      : []),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  const statusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30"><Activity size={12} className="inline w-3 h-3" />进行中</span>
      case 'pending_confirmation':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-primary/20 text-amber-light border border-amber-primary/30"><AlertTriangle size={12} className="inline w-3 h-3" />待确认</span>
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><CheckCircle2 size={12} className="inline w-3 h-3" />已完成</span>
      default:
        return null
    }
  }

  const grayscaleLabels: Record<GrayscaleResult['dimension'], { label: string; color: string }> = {
    sample_change: { label: '样本变化', color: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10' },
    threshold_change: { label: '阈值变化', color: 'text-violet-300 border-violet-500/30 bg-violet-500/10' },
    manual_override: { label: '人工改判', color: 'text-rose-300 border-rose-500/30 bg-rose-500/10' },
  }

  return (
    <div className="min-h-screen bg-base-900">
      {activeConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-base-800 border border-amber-primary/30 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-amber-primary/10 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-primary/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-primary" />
              </div>
              <h3 className="font-mono font-bold text-white text-base">需要人工确认</h3>
            </div>
            <p className="text-sm text-zinc-300 mb-2">{activeConfirmation.reason}</p>
            <p className="text-sm text-zinc-400 mb-6">{activeConfirmation.next_step}</p>
            <div className="flex gap-3">
              <button
                onClick={() => resolveConfirmation('merge')}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-base-700 text-white hover:bg-base-600 border border-base-500/40 transition-colors"
              >
                合并数据
              </button>
              <button
                onClick={() => resolveConfirmation('overwrite')}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-danger/20 text-red-300 hover:bg-danger/30 border border-danger/30 transition-colors"
              >
                覆盖重写
              </button>
              <button
                onClick={() => resolveConfirmation('cancel')}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border border-zinc-600 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] p-2">
            <button onClick={() => setLightboxImage(null)} className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-base-800 border border-base-500/40 flex items-center justify-center text-zinc-400 hover:text-white transition-colors z-10">
              <X size={16} />
            </button>
            {lightboxImage ? (
              <img src={lightboxImage} alt="截图" className="max-w-full max-h-[85vh] rounded-lg" />
            ) : (
              <div className="w-64 h-48 bg-base-700 rounded-lg flex items-center justify-center text-zinc-500 text-sm">截图不可用</div>
            )}
          </div>
        </div>
      )}

      <header className="border-b border-base-500/30 bg-base-800/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="w-8 h-8 rounded-lg bg-base-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-base-600 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-white">{run.run_id}</span>
                {statusLabel(run.status)}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                创建于 {new Date(run.created_at).toLocaleString('zh-CN')} · 更新于 {new Date(run.updated_at).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {run.status !== 'completed' && (
              <button
                onClick={handleComplete}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
              >
                标记完成
              </button>
            )}
            <button
              onClick={handleRerunSameId}
              className="px-3 py-1.5 rounded-lg text-sm text-zinc-300 bg-base-700 hover:bg-base-600 border border-base-500/40 transition-colors"
            >
              幂等重跑
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-mono text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <GitBranch size={14} className="text-amber-primary" />
                  主线时间轴
                </h2>
                <button
                  onClick={() => setShowAddNote(!showAddNote)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-amber-primary hover:text-amber-light bg-amber-primary/10 hover:bg-amber-primary/20 transition-colors"
                >
                  <Plus size={12} />
                  补录备注
                </button>
              </div>

              {showAddNote && (
                <div className="mb-4 bg-base-800 border border-amber-primary/30 rounded-xl p-4 animate-fade-in-up">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="输入备注内容..."
                    className="w-full bg-base-700 border border-base-500/40 rounded-lg p-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-amber-primary/50"
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <label className="flex items-center gap-2 text-xs text-zinc-400">
                      <input
                        type="checkbox"
                        checked={noteIsSupplementary}
                        onChange={(e) => setNoteIsSupplementary(e.target.checked)}
                        className="rounded border-base-500 bg-base-700 text-amber-primary focus:ring-amber-primary/50"
                      />
                      后补备注
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddNote(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 bg-base-700 hover:bg-base-600 transition-colors">
                        取消
                      </button>
                      <button onClick={handleAddNote} className="px-3 py-1.5 rounded-lg text-xs font-medium text-base-900 bg-amber-primary hover:bg-amber-light transition-colors">
                        添加
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative pl-6">
                <div className="absolute left-[9px] top-2 bottom-2 w-px bg-base-500/30 border-l border-dashed border-base-500/40" />
                {timelineItems.map((item, i) => (
                  <div key={item.id} className="relative mb-4 last:mb-0 animate-fade-in-up" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className={`absolute -left-6 top-2.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                      item.type === 'stage'
                        ? item.hasParamChange
                          ? 'border-amber-primary bg-amber-primary/20'
                          : 'border-blue-400 bg-blue-400/20'
                        : item.type === 'note'
                        ? item.isSupplementary
                          ? 'border-violet-400 bg-violet-400/20'
                          : 'border-zinc-500 bg-zinc-700'
                        : 'border-emerald-400 bg-emerald-400/20'
                    }`}>
                      <div className={`w-[6px] h-[6px] rounded-full ${
                        item.type === 'stage'
                          ? item.hasParamChange
                            ? 'bg-amber-primary'
                            : 'bg-blue-400'
                          : item.type === 'note'
                          ? item.isSupplementary
                            ? 'bg-violet-400'
                            : 'bg-zinc-500'
                          : 'bg-emerald-400'
                      }`} />
                    </div>
                    <div className={`ml-3 bg-base-800 rounded-xl border p-4 ${
                      item.type === 'stage' && item.hasParamChange
                        ? 'border-amber-primary/40 shadow-sm shadow-amber-primary/10'
                        : 'border-base-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium font-mono ${
                          item.type === 'conclusion' ? 'text-emerald-300' :
                          item.type === 'note' && item.isSupplementary ? 'text-violet-300' :
                          item.type === 'stage' && item.hasParamChange ? 'text-amber-primary' :
                          'text-zinc-300'
                        }`}>
                          {item.title}
                          {item.type === 'stage' && item.hasParamChange && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-primary/20 text-amber-primary">
                              参数变化
                            </span>
                          )}
                          {item.type === 'note' && item.isSupplementary && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-violet-400/20 text-violet-300">
                              后补
                            </span>
                          )}
                          {item.type === 'note' && item.linkedConclusionId && (
                            <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300">
                              <Link2 size={8} />
                              已关联结论
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {new Date(item.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {item.type === 'stage' && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(item.data).map(([key, val]) => (
                            <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-base-700/80 text-xs font-mono text-zinc-300">
                              <span className="text-zinc-500">{key}</span>
                              <span className="text-white">{String(val)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {(item.type === 'note' || item.type === 'conclusion') && (
                        <p className="text-sm text-zinc-300 mt-1">{item.content}</p>
                      )}
                      {item.type === 'note' && !item.linkedConclusionId && run.conclusion && (
                        <button
                          onClick={() => handleLinkNote(item.id)}
                          className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] text-amber-primary/70 hover:text-amber-primary bg-amber-primary/5 hover:bg-amber-primary/10 transition-colors"
                        >
                          <Link2 size={10} />
                          关联到结论
                        </button>
                      )}
                      {item.type === 'conclusion' && item.linkedNoteIds.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-zinc-500">关联备注:</span>
                          {item.linkedNoteIds.map((nid) => {
                            const note = run.notes.find((n) => n.id === nid)
                            return note ? (
                              <span key={nid} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-violet-400/10 text-violet-300 border border-violet-400/20">
                                <Link2 size={8} />
                                {note.content.slice(0, 20)}...
                              </span>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {timelineItems.length === 0 && (
                  <div className="text-center py-8 text-zinc-500 text-sm">暂无时间轴记录</div>
                )}
              </div>
            </div>

            {run.grayscale_results.length > 0 && (
              <div className="mb-6">
                <h2 className="font-mono text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText size={14} className="text-amber-primary" />
                  灰度结果拆分
                </h2>
                <div className="space-y-2">
                  {run.grayscale_results.map((gr) => {
                    const info = grayscaleLabels[gr.dimension]
                    const isExpanded = expandedGrayscale.has(gr.id)
                    return (
                      <div key={gr.id} className="bg-base-800 rounded-xl border border-base-500/30 overflow-hidden">
                        <button
                          onClick={() => toggleGrayscale(gr.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-base-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${info.color}`}>
                              {info.label}
                            </span>
                            <span className="text-xs text-zinc-400">{gr.change_desc}</span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 animate-fade-in-up">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-base-700/50 rounded-lg p-3 border border-base-500/20">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">变化前</span>
                                <div className="mt-2 space-y-1">
                                  {Object.entries(gr.before).map(([k, v]) => (
                                    <div key={k} className="flex justify-between text-xs">
                                      <span className="text-zinc-400 font-mono">{k}</span>
                                      <span className="text-white font-mono">{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="bg-base-700/50 rounded-lg p-3 border border-base-500/20">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">变化后</span>
                                <div className="mt-2 space-y-1">
                                  {Object.entries(gr.after).map(([k, v]) => (
                                    <div key={k} className="flex justify-between text-xs">
                                      <span className="text-zinc-400 font-mono">{k}</span>
                                      <span className="text-amber-primary font-mono">{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="col-span-4">
            <div className="sticky top-20 space-y-6">
              <div className="bg-base-800 rounded-xl border border-base-500/30 p-5">
                <h3 className="font-mono text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText size={12} className="text-amber-primary" />
                  结论
                </h3>
                {run.conclusion ? (
                  <div>
                    <p className="text-sm text-zinc-300">{run.conclusion.content}</p>
                    <p className="text-[10px] text-zinc-600 mt-2 font-mono">
                      更新于 {new Date(run.conclusion.updated_at).toLocaleString('zh-CN')}
                    </p>
                    <button
                      onClick={() => {
                        const newContent = window.prompt('编辑结论内容：', run.conclusion!.content)
                        if (newContent !== null && newContent.trim()) handleSetConclusion(newContent)
                      }}
                      className="mt-3 text-xs text-amber-primary/70 hover:text-amber-primary transition-colors"
                    >
                      编辑结论
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => {
                        const content = window.prompt('输入结论内容：')
                        if (content?.trim()) handleSetConclusion(content)
                      }}
                      className="w-full py-3 rounded-lg text-sm text-zinc-400 bg-base-700 hover:bg-base-600 border border-dashed border-base-500/40 hover:border-amber-primary/30 transition-colors"
                    >
                      + 添加结论
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-base-800 rounded-xl border border-base-500/30 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-mono text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon size={12} className="text-amber-primary" />
                    截图说明
                  </h3>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-amber-primary/70 hover:text-amber-primary bg-amber-primary/5 hover:bg-amber-primary/10 transition-colors"
                  >
                    <Upload size={10} />
                    上传
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} />
                </div>
                {run.screenshots.length > 0 ? (
                  <div className="space-y-3">
                    {run.screenshots.map((ss) => (
                      <div key={ss.id} className="group relative bg-base-700/50 rounded-lg border border-base-500/20 overflow-hidden">
                        {ss.image_data ? (
                          <img
                            src={ss.image_data}
                            alt={ss.description}
                            className="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxImage(ss.image_data)}
                          />
                        ) : (
                          <div className="w-full h-32 flex items-center justify-center bg-base-700">
                            <ImageIcon size={24} className="text-zinc-600" />
                          </div>
                        )}
                        <div className="p-2 flex items-center justify-between">
                          <span className="text-xs text-zinc-400 truncate">{ss.description}</span>
                          <button
                            onClick={() => removeScreenshot(run.run_id, ss.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-danger"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 text-center py-4">暂无截图</p>
                )}
              </div>

              {run.confirmation_records.length > 0 && (
                <div className="bg-base-800 rounded-xl border border-amber-primary/20 p-5">
                  <h3 className="font-mono text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertTriangle size={12} className="text-amber-primary" />
                    确认记录
                  </h3>
                  <div className="space-y-3">
                    {run.confirmation_records.map((cr) => (
                      <div key={cr.id} className="bg-base-700/50 rounded-lg p-3 border border-base-500/20">
                        <p className="text-xs text-zinc-300">{cr.reason}</p>
                        <p className="text-xs text-zinc-400 mt-1">{cr.next_step}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {cr.action_taken ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              cr.action_taken === 'merge' ? 'bg-blue-500/20 text-blue-300' :
                              cr.action_taken === 'overwrite' ? 'bg-danger/20 text-red-300' :
                              'bg-zinc-600/30 text-zinc-400'
                            }`}>
                              {cr.action_taken === 'merge' ? '已合并' : cr.action_taken === 'overwrite' ? '已覆盖' : '已取消'}
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-primary/20 text-amber-primary">
                              待处理
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-600 font-mono">
                            <Clock size={8} className="inline mr-1" />
                            {new Date(cr.created_at).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
