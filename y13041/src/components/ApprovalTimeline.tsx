import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApprovalEmail } from '@/shared/types'

interface ApprovalTimelineProps {
  emails: ApprovalEmail[]
}

export default function ApprovalTimeline({ emails }: ApprovalTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="h-full flex flex-col rounded-lg bg-white shadow-sm border border-slatefinance-100">
      <div className="px-5 py-4 border-b border-slatefinance-100">
        <h3 className="text-base font-semibold text-slatefinance-800">审批邮件时间线</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {emails.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slatefinance-400 text-sm">
            暂无审批邮件
          </div>
        ) : (
          <div className="relative">
            {(emails ?? []).map((email, index) => {
              const isExpanded = expandedIds.has(email.id)
              const isLast = index === (emails ?? []).length - 1

              return (
                <div key={email.id} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full flex-shrink-0 z-10',
                        email.isAnomaly
                          ? 'bg-red-500 animate-pulse-slow'
                          : 'bg-slatefinance-300'
                      )}
                    />
                    {!isLast && (
                      <div className="w-px flex-1 bg-slatefinance-200 mt-1" />
                    )}
                  </div>

                  <div className="flex-1 pb-6">
                    <div
                      className={cn(
                        'rounded-lg border p-4 cursor-pointer transition-colors',
                        email.isAnomaly
                          ? 'border-red-200 bg-red-50/50'
                          : 'border-slatefinance-100 bg-slatefinance-50/50 hover:bg-slatefinance-50'
                      )}
                      onClick={() => toggleExpand(email.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-amber-600">
                              {email.approverName}
                            </span>
                            {email.isAnomaly && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                                <AlertTriangle size={12} />
                                异常材料
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-slatefinance-400">
                            {new Date(email.sentAt).toLocaleString('zh-CN')}
                          </div>
                          <div className="mt-1.5 text-sm text-slatefinance-700 font-medium truncate">
                            {email.subject}
                          </div>
                          {email.isAnomaly && email.anomalyNote && (
                            <div className="mt-2 text-sm text-red-600">
                              {email.anomalyNote}
                            </div>
                          )}
                          {email.approverNameOriginal && (
                            <div className="mt-2 text-xs text-slatefinance-500">
                              审批人由『{email.approverNameOriginal}』改名为『{email.approverName}』
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-slatefinance-400">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slatefinance-200">
                          <div className="text-sm text-slatefinance-600 whitespace-pre-wrap leading-relaxed">
                            {email.content}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
