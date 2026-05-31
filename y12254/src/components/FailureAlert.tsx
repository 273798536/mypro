import { AlertTriangle, ArrowRight, MapPin, Lightbulb } from 'lucide-react'

interface Props {
  alert: {
    reason: string
    triggerSource: string
    stuckPoint: string
    nextStep: string
  }
  onDismiss: () => void
}

export default function FailureAlert({ alert, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-window-disabled/20 flex items-center justify-center">
            <AlertTriangle size={20} className="text-window-disabled" />
          </div>
          <h2 className="font-bold text-lg text-milk-700">模拟失败</h2>
        </div>

        <div className="space-y-3 text-sm">
          <div className="bg-red-50 rounded-xl p-3 border border-red-200">
            <div className="font-medium text-red-700 mb-1">触发原因</div>
            <div className="text-red-600">{alert.reason}</div>
          </div>

          <div className="flex items-center gap-2">
            <ArrowRight size={16} className="text-milk-400" />
            <div className="flex-1 bg-yellow-50 rounded-xl p-3 border border-yellow-200">
              <div className="font-medium text-yellow-700 mb-1">触发源</div>
              <div className="text-yellow-600">{alert.triggerSource}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-milk-400" />
            <div className="flex-1 bg-orange-50 rounded-xl p-3 border border-orange-200">
              <div className="font-medium text-orange-700 mb-1">卡点位置</div>
              <div className="text-orange-600">{alert.stuckPoint}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-milk-400" />
            <div className="flex-1 bg-green-50 rounded-xl p-3 border border-green-200">
              <div className="font-medium text-green-700 mb-1">下一步建议</div>
              <div className="text-green-600">{alert.nextStep}</div>
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="btn-primary w-full mt-5"
        >
          我知道了
        </button>
      </div>
    </div>
  )
}
