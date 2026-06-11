import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { generateOverlapHint } from '@/utils/collision'
import { Clock, MessageSquare, Paperclip, ArrowRight, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import type { Annotation, SupplementMaterial } from '@/types'

function AnnotationCard({ annotation, supplements }: { annotation: Annotation; supplements: SupplementMaterial[] }) {
  const [expanded, setExpanded] = useState(false)
  const typeColor: Record<string, string> = {
    review_note: 'border-l-blue-400',
    supplement: 'border-l-emerald-400',
    action_hint: 'border-l-amber-400',
  }
  const typeLabel: Record<string, string> = {
    review_note: '审查批注',
    supplement: '补充材料',
    action_hint: '行动提示',
  }
  const typeBadgeColor: Record<string, string> = {
    review_note: 'bg-blue-400/10 text-blue-400',
    supplement: 'bg-emerald-400/10 text-emerald-400',
    action_hint: 'bg-amber-400/10 text-amber-400',
  }

  return (
    <div className={`border-l-2 ${typeColor[annotation.type]} bg-zinc-900/60 rounded-r-lg p-3 ml-2`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeBadgeColor[annotation.type]}`}>
            {typeLabel[annotation.type]}
          </span>
          <span className="text-[10px] text-zinc-600">批次 {annotation.batchNo}</span>
        </div>
        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
          <Clock size={10} /> {new Date(annotation.timestamp).toLocaleDateString('zh-CN')}
        </span>
      </div>
      <p className="text-xs text-zinc-300 leading-relaxed">{annotation.content}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-zinc-500">{annotation.authorName}</span>
        {supplements.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300"
          >
            <Paperclip size={10} /> {supplements.length} 份补充
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        )}
      </div>
      {expanded && supplements.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-zinc-800 pt-2">
          {supplements.map((sup) => (
            <div key={sup.id} className="bg-zinc-800/50 rounded px-2 py-1.5 border-l-2 border-l-emerald-400/50">
              <p className="text-[10px] text-zinc-400">{sup.content}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-zinc-600">批次 {sup.batchNo}</span>
                <span className="text-[9px] text-zinc-600">{new Date(sup.timestamp).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Annotations() {
  const collisions = useStore((s) => s.collisions)
  const bars = useStore((s) => s.bars)
  const annotations = useStore((s) => s.annotations)
  const supplements = useStore((s) => s.supplements)
  const getAnnotationsByCollisionId = useStore((s) => s.getAnnotationsByCollisionId)
  const getSupplementsByAnnotationId = useStore((s) => s.getSupplementsByAnnotationId)
  const addAnnotation = useStore((s) => s.addAnnotation)
  const [newContent, setNewContent] = useState('')
  const [selectedCollisionId, setSelectedCollisionId] = useState<string | null>(null)

  const collisionAnnotations = selectedCollisionId
    ? getAnnotationsByCollisionId(selectedCollisionId)
    : []

  const handleSubmitAnnotation = () => {
    if (!newContent.trim() || !selectedCollisionId) return
    const batchNos = annotations.filter(a => a.collisionId === selectedCollisionId).map(a => a.batchNo)
    const latestBatch = batchNos.length > 0 ? batchNos.sort().reverse()[0] : 'B000'
    const nextBatch = `B${(parseInt(latestBatch.replace('B', '')) + 1).toString().padStart(3, '0')}`

    addAnnotation({
      id: `ann-${Date.now()}`,
      collisionId: selectedCollisionId,
      authorId: 'user-current',
      authorName: '当前用户',
      content: newContent.trim(),
      batchNo: nextBatch,
      timestamp: new Date().toISOString(),
      type: 'review_note',
    })
    setNewContent('')
  }

  return (
    <div className="h-full flex overflow-hidden">
      <div className="w-80 border-r border-zinc-800 bg-zinc-900/30 overflow-y-auto">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <MessageSquare size={14} /> 碰撞批注列表
          </h2>
        </div>
        <div className="p-2 space-y-1">
          {collisions.map((c) => {
            const barA = bars.find((b) => b.id === c.objectAId)
            const barB = bars.find((b) => b.id === c.objectBId)
            const cAnnotations = getAnnotationsByCollisionId(c.id)
            const isSelected = selectedCollisionId === c.id
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCollisionId(c.id)}
                className={`w-full text-left rounded-lg px-3 py-2.5 transition-all ${
                  isSelected
                    ? 'bg-amber-400/10 border border-amber-400/30'
                    : 'bg-zinc-900/40 border border-transparent hover:bg-zinc-800/50 hover:border-zinc-700/50'
                }`}
              >
                <div className="text-xs text-zinc-200 font-medium">{barA?.name} ↔ {barB?.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-zinc-500">间距 {c.distance}m</span>
                  <span className="text-[10px] text-zinc-500">{cAnnotations.length} 条批注</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedCollisionId ? (
          <div className="p-6">
            {(() => {
              const collision = collisions.find(c => c.id === selectedCollisionId)
              if (!collision) return null
              const barA = bars.find(b => b.id === collision.objectAId)
              const barB = bars.find(b => b.id === collision.objectBId)
              const hint = generateOverlapHint(collision, bars)
              const cAnnotations = getAnnotationsByCollisionId(selectedCollisionId)

              return (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-100">{barA?.name} ↔ {barB?.name}</h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      碰撞间距 {collision.distance}m · 帧{collision.frameIndex} · 状态：{collision.status === 'collision' ? '碰撞' : collision.status === 'pending_review' ? '待确认' : '安全'}
                    </p>
                  </div>

                  {collision.status === 'collision' && (
                    <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <ArrowRight size={16} className="text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-semibold text-amber-400 mb-1">行动提示</h4>
                          <p className="text-xs text-zinc-300 leading-relaxed">{hint}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-3">批注版本链</h3>
                    <div className="relative pl-4 space-y-3">
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-700" />
                      {cAnnotations.map((ann) => {
                        const annSupplements = getSupplementsByAnnotationId(ann.id)
                        return <AnnotationCard key={ann.id} annotation={ann} supplements={annSupplements} />
                      })}
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                      <Plus size={14} /> 追加批注
                    </h3>
                    <div className="space-y-2">
                      <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="输入批注内容（追加到版本链，不会覆盖历史批注）"
                        className="w-full bg-zinc-900/60 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 resize-none h-20"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleSubmitAnnotation}
                          disabled={!newContent.trim()}
                          className="px-4 py-1.5 rounded-lg bg-amber-400/20 text-amber-400 text-xs font-medium hover:bg-amber-400/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          追加批注
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600">
            <div className="text-center">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">选择左侧碰撞项<br/>查看批注版本链</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
