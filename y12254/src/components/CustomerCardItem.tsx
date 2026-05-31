import type { CustomerCard } from '@/types'
import { Clock, Timer, AlertTriangle } from 'lucide-react'

interface Props {
  customer: CustomerCard
  currentTick: number
  highlight?: boolean
}

export default function CustomerCardItem({ customer, currentTick, highlight }: Props) {
  const isAbnormal = customer.isAbnormal
  const waitTime = customer.status === 'waiting'
    ? currentTick - customer.waitStartTime
    : customer.waitEndTime !== null
      ? customer.waitEndTime - customer.waitStartTime
      : 0

  const statusColor = {
    waiting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    serving: 'bg-window-serving/20 text-orange-700 border-orange-300',
    completed: 'bg-green-100 text-green-700 border-green-300',
    no_show: 'bg-red-100 text-red-700 border-red-300',
    abandoned: 'bg-gray-100 text-gray-600 border-gray-300',
  }[customer.status]

  const statusLabel = {
    waiting: '等待中',
    serving: '服务中',
    completed: '已完成',
    no_show: '已爽约',
    abandoned: '已放弃',
  }[customer.status]

  return (
    <div
      className={`relative rounded-xl border-2 p-3 transition-all duration-200 ${
        highlight ? 'ring-2 ring-anomaly animate-pulse-glow' : ''
      } ${isAbnormal ? 'border-anomaly bg-anomaly/5' : 'border-milk-200 bg-white'} ${
        customer.status === 'no_show' ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-milk-700 text-sm">{customer.appointmentNo}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-milk-600">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          到达: T{customer.arrivalTime}
        </span>
        <span className="flex items-center gap-1">
          <Timer size={12} />
          时长: {customer.serviceDuration}
          {customer.serviceDuration !== customer.originalServiceDuration && (
            <span className="text-red-500 line-through ml-0.5">{customer.originalServiceDuration}</span>
          )}
        </span>
      </div>

      {customer.status === 'waiting' && (
        <div className="mt-1 text-xs text-yellow-600 font-medium">
          等待: {waitTime} 单位
        </div>
      )}

      {customer.assignedWindow !== null && (
        <div className="mt-1 text-xs text-milk-500">
          窗口: {customer.assignedWindow + 1}
        </div>
      )}

      {isAbnormal && customer.abnormalReason && (
        <div className="mt-1 flex items-center gap-1 text-xs text-anomaly font-medium">
          <AlertTriangle size={12} />
          {customer.abnormalReason}
        </div>
      )}
    </div>
  )
}
