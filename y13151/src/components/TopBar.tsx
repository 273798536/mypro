import { useEffect, useState } from 'react'
import { AlertTriangle, Database } from 'lucide-react'
import { useAnomalies, useRows } from '@/hooks/useAppStore'

const titleMap: Record<string, string> = {
  '/dashboard': '总览看板',
  '/logs': '日志工作台',
  '/compute': '预警计算与人工改判',
  '/chart': '图表复盘',
  '/handover': '交付视图',
}

interface TopBarProps {
  pathname: string
}

const TopBar = ({ pathname }: TopBarProps) => {
  const anomalies = useAnomalies()
  const rows = useRows()
  const [saved, setSaved] = useState(true)

  const openAnomalies = anomalies.filter((a) => a.status === 'open').length
  const pendingDir = rows.filter((r) => r.directionSuspicious).length

  useEffect(() => {
    const handler = () => {
      setSaved(false)
      setTimeout(() => setSaved(true), 400)
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  useEffect(() => {
    setSaved(false)
    const t = setTimeout(() => setSaved(true), 400)
    return () => clearTimeout(t)
  }, [rows.length, anomalies.length])

  const title = titleMap[pathname] || '工作台'

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-badges">
        {pendingDir > 0 && (
          <span className="chip chip-amber" title="待确认方向疑点">
            <AlertTriangle size={12} />
            {pendingDir} 方向待确认
          </span>
        )}
        {openAnomalies > 0 && (
          <span className="chip chip-coral" title="异常队列">
            <AlertTriangle size={12} />
            {openAnomalies} 异常待处理
          </span>
        )}
        <div className="flex items-center gap-1.5 ml-2" title={saved ? '已保存' : '保存中...'}>
          <Database size={14} className="text-gray-500" />
          <span className={'status-dot ' + (saved ? 'saved' : 'pending')} />
          <span className="text-xs text-gray-500">{saved ? '已保存' : '保存中'}</span>
        </div>
      </div>
    </header>
  )
}

export default TopBar
