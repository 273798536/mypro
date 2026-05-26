import { useState } from 'react'
import { useDataStore } from '../../store/useDataStore'
import { formatDateTime } from '../../utils/timeUtils'
import { getAlertLevelColor } from '../../utils/colorScale'
import type { Alert } from '../../types/scene'

export function Alerts() {
  const { alerts, updateAlertStatus } = useDataStore()
  const [filter, setFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  const filteredAlerts = alerts.filter((alert) => {
    const statusMatch = filter === 'all' || alert.status === filter
    const levelMatch = levelFilter === 'all' || alert.level === levelFilter
    return statusMatch && levelMatch
  })

  const stats = {
    total: alerts.length,
    pending: alerts.filter((a) => a.status === 'pending').length,
    acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
    resolved: alerts.filter((a) => a.status === 'resolved' || a.status === 'auto-resolved').length,
    needsConfirm: alerts.filter((a) => a.needsManualConfirm).length,
  }

  const handleStatusChange = (alertId: string, status: Alert['status'], note?: string) => {
    updateAlertStatus(alertId, status, note)
    if (selectedAlert?.id === alertId) {
      setSelectedAlert(null)
    }
  }

  return (
    <div className="w-full h-full overflow-auto p-6 grid-bg">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">📋 告警管理中心</h1>

        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="glass-panel p-4">
            <p className="text-gray-400 text-sm">告警总数</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="glass-panel p-4 border-l-4 border-dc-danger">
            <p className="text-gray-400 text-sm">待处理</p>
            <p className="text-3xl font-bold text-dc-danger mt-1">{stats.pending}</p>
          </div>
          <div className="glass-panel p-4 border-l-4 border-dc-warning">
            <p className="text-gray-400 text-sm">已确认</p>
            <p className="text-3xl font-bold text-dc-warning mt-1">{stats.acknowledged}</p>
          </div>
          <div className="glass-panel p-4 border-l-4 border-dc-success">
            <p className="text-gray-400 text-sm">已解决</p>
            <p className="text-3xl font-bold text-dc-success mt-1">{stats.resolved}</p>
          </div>
          <div className="glass-panel p-4 border-l-4 border-dc-accent">
            <p className="text-gray-400 text-sm">需人工确认</p>
            <p className="text-3xl font-bold text-dc-accent mt-1">{stats.needsConfirm}</p>
          </div>
        </div>

        <div className="glass-panel p-4 mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">状态筛选:</span>
            {[
              { value: 'all', label: '全部' },
              { value: 'pending', label: '待处理' },
              { value: 'acknowledged', label: '已确认' },
              { value: 'resolved', label: '已解决' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  filter === option.value
                    ? 'bg-dc-primary text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">级别筛选:</span>
            {[
              { value: 'all', label: '全部' },
              { value: 'critical', label: '严重' },
              { value: 'warning', label: '警告' },
              { value: 'info', label: '信息' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setLevelFilter(option.value)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  levelFilter === option.value
                    ? 'bg-dc-primary text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel overflow-hidden">
          <table className="w-full">
            <thead className="bg-black/30">
              <tr>
                <th className="text-left p-4 text-gray-400 text-sm font-medium">时间</th>
                <th className="text-left p-4 text-gray-400 text-sm font-medium">级别</th>
                <th className="text-left p-4 text-gray-400 text-sm font-medium">消息</th>
                <th className="text-left p-4 text-gray-400 text-sm font-medium">来源</th>
                <th className="text-left p-4 text-gray-400 text-sm font-medium">状态</th>
                <th className="text-left p-4 text-gray-400 text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  className={`border-t border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                    selectedAlert?.id === alert.id ? 'bg-dc-primary/10' : ''
                  }`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <td className="p-4 text-sm text-gray-300 font-mono">
                    {formatDateTime(alert.timestamp)}
                  </td>
                  <td className="p-4">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: getAlertLevelColor(alert.level) + '20',
                        color: getAlertLevelColor(alert.level),
                      }}
                    >
                      {alert.level === 'critical' ? '严重' : alert.level === 'warning' ? '警告' : '信息'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-white">
                    {alert.message}
                    {alert.needsManualConfirm && (
                      <span className="ml-2 text-xs text-dc-warning">⚠️ 需确认</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {alert.sourceType === 'rack' ? '机柜' : alert.sourceType === 'ac' ? '空调' : alert.sourceType === 'temperature' ? '温度' : '电源'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      alert.status === 'pending' ? 'bg-dc-danger/20 text-dc-danger' :
                      alert.status === 'acknowledged' ? 'bg-dc-warning/20 text-dc-warning' :
                      alert.status === 'auto-resolved' ? 'bg-dc-accent/20 text-dc-accent' :
                      'bg-dc-success/20 text-dc-success'
                    }`}>
                      {alert.status === 'pending' ? '待处理' :
                       alert.status === 'acknowledged' ? '已确认' :
                       alert.status === 'auto-resolved' ? '自动修复' : '已解决'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {alert.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusChange(alert.id, 'acknowledged')
                          }}
                          className="px-3 py-1 bg-dc-primary/20 text-dc-primary rounded text-xs hover:bg-dc-primary/30 transition-colors"
                        >
                          确认
                        </button>
                      )}
                      {alert.status === 'acknowledged' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusChange(alert.id, 'resolved', '人工处理完成')
                          }}
                          className="px-3 py-1 bg-dc-success/20 text-dc-success rounded text-xs hover:bg-dc-success/30 transition-colors"
                        >
                          解决
                        </button>
                      )}
                      {alert.needsManualConfirm && alert.status === 'auto-resolved' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusChange(alert.id, 'resolved', '人工确认通过')
                          }}
                          className="px-3 py-1 bg-dc-accent/20 text-dc-accent rounded text-xs hover:bg-dc-accent/30 transition-colors"
                        >
                          确认
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedAlert && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setSelectedAlert(null)}>
            <div className="glass-panel p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white mb-4">告警详情</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">时间</span>
                  <span className="text-white font-mono">{formatDateTime(selectedAlert.timestamp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">级别</span>
                  <span style={{ color: getAlertLevelColor(selectedAlert.level) }}>
                    {selectedAlert.level === 'critical' ? '严重' : selectedAlert.level === 'warning' ? '警告' : '信息'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">来源类型</span>
                  <span className="text-white">
                    {selectedAlert.sourceType === 'rack' ? '机柜' : selectedAlert.sourceType === 'ac' ? '空调' : selectedAlert.sourceType === 'temperature' ? '温度' : '电源'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">状态</span>
                  <span className={`${
                    selectedAlert.status === 'pending' ? 'text-dc-danger' :
                    selectedAlert.status === 'acknowledged' ? 'text-dc-warning' :
                    selectedAlert.status === 'auto-resolved' ? 'text-dc-accent' :
                    'text-dc-success'
                  }`}>
                    {selectedAlert.status === 'pending' ? '待处理' :
                     selectedAlert.status === 'acknowledged' ? '已确认' :
                     selectedAlert.status === 'auto-resolved' ? '自动修复' : '已解决'}
                  </span>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-gray-400 mb-2">消息</p>
                  <p className="text-white">{selectedAlert.message}</p>
                </div>
                {selectedAlert.correctionNote && (
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-gray-400 mb-2">备注</p>
                    <p className="text-dc-accent">{selectedAlert.correctionNote}</p>
                  </div>
                )}
                {selectedAlert.needsManualConfirm && (
                  <p className="text-dc-warning text-xs">⚠️ 此告警需要人工确认</p>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
