import { Check, AlertTriangle, X } from 'lucide-react'
import type { HandoverItem } from '@/types'

type VerifyStatus = HandoverItem['verificationStatus']

interface VerifyButtonProps {
  itemId: string
  currentStatus: VerifyStatus
  onStatusChange: (itemId: string, status: VerifyStatus) => void
}

const statusConfig: Record<VerifyStatus, {
  label: string
  className: string
  icon: React.ComponentType<{ size?: number | string }> | null
}> = {
  pending: {
    label: '待验证',
    className: 'border border-gray-500 text-gray-400 hover:bg-gray-700/50',
    icon: null,
  },
  verified: {
    label: '已验证',
    className: 'bg-green-600 text-white hover:bg-green-700',
    icon: Check,
  },
  supplement: {
    label: '待补充',
    className: 'bg-yellow-600 text-white hover:bg-yellow-700',
    icon: AlertTriangle,
  },
  rejected: {
    label: '驳回',
    className: 'bg-red-600 text-white hover:bg-red-700',
    icon: X,
  },
}

export default function VerifyButton({ itemId, currentStatus, onStatusChange }: VerifyButtonProps) {
  const config = statusConfig[currentStatus]
  const Icon = config.icon

  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${config.className}`}
      onClick={() => onStatusChange(itemId, currentStatus)}
    >
      {Icon && <Icon size={14} />}
      {config.label}
    </button>
  )
}
