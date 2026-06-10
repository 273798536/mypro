import { Clock } from 'lucide-react'
import { Batch, BatchStatus } from '@/store'
import StatusBadge from './StatusBadge'

const statusColorMap: Record<BatchStatus, string> = {
  imported: 'bg-cool-gray',
  analyzing: 'bg-blue-500',
  pending_review: 'bg-amber-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-coral-500',
  exported: 'bg-indigo-600',
}

const statusProgressMap: Record<BatchStatus, number> = {
  imported: 10,
  analyzing: 40,
  pending_review: 60,
  approved: 80,
  rejected: 30,
  exported: 100,
}

interface BatchCardProps {
  batch: Batch
  onClick?: (id: string) => void
}

export default function BatchCard({ batch, onClick }: BatchCardProps) {
  const progress = statusProgressMap[batch.status]

  return (
    <div
      onClick={() => onClick?.(batch.id)}
      className="bg-white rounded-lg overflow-hidden card-hover cursor-pointer border border-gray-200"
    >
      <div className={`h-1.5 ${statusColorMap[batch.status]} transition-colors duration-300`} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-serif font-semibold text-indigo-900 text-sm">
            {batch.batchNo}
          </h3>
          <StatusBadge status={batch.status} />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-cool-gray mb-3">
          <Clock size={12} />
          <span>{new Date(batch.createdAt).toLocaleString('zh-CN')}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${statusColorMap[batch.status]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-right text-xs text-cool-gray mt-1 font-mono">
          {progress}%
        </div>
      </div>
    </div>
  )
}
