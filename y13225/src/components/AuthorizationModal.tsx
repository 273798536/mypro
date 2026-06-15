import { Shield, X, AlignLeft, CheckCircle, FileText, ListChecks, ClipboardList } from 'lucide-react'
import { useReviewStore } from '../store'
import { useState } from 'react'

export default function AuthorizationModal() {
  const showAuthModal = useReviewStore((s) => s.showAuthModal)
  const setShowAuthModal = useReviewStore((s) => s.setShowAuthModal)
  const addAuthorizationNote = useReviewStore((s) => s.addAuthorizationNote)
  const reviewItems = useReviewStore((s) => s.reviewItems)
  const [noteText, setNoteText] = useState('')

  const unalignedItems = reviewItems.filter(
    (i) => !i.alignedWith.files || !i.alignedWith.trackList || !i.alignedWith.finalChecklist
  )

  if (!showAuthModal) return null

  const handleConfirm = () => {
    if (!noteText.trim()) return
    addAuthorizationNote(noteText.trim())
    setNoteText('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-amber/20 bg-surface shadow-2xl shadow-amber/10">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-amber" />
            <h3 className="font-serif text-base font-semibold text-ivory">添加授权备注</h3>
          </div>
          <button
            onClick={() => setShowAuthModal(false)}
            className="rounded-lg p-1 text-ivoryMuted hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4">
            <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-ivoryMuted">
              <AlignLeft size={12} />
              授权备注内容
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="输入授权备注，确认后系统将自动将文件、曲目表和最后清单重新对齐…"
              rows={3}
              className="w-full resize-none text-sm"
            />
          </div>

          <div className="mb-4">
            <div className="mb-2 text-xs font-medium text-ivoryMuted">对齐结果预览</div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg bg-surfaceLight/50 px-3 py-2">
                <FileText size={14} className="text-sage" />
                <span className="text-xs text-ivory">文件</span>
                <span className="ml-auto text-xs text-sage">
                  {unalignedItems.length === 0 ? '已对齐' : `将对齐 ${unalignedItems.filter(i => !i.alignedWith.files).length} 项`}
                </span>
                <CheckCircle size={12} className="text-sage" />
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-surfaceLight/50 px-3 py-2">
                <ListChecks size={14} className="text-sage" />
                <span className="text-xs text-ivory">曲目表</span>
                <span className="ml-auto text-xs text-sage">
                  {unalignedItems.length === 0 ? '已对齐' : `将对齐 ${unalignedItems.filter(i => !i.alignedWith.trackList).length} 项`}
                </span>
                <CheckCircle size={12} className="text-sage" />
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-surfaceLight/50 px-3 py-2">
                <ClipboardList size={14} className="text-sage" />
                <span className="text-xs text-ivory">最后清单</span>
                <span className="ml-auto text-xs text-sage">
                  {unalignedItems.length === 0 ? '已对齐' : `将对齐 ${unalignedItems.filter(i => !i.alignedWith.finalChecklist).length} 项`}
                </span>
                <CheckCircle size={12} className="text-sage" />
              </div>
            </div>
          </div>

          {unalignedItems.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber/20 bg-amber/5 px-3 py-2 text-xs text-amber">
              将对齐 {unalignedItems.length} 条未对齐的复核条目（文件+曲目表+清单全部重置为已对齐）
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/5 px-6 py-4">
          <button
            onClick={() => setShowAuthModal(false)}
            className="rounded-lg px-4 py-2 text-xs text-ivoryMuted hover:bg-white/5 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!noteText.trim()}
            className="rounded-lg bg-amber px-4 py-2 text-xs font-medium text-base transition-colors hover:bg-amberDark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            确认并触发对齐
          </button>
        </div>
      </div>
    </div>
  )
}
