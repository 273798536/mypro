import { useState, useRef, useCallback } from 'react'
import { useStore } from '@/store'
import { MessageSquare, ImagePlus, RefreshCw, Send, X, Link } from 'lucide-react'
import type { RemarkSnapshot, ScreenshotSnapshot } from '@/types'

function RemarkItem({ remark }: { remark: RemarkSnapshot }) {
  const typeLabel = {
    rehearsal: '排练',
    authorization: '授权',
    manual: '人工',
  }
  const typeCls = {
    rehearsal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    authorization: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    manual: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  }
  return (
    <div className="flex items-start gap-2 py-2">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${typeCls[remark.type]}`}>
          {typeLabel[remark.type]}
        </span>
        <span className="text-[10px] text-gray-600 font-mono">v{remark.version}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 break-words">{remark.content}</p>
        <span className="text-[10px] text-gray-600">
          {new Date(remark.createdAt).toLocaleString('zh-CN')}
        </span>
      </div>
    </div>
  )
}

function ScreenshotItem({ shot, onRemove }: { shot: ScreenshotSnapshot; onRemove?: () => void }) {
  return (
    <div className="relative group rounded-lg overflow-hidden border border-[#2a2a4a] bg-[#0d0d1a]">
      {shot.dataUrl ? (
        <img
          src={shot.dataUrl}
          alt={shot.fileName}
          className="w-full h-20 object-cover"
        />
      ) : (
        <div className="w-full h-20 flex items-center justify-center text-gray-600">
          <ImagePlus size={20} />
        </div>
      )}
      <div className="px-2 py-1.5">
        <div className="text-xs text-gray-400 truncate">{shot.fileName}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-gray-600 font-mono">v{shot.version}</span>
          {shot.isSupplementary && (
            <span className="text-[10px] text-amber-500">补</span>
          )}
          {shot.relatedRemarkId && (
            <Link size={10} className="text-gray-600" />
          )}
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <X size={10} />
        </button>
      )}
    </div>
  )
}

export default function RemarksPanel() {
  const { entries, activeEntryId, addRemark, addScreenshot, rescan } = useStore()
  const entry = entries.find((e) => e.id === activeEntryId)

  const [remarkText, setRemarkText] = useState('')
  const [remarkType, setRemarkType] = useState<RemarkSnapshot['type']>('manual')
  const [isSupplementary, setIsSupplementary] = useState(false)
  const [relatedRemarkId, setRelatedRemarkId] = useState<string | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmitRemark = useCallback(() => {
    if (!activeEntryId || !remarkText.trim()) return
    addRemark(activeEntryId, { content: remarkText.trim(), type: remarkType })
    setRemarkText('')
  }, [activeEntryId, remarkText, remarkType, addRemark])

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!activeEntryId || !e.target.files?.length) return
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = () => {
        addScreenshot(activeEntryId, {
          dataUrl: reader.result as string,
          fileName: file.name,
          relatedRemarkId,
          isSupplementary,
        })
        setIsSupplementary(false)
        setRelatedRemarkId(undefined)
      }
      reader.readAsDataURL(file)
      e.target.value = ''
    },
    [activeEntryId, addScreenshot, relatedRemarkId, isSupplementary]
  )

  const handleRescan = useCallback(() => {
    if (!activeEntryId) return
    rescan(activeEntryId)
  }, [activeEntryId, rescan])

  if (!entry) {
    return (
      <div className="rounded-xl border border-[#2a2a4a] bg-[#16162a]/50 p-6 text-center">
        <MessageSquare size={32} className="mx-auto text-gray-600 mb-2" />
        <div className="text-sm text-gray-500">选择条目后添加备注和截图</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#2a2a4a] bg-[#16162a]/50 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#2a2a4a] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <MessageSquare size={14} className="text-amber-500" />
            备注
            <span className="text-xs text-gray-500">({entry.remarks.length})</span>
          </div>
          <button
            onClick={handleRescan}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
          >
            <RefreshCw size={12} />
            重扫描
          </button>
        </div>

        <div className="px-4 py-2 max-h-40 overflow-auto">
          {entry.remarks.length === 0 ? (
            <div className="text-xs text-gray-600 py-2">暂无备注</div>
          ) : (
            entry.remarks.map((r) => <RemarkItem key={r.id} remark={r} />)
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#2a2a4a]">
          <div className="flex items-center gap-2 mb-2">
            <select
              value={remarkType}
              onChange={(e) => setRemarkType(e.target.value as RemarkSnapshot['type'])}
              className="appearance-none bg-[#2a2a4a] text-gray-300 text-xs rounded px-2 py-1 border border-[#3a3a5a]"
            >
              <option value="rehearsal">排练</option>
              <option value="authorization">授权</option>
              <option value="manual">人工</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitRemark()}
              placeholder="输入备注..."
              className="flex-1 bg-[#0d0d1a] text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-[#2a2a4a] focus:outline-none focus:border-amber-500/50 placeholder:text-gray-600"
            />
            <button
              onClick={handleSubmitRemark}
              disabled={!remarkText.trim()}
              className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#2a2a4a] bg-[#16162a]/50 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#2a2a4a] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <ImagePlus size={14} className="text-amber-500" />
            排练群截图
            <span className="text-xs text-gray-500">({entry.screenshots.length})</span>
          </div>
        </div>

        {entry.screenshots.length > 0 && (
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {entry.screenshots.map((s) => (
              <ScreenshotItem key={s.id} shot={s} />
            ))}
          </div>
        )}

        <div className="px-4 py-3 border-t border-[#2a2a4a]">
          <div className="flex items-center gap-3 mb-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isSupplementary}
                onChange={(e) => setIsSupplementary(e.target.checked)}
                className="rounded border-[#3a3a5a] bg-[#2a2a4a] text-amber-500 focus:ring-amber-500/30"
              />
              补充截图
            </label>
            {entry.remarks.length > 0 && (
              <select
                value={relatedRemarkId || ''}
                onChange={(e) => setRelatedRemarkId(e.target.value || undefined)}
                className="appearance-none bg-[#2a2a4a] text-gray-400 text-xs rounded px-2 py-0.5 border border-[#3a3a5a]"
              >
                <option value="">不关联备注</option>
                {entry.remarks.map((r) => (
                  <option key={r.id} value={r.id}>
                    关联: {r.content.slice(0, 15)}...
                  </option>
                ))}
              </select>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-[#2a2a4a] text-gray-300 hover:bg-amber-500/10 hover:text-amber-400 border border-[#3a3a5a] hover:border-amber-500/30 transition-all"
          >
            <ImagePlus size={13} />
            上传截图
          </button>
        </div>
      </div>
    </div>
  )
}
