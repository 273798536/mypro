import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { FAIL_REASON_COLORS, minutesToTime, type FailReason } from '@/types'

function getBorderColor(reason: FailReason, message: string): string {
  if (message.startsWith('✓')) return '#22C55E'
  return FAIL_REASON_COLORS[reason] ?? '#6B7280'
}

function FeedbackItem({
  item,
  onDismiss,
}: {
  item: { id: string; timestamp: number; shipName: string; reason: FailReason; message: string }
  onDismiss: (id: string) => void
}) {
  const dismiss = useCallback(() => onDismiss(item.id), [item.id, onDismiss])

  useEffect(() => {
    const timer = setTimeout(dismiss, 8000)
    return () => clearTimeout(timer)
  }, [dismiss])

  const borderColor = getBorderColor(item.reason, item.message)

  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-md bg-gray-800/90 backdrop-blur-sm shadow-lg animate-slide-in-right"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="font-mono">{minutesToTime(item.timestamp)}</span>
          <span className="text-gray-500">|</span>
          <span className="font-medium text-gray-300">{item.shipName}</span>
        </div>
        <p className="text-sm text-gray-200 mt-0.5 truncate">{item.message}</p>
      </div>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors mt-0.5"
      >
        ×
      </button>
    </div>
  )
}

export default function FeedbackBar() {
  const feedbacks = useGameStore((s) => s.feedbacks)
  const dismissFeedback = useGameStore((s) => s.dismissFeedback)
  const [showHistory, setShowHistory] = useState(false)

  const recent = feedbacks.slice(-5).reverse()
  const hasFeedback = feedbacks.length > 0

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {showHistory && (
        <div className="pointer-events-auto max-h-72 overflow-y-auto mx-auto max-w-3xl px-4 pb-2">
          <div className="bg-gray-900/95 backdrop-blur-md rounded-lg border border-gray-700/50 p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-400 tracking-wide">全部记录</span>
              <span className="text-xs text-gray-500">{feedbacks.length} 条</span>
            </div>
            {feedbacks
              .slice()
              .reverse()
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 px-2 py-1.5 rounded bg-gray-800/70"
                  style={{ borderLeft: `2px solid ${getBorderColor(item.reason, item.message)}` }}
                >
                  <span className="text-xs text-gray-500 font-mono shrink-0">
                    {minutesToTime(item.timestamp)}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">{item.shipName}</span>
                  <span className="text-xs text-gray-300 flex-1 truncate">{item.message}</span>
                  <button
                    onClick={() => dismissFeedback(item.id)}
                    className="text-gray-600 hover:text-gray-400 transition-colors text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="pointer-events-auto mx-auto max-w-3xl px-4 pb-3">
        <div className="space-y-2">
          {recent.map((item) => (
            <FeedbackItem key={item.id} item={item} onDismiss={dismissFeedback} />
          ))}
        </div>

        {hasFeedback && (
          <div className="flex justify-end mt-1">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800/80 backdrop-blur-sm px-3 py-1 rounded-full border border-gray-700/50 transition-colors"
            >
              {showHistory ? '收起' : `历史 (${feedbacks.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
