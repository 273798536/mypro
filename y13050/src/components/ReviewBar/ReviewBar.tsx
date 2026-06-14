import { Check, AlertTriangle, Clock, X, CheckSquare } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ReviewResult } from '@/types'

export default function ReviewBar() {
  const selectedPointId = useAppStore((s) => s.selectedPointId)
  const selectedPointIds = useAppStore((s) => s.selectedPointIds)
  const points = useAppStore((s) => s.points)
  const reviews = useAppStore((s) => s.reviews)
  const setReview = useAppStore((s) => s.setReview)
  const batchSetReview = useAppStore((s) => s.batchSetReview)
  const clearMultiSelect = useAppStore((s) => s.clearMultiSelect)
  const selectPoint = useAppStore((s) => s.selectPoint)

  const hasMulti = selectedPointIds.length > 0
  const targetIds = hasMulti ? selectedPointIds : selectedPointId ? [selectedPointId] : []
  const targetPoints = points.filter((p) => targetIds.includes(p.id))

  const applyReview = (result: ReviewResult) => {
    if (hasMulti) {
      batchSetReview(selectedPointIds, result)
    } else if (selectedPointId) {
      setReview(selectedPointId, result)
    }
  }

  const currentReview = selectedPointId ? reviews[selectedPointId] : null

  return (
    <div className="panel-glass flex items-center gap-3 px-4 py-2.5 border-t border-gray-border relative z-10">
      <div className="flex items-center gap-2">
        <CheckSquare size={16} className="text-green-pass" />
        <span className="font-mono text-xs text-gray-wait tracking-wide">复核操作</span>
      </div>

      <div className="h-5 w-px bg-gray-border" />

      {targetIds.length === 0 ? (
        <span className="text-xs text-gray-wait">
          点击 3D 场景中的测点或异常列表中的对象进行复核
          <span className="text-gray-wait/60 ml-3">(按住 Shift 可多选)</span>
        </span>
      ) : (
        <>
          <span className="text-xs text-gray-200">
            已选择 <span className="font-mono text-cyan-industrial">{targetIds.length}</span> 个对象
            {hasMulti && (
              <button
                onClick={clearMultiSelect}
                className="ml-2 text-[10px] text-gray-wait hover:text-orange-alert"
              >
                清除多选
              </button>
            )}
          </span>
          {targetIds.length === 1 && targetPoints[0] && (
            <span className="text-[11px] text-gray-wait font-mono">
              {targetPoints[0].id} [{targetPoints[0].type}]
              {currentReview && (
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                    currentReview.result === 'pass'
                      ? 'bg-green-pass/20 text-green-pass border border-green-pass/40'
                      : currentReview.result === 'supply'
                      ? 'bg-orange-alert/20 text-orange-alert border border-orange-alert/40'
                      : 'bg-gray-wait/20 text-gray-wait border border-gray-wait/40'
                  }`}
                >
                  {currentReview.result === 'pass'
                    ? '已放行'
                    : currentReview.result === 'supply'
                    ? '需补料'
                    : '待确认'}
                </span>
              )}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => applyReview('pass')}
              className="btn-industrial btn-pass flex items-center gap-1.5 !px-4 !py-2"
            >
              <Check size={14} />
              放行通过
            </button>
            <button
              onClick={() => applyReview('supply')}
              className="btn-industrial btn-supply flex items-center gap-1.5 !px-4 !py-2"
            >
              <AlertTriangle size={14} />
              需补材料
            </button>
            <button
              onClick={() => applyReview('pending')}
              className="btn-industrial flex items-center gap-1.5 !px-4 !py-2 text-gray-wait border-gray-wait/50"
            >
              <Clock size={14} />
              待确认
            </button>
            {selectedPointId && !hasMulti && (
              <button
                onClick={() => selectPoint(null)}
                className="p-2 rounded hover:bg-navy-mid/60 text-gray-wait hover:text-gray-200"
                title="取消选择"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
