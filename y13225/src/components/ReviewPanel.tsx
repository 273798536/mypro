import { FileText, MessageSquare, CheckCircle, AlertCircle, Clock, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { useReviewStore } from '../store'
import { useState } from 'react'

function AlignmentIndicator({ aligned }: { aligned: { files: boolean; trackList: boolean; finalChecklist: boolean } }) {
  const allAligned = aligned.files && aligned.trackList && aligned.finalChecklist
  const partialAligned = aligned.files || aligned.trackList || aligned.finalChecklist

  if (allAligned) {
    return (
      <div className="flex items-center gap-1">
        <ShieldCheck size={14} className="text-sage" />
        <span className="text-xs text-sage">已对齐</span>
      </div>
    )
  }

  if (partialAligned) {
    return (
      <div className="flex items-center gap-1">
        <ShieldAlert size={14} className="text-amber" />
        <span className="text-xs text-amber">部分对齐</span>
        <div className="ml-1 flex gap-0.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${aligned.files ? 'bg-sage' : 'bg-coral'}`} title="文件" />
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${aligned.trackList ? 'bg-sage' : 'bg-coral'}`} title="曲目表" />
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${aligned.finalChecklist ? 'bg-sage' : 'bg-coral'}`} title="清单" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <ShieldX size={14} className="text-coral" />
      <span className="text-xs text-coral">未对齐</span>
    </div>
  )
}

function StatusBadge({ status }: { status: 'confirmed' | 'pending' | 'anomaly' }) {
  const config = {
    confirmed: { icon: CheckCircle, label: '已确认', color: 'text-sage bg-sage/10 border-sage/20' },
    pending: { icon: Clock, label: '待复核', color: 'text-mist bg-mist/10 border-mist/20' },
    anomaly: { icon: AlertCircle, label: '异常', color: 'text-coral bg-coral/10 border-coral/20' },
  }
  const c = config[status]
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${c.color}`}>
      <Icon size={10} />
      {c.label}
    </span>
  )
}

export default function ReviewPanel() {
  const filteredItems = useReviewStore((s) => s.getFilteredItems())
  const notes = useReviewStore((s) => s.notes)
  const addNote = useReviewStore((s) => s.addNote)
  const editingNote = useReviewStore((s) => s.editingNote)
  const startEditNote = useReviewStore((s) => s.startEditNote)
  const materials = useReviewStore((s) => s.materials)
  const [noteText, setNoteText] = useState('')
  const [noteAuthor, setNoteAuthor] = useState('项目经理')

  const handleSaveNote = (itemId: string) => {
    if (!noteText.trim()) return
    addNote(itemId, noteText.trim(), noteAuthor)
    setNoteText('')
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/5 px-6 py-3">
        <FileText size={16} className="text-amber" />
        <h2 className="font-serif text-sm font-semibold tracking-wide">复核区</h2>
        <span className="ml-auto text-xs text-ivoryMuted">{filteredItems.length} 条记录</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-ivoryMuted">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-sm">当前筛选条件下无复核条目</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const material = materials.find((m) => m.id === item.materialId)
              const itemNotes = notes.filter((n) => n.itemId === item.id)
              const isEditing = editingNote === item.id

              return (
                <div
                  key={item.id}
                  className="group rounded-lg border border-white/5 bg-surface/60 p-4 transition-all hover:border-amber/20 hover:shadow-lg hover:shadow-amber/5"
                  style={{ borderLeftWidth: '3px', borderLeftColor: item.status === 'anomaly' ? '#e85d50' : item.status === 'pending' ? '#7ba7bc' : '#6b9e6b' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-serif text-lg font-bold text-ivory">{item.songNumber}</span>
                        <span className="ml-2 text-sm text-ivoryMuted">{item.versionNumber}</span>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="flex items-center gap-3">
                      <AlignmentIndicator aligned={item.alignedWith} />
                      <span className="text-xs text-ivoryMuted">{item.reviewDate}</span>
                    </div>
                  </div>

                  {material && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-ivoryMuted">
                      <span>来源：{material.sourceGroup}</span>
                      <span>·</span>
                      <span>{material.sender}</span>
                      {material.isDirty && (
                        <>
                          <span>·</span>
                          <span className="text-coral">{material.dirtyTag}</span>
                        </>
                      )}
                    </div>
                  )}

                  {itemNotes.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {itemNotes.map((note) => (
                        <div
                          key={note.id}
                          className={`flex items-start gap-2 rounded px-3 py-1.5 text-xs ${
                            note.isOverride ? 'bg-coral/10 border-l-2 border-coral' : 'bg-white/5'
                          }`}
                        >
                          <MessageSquare size={12} className={`mt-0.5 flex-shrink-0 ${note.isOverride ? 'text-coral' : 'text-ivoryMuted'}`} />
                          <div className="flex-1">
                            <span className={note.isOverride ? 'text-coral' : 'text-ivory'}>{note.content}</span>
                            <div className="mt-0.5 flex items-center gap-2 text-ivoryMuted">
                              <span>{note.author}</span>
                              <span>{new Date(note.createdAt).toLocaleString('zh-CN')}</span>
                              {note.isOverride && (
                                <span className="text-coral">覆盖了「{note.previousJudgment}」</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-3 rounded-lg border border-amber/20 bg-amber/5 p-3">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="输入人工备注…"
                        rows={2}
                        className="w-full resize-none text-xs"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <select
                          value={noteAuthor}
                          onChange={(e) => setNoteAuthor(e.target.value)}
                          className="text-xs"
                        >
                          <option value="项目经理">项目经理</option>
                          <option value="张指挥">张指挥</option>
                          <option value="王导">王导</option>
                          <option value="小温">小温</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditNote(null)}
                            className="rounded px-3 py-1 text-xs text-ivoryMuted hover:bg-white/5"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => handleSaveNote(item.id)}
                            className="rounded bg-amber px-3 py-1 text-xs font-medium text-base hover:bg-amberDark transition-colors"
                          >
                            保存备注
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="mt-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setNoteText('')
                          startEditNote(item.id)
                        }}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-amber hover:bg-amber/10 transition-colors"
                      >
                        <MessageSquare size={12} />
                        添加备注
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
