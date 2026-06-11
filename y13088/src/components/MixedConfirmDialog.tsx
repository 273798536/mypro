import { useStore } from '@/store/useStore'
import { AlertTriangle, ArrowRight } from 'lucide-react'

export default function MixedConfirmDialog() {
  const visible = useStore(s => s.mixedConfirmVisible)
  const reason = useStore(s => s.mixedConfirmReason)
  const floor = useStore(s => s.pendingMixedFloor)
  const unit = useStore(s => s.pendingMixedUnit)
  const confirm = useStore(s => s.confirmMixedSplit)
  const dismiss = useStore(s => s.dismissMixedConfirm)

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-96 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg shadow-2xl">
        <div className="px-5 py-4 border-b border-[#2a2a3e] flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#d4a853]" />
          <span className="text-sm font-semibold text-[#e8e8f0]">楼层单位混写确认</span>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-[#a0a0be] leading-relaxed">{reason}</p>

          <div className="p-3 rounded bg-[#0d0d1a] border border-[#2a2a3e]">
            <p className="text-[10px] text-[#6a6a8e] mb-1">拆分结果</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-0.5 rounded bg-[#d4a85320] text-[#d4a853] font-mono">{floor}</span>
              <ArrowRight size={12} className="text-[#5a5a7e]" />
              <span className="text-[#8a8aae]">楼层: <strong className="text-[#c8c8d8]">{floor}</strong> + 单位: <strong className="text-[#c8c8d8]">{unit}</strong></span>
            </div>
          </div>

          <p className="text-[10px] text-[#6a6a8e]">下一步：确认后将自动拆分为楼层和单位独立字段进行筛选</p>
        </div>

        <div className="px-5 py-3 border-t border-[#2a2a3e] flex justify-end gap-2">
          <button
            onClick={dismiss}
            className="px-3 py-1.5 text-xs rounded text-[#8a8aae] hover:bg-[#12121f] transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirm}
            className="px-3 py-1.5 text-xs rounded bg-[#d4a853] text-[#1a1a2e] font-medium hover:bg-[#c49a48] transition-colors"
          >
            确认拆分
          </button>
        </div>
      </div>
    </div>
  )
}
