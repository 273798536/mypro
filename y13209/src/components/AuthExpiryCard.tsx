import { useStore } from '@/store'
import { ShieldAlert, ShieldCheck, Shield, ShieldX, ArrowRight } from 'lucide-react'
import type { TimecodeEntry } from '@/types'

function daysUntil(endDate: string): number {
  const end = new Date(endDate)
  const today = new Date()
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function AuthCard({ entry }: { entry: TimecodeEntry }) {
  const { confirmAuthorization, updateAlignmentStatus } = useStore()
  const auth = entry.authorization
  const days = daysUntil(auth.endDate)

  const statusConfig = {
    valid: {
      icon: ShieldCheck,
      borderCls: 'border-emerald-500/30',
      bgCls: 'bg-emerald-500/5',
      iconCls: 'text-emerald-400',
      title: '授权有效',
      descCls: 'text-emerald-300',
    },
    expiring: {
      icon: Shield,
      borderCls: 'border-yellow-500/40',
      bgCls: 'bg-yellow-500/5',
      iconCls: 'text-yellow-400',
      title: '授权即将到期',
      descCls: 'text-yellow-300',
    },
    expired: {
      icon: ShieldX,
      borderCls: 'border-red-500/40',
      bgCls: 'bg-red-500/5',
      iconCls: 'text-red-400',
      title: '授权已过期',
      descCls: 'text-red-300',
    },
    needs_confirmation: {
      icon: ShieldAlert,
      borderCls: 'border-orange-500/40',
      bgCls: 'bg-orange-500/5',
      iconCls: 'text-orange-400',
      title: '需要人工确认',
      descCls: 'text-orange-300',
    },
  }

  const cfg = statusConfig[auth.status]
  const Icon = cfg.icon

  const handleConfirm = () => {
    const reason = prompt('请输入确认原因：')
    if (!reason) return
    const nextStep = prompt('请输入下一步操作：')
    if (!nextStep) return
    confirmAuthorization(entry.id, reason, nextStep)
  }

  const handleMarkAligned = () => {
    updateAlignmentStatus(entry.id, 'aligned')
  }

  return (
    <div className={`rounded-xl border ${cfg.borderCls} ${cfg.bgCls} p-4`}>
      <div className="flex items-center gap-3 mb-3">
        <Icon size={20} className={cfg.iconCls} />
        <div>
          <div className={`font-semibold text-sm ${cfg.descCls}`}>{cfg.title}</div>
          <div className="text-xs text-gray-400">
            授权期：{auth.startDate} → {auth.endDate}
          </div>
        </div>
        {auth.status !== 'valid' && (
          <div className="ml-auto">
            <div
              className={`font-mono text-2xl font-bold ${
                days < 0
                  ? 'text-red-400'
                  : days <= 7
                  ? 'text-yellow-400'
                  : 'text-orange-400'
              }`}
            >
              {days < 0 ? `${Math.abs(days)}天` : `${days}天`}
            </div>
            <div className="text-xs text-gray-500 text-right">
              {days < 0 ? '已过期' : '剩余'}
            </div>
          </div>
        )}
      </div>

      {(auth.confirmReason || auth.nextStep) && (
        <div className="bg-[#0d0d1a] rounded-lg p-3 mb-3 space-y-2">
          {auth.confirmReason && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5">原因</span>
              <span className="text-sm text-gray-300">{auth.confirmReason}</span>
            </div>
          )}
          {auth.nextStep && (
            <div className="flex items-start gap-2">
              <ArrowRight size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <span className="text-sm text-amber-400">{auth.nextStep}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {auth.status !== 'valid' && (
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2a2a4a] text-gray-300 hover:bg-amber-500/20 hover:text-amber-400 border border-[#3a3a5a] hover:border-amber-500/30 transition-all"
          >
            人工确认
          </button>
        )}
        {entry.alignmentStatus === 'misaligned' && (
          <button
            onClick={handleMarkAligned}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
          >
            标记已对齐
          </button>
        )}
      </div>
    </div>
  )
}

export default function AuthExpiryCard() {
  const { entries, activeEntryId } = useStore()
  const entry = entries.find((e) => e.id === activeEntryId)

  if (!entry) {
    return (
      <div className="rounded-xl border border-[#2a2a4a] bg-[#16162a]/50 p-6 text-center">
        <ShieldCheck size={32} className="mx-auto text-gray-600 mb-2" />
        <div className="text-sm text-gray-500">选择左侧条目查看授权信息</div>
      </div>
    )
  }

  return <AuthCard entry={entry} />
}
