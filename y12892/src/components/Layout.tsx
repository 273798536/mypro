import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAppStore } from '@/store/appStore'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

export default function Layout() {
  const currentBatchId = useAppStore((s) => s.currentBatchId)
  const riskLevel = useAppStore((s) => s.computeResult?.riskLevel)
  const waterQualityAlert = useAppStore((s) => s.computeResult?.waterQualityAlert)

  const getRiskBarClass = () => {
    switch (riskLevel) {
      case 'high': return 'from-coral-600 to-coral-500'
      case 'medium': return 'from-amber-600 to-amber-500'
      case 'low': return 'from-tide-600 to-tide-500'
      default: return 'from-deep-600 to-deep-500'
    }
  }

  const getRiskLabel = () => {
    switch (riskLevel) {
      case 'high': return '高风险'
      case 'medium': return '中风险'
      case 'low': return '低风险'
      default: return '待评估'
    }
  }

  const getAlertLabel = () => {
    switch (waterQualityAlert) {
      case 'warning': return '水质预警'
      case 'watch': return '水质关注'
      case 'normal': return '水质正常'
      default: return '水质待评'
    }
  }

  const getAlertIcon = () => {
    switch (waterQualityAlert) {
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5" />
      case 'watch': return <Info className="w-3.5 h-3.5" />
      case 'normal': return <CheckCircle2 className="w-3.5 h-3.5" />
      default: return <Info className="w-3.5 h-3.5" />
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="text-sm text-slate-600">
            海洋环境监测 · 海浪谱参数分析系统
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">
              当前时间：{new Date().toLocaleString('zh-CN')}
            </span>
            <span className="text-slate-500">监测员</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        {currentBatchId && (
          <div className={`h-10 bg-gradient-to-r ${getRiskBarClass()} text-white flex items-center justify-between px-6 text-xs shrink-0`}>
            <div className="flex items-center gap-4">
              <span className="font-medium">处理记录批次：{currentBatchId}</span>
              <span className="opacity-80">风险等级：{getRiskLabel()}</span>
              <span className="opacity-80 flex items-center gap-1">
                {getAlertIcon()}
                {getAlertLabel()}
              </span>
            </div>
            <div className="opacity-80">
              风险分层与水质预警共用此处理记录
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
