import type { ManualConfirmReason } from '../types'

interface ManualConfirmPanelProps {
  confirmInfo?: ManualConfirmReason
  onConfirm?: () => void
}

export default function ManualConfirmPanel({ confirmInfo, onConfirm }: ManualConfirmPanelProps) {
  if (!confirmInfo) {
    return null
  }

  return (
    <div className="rounded-lg border border-warning-300 bg-warning-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">❓</span>
        <h4 className="font-semibold text-warning-800">待人工确认</h4>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
          需要处理
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-warning-700 mb-1">原因</p>
          <p className="text-sm text-gray-700 bg-white/70 rounded p-2">
            {confirmInfo.reason}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-warning-700 mb-1">下一步</p>
          <p className="text-sm text-gray-700 bg-white/70 rounded p-2">
            {confirmInfo.nextStep}
          </p>
        </div>

        {confirmInfo.requiredAction && (
          <div className="flex items-center gap-2 p-2 bg-warning-100/50 rounded">
            <span className="text-warning-600">⚡</span>
            <p className="text-sm text-warning-700">
              <span className="font-medium">需要执行：</span>
              {confirmInfo.requiredAction}
            </p>
          </div>
        )}
      </div>

      {onConfirm && (
        <div className="mt-3 pt-3 border-t border-warning-200/50 flex justify-end gap-2">
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm font-medium bg-warning-500 text-white rounded-md hover:bg-warning-600 transition-colors"
          >
            去处理
          </button>
        </div>
      )}
    </div>
  )
}
