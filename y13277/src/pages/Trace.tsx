import { useParams, useNavigate, Link } from 'react-router-dom'
import { Home, MapPin, Calendar, FileText, ArrowRight, AlertTriangle, Copy } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import ApprovalTimeline from '@/components/ApprovalTimeline'
import CaliberTracker from '@/components/CaliberTracker'
import ApiResponsePanel from '@/components/ApiResponsePanel'
import type { ComplaintStatus } from '@/types'

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

export default function Trace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const complaint = useAppStore((state) => state.getComplaintById(id || ''))

  if (!complaint) {
    return (
      <div className="flex items-center justify-center h-full text-fire-white/60 text-xl">
        投诉记录不存在
      </div>
    )
  }

  const status = statusConfig[complaint.status]

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <nav className="flex items-center gap-2 text-sm">
        <Link
          to="/"
          className="flex items-center gap-1 text-fire-white/50 hover:text-fire-orange transition-colors"
        >
          <Home size={16} />
          首页
        </Link>
        <span className="text-fire-white/30">/</span>
        <span className="text-fire-orange font-medium">溯源详情</span>
      </nav>

      <div className="bg-caliber-blue/50 rounded-xl p-6 border border-fire-orange/20 relative overflow-hidden">
        {complaint.isDuplicate && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-duplicate-yellow" />
            <span className="absolute top-4 right-4 px-3 py-1 bg-duplicate-yellow/20 text-duplicate-yellow text-sm font-medium rounded-lg flex items-center gap-2">
              <Copy size={14} />
              重复投诉
            </span>
          </>
        )}
        {complaint.isAbnormal && (
          <span className="absolute top-4 right-24 px-3 py-1 bg-red-500/20 text-red-400 text-sm font-medium rounded-lg flex items-center gap-2">
            <AlertTriangle size={14} />
            异常投诉
          </span>
        )}

        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl font-bold text-fire-white font-serif">
                {complaint.title}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}
              >
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-fire-white/60">
                <MapPin size={16} className="text-fire-orange shrink-0" />
                <span>{complaint.address}</span>
              </div>
              <div className="flex items-center gap-2 text-fire-white/60">
                <Calendar size={16} className="text-fire-orange shrink-0" />
                <span>{formatTime(complaint.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-fire-white/60">
                <FileText size={16} className="text-fire-orange shrink-0" />
                <span>投诉编号：{complaint.id}</span>
              </div>
            </div>

            {complaint.supplementNote && (
              <div className="mt-4 p-4 bg-success-green/10 border border-success-green/30 rounded-lg">
                <p className="text-success-green text-sm">
                  <span className="font-medium">补录说明：</span>
                  {complaint.supplementNote}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(`/supplement/${complaint.id}`)}
            className="flex items-center gap-2 px-6 py-3 bg-fire-orange hover:bg-fire-orange/80 text-fire-white font-medium rounded-xl transition-all hover:scale-105 shrink-0"
          >
            去补录
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:row-span-2">
          <ApprovalTimeline complaintId={complaint.id} />
        </div>
        <div className="space-y-6">
          <CaliberTracker complaintId={complaint.id} />
          <ApiResponsePanel complaintId={complaint.id} />
        </div>
      </div>
    </div>
  )
}
