import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { WorkOrderStatus, WorkOrderType } from '@/types'
import { ChevronDown, ChevronRight, FileText, Camera, MessageSquare, ClipboardCheck } from 'lucide-react'

const statusColorMap: Record<WorkOrderStatus, string> = {
  open: '#DC2626',
  in_progress: '#D97706',
  closed: '#059669',
}

const statusLabelMap: Record<WorkOrderStatus, string> = {
  open: '待处理',
  in_progress: '处理中',
  closed: '已关闭',
}

const typeLabelMap: Record<WorkOrderType, string> = {
  valve_correction: '阀门纠正',
  route_update: '路线更新',
  conflict_investigation: '冲突调查',
  model_update: '模型更新',
}

const evidenceTypeIcon: Record<string, string> = {
  screenshot: '📷',
  workorder: '📋',
  model_snapshot: '🔬',
  annotation: '📝',
}

export default function WorkOrderPanel() {
  const workOrders = useAppStore((s) => s.workOrders)
  const selectedWorkOrderId = useAppStore((s) => s.selectedWorkOrderId)
  const setSelectedWorkOrder = useAppStore((s) => s.setSelectedWorkOrder)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const openCount = workOrders.filter((w) => w.status === 'open').length
  const inProgressCount = workOrders.filter((w) => w.status === 'in_progress').length
  const closedCount = workOrders.filter((w) => w.status === 'closed').length

  const selectedWorkOrder = workOrders.find((w) => w.id === selectedWorkOrderId)

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: 'Noto Sans SC, sans-serif' }}>
      <div className="flex items-center gap-3 border-b px-3 py-2" style={{ borderColor: '#1E3A5F' }}>
        <div className="flex items-center gap-1 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: '#DC2626' }} />
          <span style={{ color: '#94A3B8' }}>待处理</span>
          <span style={{ color: '#DC2626', fontFamily: 'JetBrains Mono, monospace' }}>{openCount}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: '#D97706' }} />
          <span style={{ color: '#94A3B8' }}>处理中</span>
          <span style={{ color: '#D97706', fontFamily: 'JetBrains Mono, monospace' }}>{inProgressCount}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: '#059669' }} />
          <span style={{ color: '#94A3B8' }}>已关闭</span>
          <span style={{ color: '#059669', fontFamily: 'JetBrains Mono, monospace' }}>{closedCount}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E3A5F transparent' }}>
        {workOrders.length === 0 && (
          <div className="py-8 text-center text-xs" style={{ color: '#475569' }}>暂无工单数据</div>
        )}
        <div className="relative ml-2">
          <div className="absolute bottom-0 left-0 top-0 w-px" style={{ background: '#1E3A5F' }} />
          <div className="flex flex-col gap-2">
            {workOrders.map((wo) => {
              const isExpanded = expandedIds.has(wo.id)
              const isSelected = selectedWorkOrderId === wo.id
              return (
                <div key={wo.id} className="relative pl-4">
                  <div
                    className="absolute left-0 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2"
                    style={{ borderColor: statusColorMap[wo.status], background: isSelected ? statusColorMap[wo.status] : '#0F1D2F' }}
                  />
                  <div
                    onClick={() => setSelectedWorkOrder(wo.id)}
                    className="cursor-pointer rounded border px-2 py-1.5 transition-colors"
                    style={{
                      background: isSelected ? '#1E293B' : 'rgba(30,64,175,0.04)',
                      borderColor: isSelected ? '#1E40AF' : '#1E3A5F',
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); toggleExpand(wo.id) }} className="shrink-0">
                        {isExpanded ? <ChevronDown size={12} style={{ color: '#64748B' }} /> : <ChevronRight size={12} style={{ color: '#64748B' }} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-medium" style={{ color: '#CBD5E1' }}>{wo.title}</span>
                          <span
                            className="shrink-0 rounded px-1 py-px text-[10px]"
                            style={{ background: `${statusColorMap[wo.status]}18`, color: statusColorMap[wo.status] }}
                          >
                            {statusLabelMap[wo.status]}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px]" style={{ color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                          <span>{wo.id}</span>
                          <span>{typeLabelMap[wo.type]}</span>
                        </div>
                        <div className="mt-0.5 text-[10px]" style={{ color: '#475569' }}>
                          {wo.createdAt} · {wo.assignee || wo.creator}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 border-t pl-4 pt-2" style={{ borderColor: '#1E3A5F' }}>
                        <div className="text-[10px]" style={{ color: '#94A3B8' }}>{wo.description}</div>
                        {wo.relatedConflictIds.length > 0 && (
                          <div className="mt-1 text-[10px]" style={{ color: '#64748B' }}>
                            关联冲突: <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{wo.relatedConflictIds.join(', ')}</span>
                          </div>
                        )}
                        {wo.relatedValveIds.length > 0 && (
                          <div className="mt-0.5 text-[10px]" style={{ color: '#64748B' }}>
                            关联阀门: <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{wo.relatedValveIds.join(', ')}</span>
                          </div>
                        )}
                        {wo.relatedRouteIds.length > 0 && (
                          <div className="mt-0.5 text-[10px]" style={{ color: '#64748B' }}>
                            关联路线: <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{wo.relatedRouteIds.join(', ')}</span>
                          </div>
                        )}
                        {wo.comments.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center gap-1 text-[10px]" style={{ color: '#64748B' }}>
                              <MessageSquare size={10} />
                              评论 ({wo.comments.length})
                            </div>
                            {wo.comments.map((comment) => (
                              <div key={comment.id} className="mt-1 border-l-2 pl-2" style={{ borderColor: '#1E3A5F' }}>
                                <div className="text-[10px]" style={{ color: '#94A3B8' }}>{comment.content}</div>
                                <div className="text-[10px]" style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{comment.author} · {comment.timestamp}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selectedWorkOrder && (
        <div className="border-t p-3" style={{ borderColor: '#1E3A5F', background: 'rgba(15,29,47,0.8)' }}>
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: '#60A5FA' }}>
            <ClipboardCheck size={12} />
            证据 & 附件
          </div>
          {(selectedWorkOrder.attachments.length === 0 && selectedWorkOrder.relatedConflictIds.length === 0) && (
            <div className="mt-1 text-[10px]" style={{ color: '#475569' }}>暂无关联证据</div>
          )}
          {selectedWorkOrder.relatedConflictIds.length > 0 && (
            <div className="mt-1.5">
              {selectedWorkOrder.relatedConflictIds.map((cid) => (
                <div key={cid} className="flex items-center gap-1 text-[10px]" style={{ color: '#D97706' }}>
                  <FileText size={10} />
                  补充证据 · 冲突 {cid}
                </div>
              ))}
            </div>
          )}
          {selectedWorkOrder.attachments.map((att) => (
            <div key={att.id} className="mt-1 flex items-start gap-1.5 text-[10px]" style={{ color: '#94A3B8' }}>
              <span>{evidenceTypeIcon[att.type] || '📎'}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate">{att.description}</div>
                <div style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{att.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
