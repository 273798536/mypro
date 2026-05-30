import type { ConflictItem } from '../types'
import { AlertTriangle, ArrowRight } from 'lucide-react'

interface Props {
  conflicts: ConflictItem[]
  onResolve: () => void
}

const typeLabel: Record<string, string> = {
  timing_mismatch: '时值不匹配',
  rest_overlap: '休止冲突',
  entry_mismatch: '进入冲突',
}

const typeColor: Record<string, string> = {
  timing_mismatch: 'text-early',
  rest_overlap: 'text-rest',
  entry_mismatch: 'text-warning',
}

export default function ConflictModal({ conflicts, onResolve }: Props) {
  return (
    <div className="fixed inset-0 bg-bg/90 flex items-center justify-center z-50 p-6">
      <div className="bg-surface rounded-xl border border-warning/30 max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="px-6 py-5 border-b border-surfaceLight/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-warning" />
            <h2 className="font-display text-xl font-700 text-warning">
              声部轨与节拍线合并冲突
            </h2>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            以下冲突由声部轨数据和节拍线数据不一致产生，已全部列出，未做任何静默选择。
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {conflicts.map((conflict, i) => (
            <div
              key={i}
              className="bg-surfaceLight/20 rounded-lg p-4 border border-warning/10"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-600 px-2 py-0.5 rounded bg-warning/10 ${typeColor[conflict.type]}`}>
                  {typeLabel[conflict.type]}
                </span>
                <span className="text-xs text-gray-500">
                  {conflict.partTrackName} · 第{conflict.beatLineTick + 1}拍
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface/80 rounded-lg p-3 border border-early/20">
                  <div className="text-xs text-early/70 font-500 mb-1">声部轨数据</div>
                  <div className="text-sm text-gray-300">{conflict.partTrackValue}</div>
                </div>
                <div className="bg-surface/80 rounded-lg p-3 border border-accent/20">
                  <div className="text-xs text-accent/70 font-500 mb-1">节拍线数据</div>
                  <div className="text-sm text-gray-300">{conflict.beatLineValue}</div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2">{conflict.description}</p>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-surfaceLight/30 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            共 {conflicts.length} 处冲突，确认后将以当前数据进入训练
          </span>
          <button
            onClick={onResolve}
            className="flex items-center gap-2 bg-warning/20 text-warning px-5 py-2.5 rounded-lg 
              font-600 hover:bg-warning/30 transition-all"
          >
            我已了解，继续
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
