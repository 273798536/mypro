import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import type { Complaint, ComplaintStatus } from '@/types'

interface SampleListProps {
  data: Complaint[]
}

const statusConfig: Record<ComplaintStatus, { label: string; color: string; bgColor: string }> = {
  pending: {
    label: '待复核',
    color: 'text-duplicate-yellow',
    bgColor: 'bg-duplicate-yellow/10',
  },
  reviewing: {
    label: '待复核',
    color: 'text-fire-orange',
    bgColor: 'bg-fire-orange/10',
  },
  rejected: {
    label: '已驳回',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  supplemented: {
    label: '已补录',
    color: 'text-success-green',
    bgColor: 'bg-success-green/10',
  },
}

export default function SampleList({ data }: SampleListProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-caliber-blue/50 rounded-xl p-6 border border-fire-orange/20 h-full">
      <h3 className="text-fire-white text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-fire-orange rounded-full" />
        投诉样例
      </h3>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {data.map((complaint) => {
          const status = statusConfig[complaint.status]
          return (
            <div
              key={complaint.id}
              onClick={() => navigate(`/trace/${complaint.id}`)}
              className={`relative flex gap-4 p-4 bg-fire-deep/50 rounded-xl border border-fire-orange/10 card-hover cursor-pointer overflow-hidden ${complaint.isDuplicate ? 'pl-6' : ''}`}
            >
              {complaint.isDuplicate && (
                <>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-duplicate-yellow" />
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-duplicate-yellow/20 text-duplicate-yellow text-xs font-medium rounded">
                    重复
                  </span>
                </>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-fire-white font-medium truncate pr-16">{complaint.title}</h4>
                <div className="flex items-center gap-1 text-fire-white/50 text-sm mt-1">
                  <MapPin size={14} />
                  <span className="truncate">{complaint.address}</span>
                </div>
              </div>
              <div className="shrink-0 self-center">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}>
                  {status.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
