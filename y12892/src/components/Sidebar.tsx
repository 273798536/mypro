import { NavLink } from 'react-router-dom'
import {
  Calculator,
  FileCheck2,
  GitBranch,
  Download,
  Waves,
  Settings,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'

const navItems = [
  { path: '/', label: '计算工作台', icon: Calculator, key: 'compute' },
  { path: '/review', label: '复核面板', icon: FileCheck2, key: 'review' },
  { path: '/trace', label: '追溯链路', icon: GitBranch, key: 'trace' },
  { path: '/export', label: '下载导出', icon: Download, key: 'export' },
]

export default function Sidebar() {
  const currentBatchId = useAppStore((s) => s.currentBatchId)
  const riskLevel = useAppStore((s) => s.computeResult?.riskLevel)
  const waterQualityAlert = useAppStore((s) => s.computeResult?.waterQualityAlert)

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'high': return 'bg-coral-500'
      case 'medium': return 'bg-amber-500'
      case 'low': return 'bg-tide-500'
      default: return 'bg-slate-500'
    }
  }

  const getAlertColor = (level?: string) => {
    switch (level) {
      case 'warning': return 'text-coral-400'
      case 'watch': return 'text-amber-400'
      case 'normal': return 'text-tide-400'
      default: return 'text-slate-400'
    }
  }

  const getAlertLabel = (level?: string) => {
    switch (level) {
      case 'warning': return '预警'
      case 'watch': return '关注'
      case 'normal': return '正常'
      default: return '待定'
    }
  }

  const getRiskLabel = (level?: string) => {
    switch (level) {
      case 'high': return '高风险'
      case 'medium': return '中风险'
      case 'low': return '低风险'
      default: return '待评估'
    }
  }

  return (
    <aside className="w-64 h-screen bg-deep-900 border-r border-deep-800 flex flex-col">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-deep-800">
        <div className="w-9 h-9 rounded-lg bg-tide-500/20 flex items-center justify-center">
          <Waves className="w-5 h-5 text-tide-400" />
        </div>
        <div>
          <h1 className="text-white font-semibold text-base leading-tight">海浪谱参数计算</h1>
          <p className="text-deep-400 text-xs">海洋监测工作台</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-tide-500/15 text-tide-300 shadow-inner'
                    : 'text-deep-300 hover:bg-deep-800/60 hover:text-white'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" strokeWidth={1.8} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="px-3 pb-4 space-y-3">
        {currentBatchId && (
          <div className="p-3 rounded-lg bg-deep-800/60 border border-deep-700">
            <div className="text-deep-400 text-xs mb-2">当前批次</div>
            <div className="text-white text-xs font-mono mb-2.5 break-all">{currentBatchId}</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${getRiskColor(riskLevel)} animate-pulse-slow`}></span>
                <span className="text-deep-200 text-xs">{getRiskLabel(riskLevel)}</span>
              </div>
              <div className={`text-xs ${getAlertColor(waterQualityAlert)}`}>
                水质：{getAlertLabel(waterQualityAlert)}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-deep-400 hover:bg-deep-800/40 cursor-pointer transition-colors">
          <Settings className="w-4 h-4" />
          <span className="text-xs">系统设置</span>
        </div>
      </div>
    </aside>
  )
}
