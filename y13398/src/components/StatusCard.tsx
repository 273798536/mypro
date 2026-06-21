import { CheckCircle, AlertTriangle, Clock, BarChart3 } from 'lucide-react'

interface StatusCardProps {
  label: string
  value: number
  variant: 'processed' | 'pending' | 'anomalous' | 'total'
}

const variants = {
  processed: {
    icon: CheckCircle,
    bg: 'bg-[#0D2818]',
    border: 'border-[#10B981]/30',
    iconColor: 'text-[#10B981]',
    valueColor: 'text-[#34D399]',
    glow: 'shadow-[#10B981]/10',
  },
  pending: {
    icon: Clock,
    bg: 'bg-[#1A1708]',
    border: 'border-[#F59E0B]/30',
    iconColor: 'text-[#F59E0B]',
    valueColor: 'text-[#FBBF24]',
    glow: 'shadow-[#F59E0B]/10',
  },
  anomalous: {
    icon: AlertTriangle,
    bg: 'bg-[#1C0A0A]',
    border: 'border-[#EF4444]/30',
    iconColor: 'text-[#EF4444]',
    valueColor: 'text-[#F87171]',
    glow: 'shadow-[#EF4444]/10',
  },
  total: {
    icon: BarChart3,
    bg: 'bg-[#0D1B2A]',
    border: 'border-[#7DD3FC]/20',
    iconColor: 'text-[#7DD3FC]',
    valueColor: 'text-[#BAE6FD]',
    glow: 'shadow-[#7DD3FC]/10',
  },
}

export default function StatusCard({ label, value, variant }: StatusCardProps) {
  const v = variants[variant]
  const Icon = v.icon

  return (
    <div className={`${v.bg} ${v.border} border rounded-xl p-5 shadow-lg ${v.glow} transition-transform hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#7B8FA3] text-xs font-medium tracking-wide uppercase">{label}</span>
        <Icon size={20} className={v.iconColor} strokeWidth={1.8} />
      </div>
      <p className={`text-3xl font-bold ${v.valueColor} tracking-tight`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {value}
      </p>
    </div>
  )
}
