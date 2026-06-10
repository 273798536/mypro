import { cn } from '@/lib/utils'
import type { LineageStep } from '@/types'
import LineageNode from './LineageNode'
import { GitBranch } from 'lucide-react'

interface LineageFlowProps {
  steps: LineageStep[]
  currentStep?: string
  onStepClick?: (step: LineageStep) => void
  className?: string
  title?: string
}

export default function LineageFlow({
  steps,
  currentStep,
  onStepClick,
  className,
  title = '谱系追踪',
}: LineageFlowProps) {
  return (
    <div className={cn('glass-card p-6', className)}>
      <div className="flex items-center gap-2 mb-6">
        <GitBranch className="w-5 h-5 text-teal-400" />
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <span className="text-xs text-lab-400 bg-white/10 px-2 py-0.5 rounded-full ml-2">
          共 {steps.length} 个步骤
        </span>
      </div>

      <div className="relative overflow-x-auto scrollbar-thin pb-4">
        <div className="flex items-start gap-12 min-w-max py-4">
          {steps.map((step, index) => (
            <LineageNode
              key={step.id}
              step={step}
              isActive={currentStep === step.id}
              isLast={index === steps.length - 1}
              onClick={() => onStepClick?.(step)}
            />
          ))}
        </div>

        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none -z-0"
          style={{ minWidth: steps.length * 248 + 'px' }}
        >
          <defs>
            <linearGradient id="line-success" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="line-warning" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="line-error" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="line-info" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="line-pending" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex items-center justify-end gap-4 mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-lab-300">成功</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs text-lab-300">警告</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-lab-300">失败</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-sky-500" />
          <span className="text-xs text-lab-300">进行中</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-500" />
          <span className="text-xs text-lab-300">待处理</span>
        </div>
      </div>
    </div>
  )
}
