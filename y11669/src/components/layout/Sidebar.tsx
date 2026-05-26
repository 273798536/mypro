import { useDataStore } from '../../store/useDataStore'
import { useSceneStore } from '../../store/useSceneStore'
import { formatDateTime, formatRelativeTime } from '../../utils/timeUtils'
import { getTemperatureHex, getStatusColor, getAlertLevelColor } from '../../utils/colorScale'

export function Sidebar() {
  const { racks, acUnits, alerts, dataQualityIssues } = useDataStore()
  const { selectedRackId, selectedAlertId, setSelectedAlertId } = useSceneStore()

  const selectedRack = racks.find((r) => r.id === selectedRackId)
  const selectedAlert = alerts.find((a) => a.id === selectedAlertId)
  const pendingAlerts = alerts.filter((a) => a.status === 'pending')

  return (
    <div className="absolute right-4 top-4 bottom-24 w-80 glass-panel overflow-hidden flex flex-col">
      <div className="p-4 border-b border-dc-primary/20">
        <h2 className="text-lg font-semibold text-dc-primary mb-1">机房监控面板</h2>
        <p className="text-xs text-gray-400">
          更新时间: {formatDateTime(new Date())}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {selectedRack && (
          <div className="space-y-3 p-3 rounded-lg bg-dc-primary/10 border border-dc-primary/30">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(selectedRack.status) }} />
              {selectedRack.name}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">进风温度</span>
                <p className="data-value text-lg" style={{ color: getTemperatureHex(selectedRack.inletTemp) }}>
                  {selectedRack.inletTemp.toFixed(1)}°C
                </p>
              </div>
              <div>
                <span className="text-gray-400">出风温度</span>
                <p className="data-value text-lg" style={{ color: getTemperatureHex(selectedRack.outletTemp) }}>
                  {selectedRack.outletTemp.toFixed(1)}°C
                </p>
              </div>
              <div>
                <span className="text-gray-400">当前功率</span>
                <p className="data-value text-lg text-white">{selectedRack.currentPower.toFixed(1)} kW</p>
              </div>
              <div>
                <span className="text-gray-400">负载率</span>
                <p className={`data-value text-lg ${
                  (selectedRack.currentPower / selectedRack.maxPower) > 0.8 ? 'text-dc-danger' : 
                  (selectedRack.currentPower / selectedRack.maxPower) > 0.6 ? 'text-dc-warning' : 'text-dc-success'
                }`}>
                  {((selectedRack.currentPower / selectedRack.maxPower) * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <span className="text-gray-400">已用槽位</span>
                <p className="data-value text-white">{selectedRack.usedSlots}/{selectedRack.totalSlots}</p>
              </div>
              <div>
                <span className="text-gray-400">状态</span>
                <p className="text-sm" style={{ color: getStatusColor(selectedRack.status) }}>
                  {selectedRack.status === 'normal' ? '正常' : 
                   selectedRack.status === 'warning' ? '警告' : 
                   selectedRack.status === 'critical' ? '严重' : '离线'}
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedAlert && (
          <div className="space-y-2 p-3 rounded-lg border" style={{ borderColor: getAlertLevelColor(selectedAlert.level) + '50', backgroundColor: getAlertLevelColor(selectedAlert.level) + '10' }}>
            <h3 className="font-semibold flex items-center gap-2" style={{ color: getAlertLevelColor(selectedAlert.level) }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: getAlertLevelColor(selectedAlert.level) }} />
              告警详情
            </h3>
            <p className="text-sm text-white">{selectedAlert.message}</p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>时间: {formatDateTime(selectedAlert.timestamp)}</p>
              <p>级别: {selectedAlert.level === 'critical' ? '严重' : selectedAlert.level === 'warning' ? '警告' : '信息'}</p>
              <p>状态: {selectedAlert.status === 'pending' ? '待处理' : selectedAlert.status === 'acknowledged' ? '已确认' : selectedAlert.status === 'auto-resolved' ? '自动修复' : '已解决'}</p>
              {selectedAlert.needsManualConfirm && (
                <p className="text-dc-warning">⚠️ 需要人工确认</p>
              )}
              {selectedAlert.correctionNote && (
                <p className="text-dc-accent">备注: {selectedAlert.correctionNote}</p>
              )}
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-white mb-2 flex items-center justify-between">
            <span>当前告警</span>
            <span className="text-xs px-2 py-0.5 rounded bg-dc-danger/20 text-dc-danger">
              {pendingAlerts.length} 条待处理
            </span>
          </h3>
          <div className="space-y-2">
            {pendingAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="p-2 rounded text-xs cursor-pointer transition-all hover:bg-white/5"
                style={{ borderLeft: `3px solid ${getAlertLevelColor(alert.level)}` }}
                onClick={() => setSelectedAlertId(alert.id)}
              >
                <p className="text-white truncate">{alert.message}</p>
                <p className="text-gray-400 mt-1">{formatRelativeTime(alert.timestamp)}</p>
              </div>
            ))}
          </div>
        </div>

        {dataQualityIssues.length > 0 && (
          <div>
            <h3 className="font-semibold text-white mb-2">数据质量提醒</h3>
            <div className="space-y-2">
              {dataQualityIssues.slice(0, 3).map((issue, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded text-xs bg-dc-warning/10 border border-dc-warning/30"
                >
                  <p className="text-dc-warning">
                    {issue.type === 'gap' ? '⚠️ 采样断点' : 
                     issue.type === 'lag' ? '⏱️ 数据滞后' :
                     issue.type === 'occlusion' ? '👁️ 热点遮挡' : '🔄 数据冲突'}
                  </p>
                  <p className="text-gray-300 mt-1">{issue.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-white mb-2">空调状态</h3>
          <div className="space-y-2">
            {acUnits.map((ac) => (
              <div key={ac.id} className="p-2 rounded bg-white/5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white">{ac.name}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(ac.status) }} />
                </div>
                <div className="flex gap-3 mt-1 text-gray-400">
                  <span>送风: {ac.supplyTemp}°C</span>
                  <span>回风: {ac.returnTemp}°C</span>
                </div>
                {ac.dataLagSeconds > 60 && (
                  <p className="text-dc-warning mt-1">数据滞后 {Math.floor(ac.dataLagSeconds / 60)} 分钟</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
