import { motion } from 'framer-motion'
import { Wallet, Landmark, Percent, Heart, Building2, Clock } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import type { GameStatus } from '@/types/game'

const STATUS_LABEL: Record<GameStatus, string> = {
  idle: '等待开始',
  playing: '进行中',
  paused: '已暂停',
  ended: '已结束',
}

const STATUS_COLOR: Record<GameStatus, string> = {
  idle: 'text-gray-400',
  playing: 'text-green-400',
  paused: 'text-amber-400',
  ended: 'text-red-400',
}

function AnimatedNum({ value, suffix = '' }: { value: number; suffix?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="font-mono text-xl text-[#D4A843]"
    >
      {value.toLocaleString()}{suffix}
    </motion.span>
  )
}

function MetricRow({ icon: Icon, label, children }: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-[#243447] px-3 py-2.5">
      <Icon size={18} className="mt-0.5 shrink-0 text-[#D4A843]" />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-400">{label}</span>
        {children}
      </div>
    </div>
  )
}

function SatisfactionBar({ value }: { value: number }) {
  const color = value > 60 ? 'bg-green-500' : value > 30 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#1B2838]">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}

export default function Dashboard() {
  const currentTurn = useGameStore(s => s.currentTurn)
  const maxTurns = useGameStore(s => s.config.maxTurns)
  const treasury = useGameStore(s => s.treasury)
  const debt = useGameStore(s => s.debt)
  const comprehensiveRate = useGameStore(s => s.comprehensiveRate)
  const satisfaction = useGameStore(s => s.satisfaction)
  const totalInfraInvestment = useGameStore(s => s.totalInfraInvestment)
  const status = useGameStore(s => s.status)

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col gap-3 bg-[#1B2838] p-4">
      <h2
        className="text-center text-sm tracking-widest text-[#D4A843]"
        style={{ fontFamily: '"Noto Serif SC", serif' }}
      >
        经营面板
      </h2>

      <div className="flex items-center justify-center gap-2 text-xs">
        <span className="text-gray-500">状态</span>
        <span className={`font-mono font-semibold ${STATUS_COLOR[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        <MetricRow icon={Clock} label="当前回合">
          <AnimatedNum value={currentTurn} />{` / `}<span className="font-mono text-sm text-gray-400">{maxTurns}</span>
        </MetricRow>

        <MetricRow icon={Wallet} label="国库余额 (万)">
          <AnimatedNum value={Math.round(treasury)} />
        </MetricRow>

        <MetricRow icon={Landmark} label="总债务 (万)">
          <AnimatedNum value={Math.round(debt)} />
        </MetricRow>

        <MetricRow icon={Percent} label="综合利率">
          <AnimatedNum value={parseFloat((comprehensiveRate * 100).toFixed(2))} suffix="%" />
        </MetricRow>

        <MetricRow icon={Heart} label="民生满意度">
          <AnimatedNum value={Math.round(satisfaction)} />
          <SatisfactionBar value={satisfaction} />
        </MetricRow>

        <MetricRow icon={Building2} label="累计基建投资 (万)">
          <AnimatedNum value={Math.round(totalInfraInvestment)} />
        </MetricRow>
      </div>
    </aside>
  )
}
