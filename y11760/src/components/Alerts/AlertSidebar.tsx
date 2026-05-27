import { AlertTriangle, Check, Eye } from 'lucide-react'
import { useRiskStore } from '../../stores/riskStore'
import { useGraphStore } from '../../stores/graphStore'
import { enterprises, persons } from '../../data/mockData'
import type { RiskAlert } from '../../types'

function AlertCard({ alert, index }: { alert: RiskAlert; index: number }) {
  const { confirmAlert } = useRiskStore()
  const { selectNode } = useGraphStore()

  const typeConfig = {
    circular: {
      icon: AlertTriangle,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      pulseColor: 'bg-red-500',
    },
    samePerson: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-400',
      pulseColor: 'bg-yellow-500',
    },
    occlusion: {
      icon: Eye,
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-400',
      pulseColor: 'bg-purple-500',
    },
  }

  const config = typeConfig[alert.type]
  const Icon = config.icon

  const handleFocus = () => {
    if (alert.relatedNodes.length > 0) {
      selectNode(alert.relatedNodes[0])
    }
  }

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3 ${
        alert.confirmed ? 'opacity-60' : ''
      } transition-all`}
    >
      <div className="flex items-start gap-2">
        <div className="relative mt-0.5">
          <Icon size={16} className={config.textColor} />
          {!alert.confirmed && (
            <span
              className={`absolute -top-1 -right-1 w-2 h-2 ${config.pulseColor} rounded-full animate-ping`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${config.textColor}`}>
              {alert.title}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                alert.severity === 'high'
                  ? 'bg-red-500/20 text-red-400'
                  : alert.severity === 'medium'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {alert.severity === 'high' ? '高' : alert.severity === 'medium' ? '中' : '低'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{alert.description}</p>

          {alert.relatedNodes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {alert.relatedNodes.slice(0, 4).map((nodeId) => {
                const ent = enterprises.find((e) => e.id === nodeId)
                const per = persons.find((p) => p.id === nodeId)
                const name = ent?.name ?? per?.name ?? nodeId
                return (
                  <button
                    key={nodeId}
                    onClick={() => selectNode(nodeId)}
                    className="px-1.5 py-0.5 bg-black/20 rounded text-[10px] text-gray-300 hover:bg-black/40 transition-colors"
                  >
                    {name}
                  </button>
                )
              })}
              {alert.relatedNodes.length > 4 && (
                <span className="px-1.5 py-0.5 text-[10px] text-gray-500">
                  +{alert.relatedNodes.length - 4}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleFocus}
              className="flex-1 px-2 py-1 bg-black/20 hover:bg-black/40 rounded text-[10px] text-gray-300 transition-colors"
            >
              查看节点
            </button>
            {!alert.confirmed && (
              <button
                onClick={() => confirmAlert(index)}
                className="flex items-center gap-1 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 rounded text-[10px] text-green-400 transition-colors"
              >
                <Check size={12} />
                确认风险
              </button>
            )}
            {alert.confirmed && (
              <span className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500">
                <Check size={12} />
                已确认
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AlertBanner() {
  const { getUnconfirmedAlerts } = useRiskStore()
  const alerts = useRiskStore((s) => s.alerts)
  const unconfirmed = getUnconfirmedAlerts()

  if (unconfirmed.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-red-900/80 to-transparent pt-2 px-4">
      <div className="max-w-2xl mx-auto bg-red-500/20 backdrop-blur border border-red-500/40 rounded-lg px-4 py-2 flex items-center gap-3">
        <div className="relative">
          <AlertTriangle size={20} className="text-red-400" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-red-400">
            检测到 {unconfirmed.length} 条待确认风险
          </span>
          <span className="text-xs text-gray-400 ml-2">
            {unconfirmed.filter((a) => a.type === 'circular').length} 条循环担保 ·{' '}
            {unconfirmed.filter((a) => a.type === 'samePerson').length} 条同人多企 ·{' '}
            {unconfirmed.filter((a) => a.type === 'occlusion').length} 条标签遮挡
          </span>
        </div>
        <div className="text-xs text-red-400 font-mono">
          ! 不可关闭，只能在下方卡片中逐个确认
        </div>
      </div>
    </div>
  )
}

export function AlertSidebar() {
  const { alerts } = useRiskStore()

  if (alerts.length === 0) return null

  return (
    <div className="w-72 bg-[#0f0f1f] border-l border-gray-800 h-full flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <span className="font-medium text-white">风险预警</span>
          <span className="ml-auto px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-semibold">
            {alerts.filter((a) => !a.confirmed).length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {alerts.map((alert, idx) => (
          <AlertCard key={idx} alert={alert} index={idx} />
        ))}
      </div>
    </div>
  )
}
