import { useState } from 'react'
import { useDataStore } from '../../store/useDataStore'
import { formatDateTime } from '../../utils/timeUtils'
import { getAlertLevelColor } from '../../utils/colorScale'
import * as XLSX from 'xlsx'

export function Reports() {
  const { alerts, racks, acUnits, dataCorrections, dataQualityIssues } = useDataStore()
  const [timeRange, setTimeRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date(),
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const pendingAlerts = alerts.filter((a) => a.status === 'pending')
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved' || a.status === 'auto-resolved')
  const acknowledgedAlerts = alerts.filter((a) => a.status === 'acknowledged')
  const needsConfirmation = alerts.filter((a) => a.needsManualConfirm && a.status === 'auto-resolved')

  const avgTemp = racks.reduce((sum, r) => sum + r.outletTemp, 0) / racks.length
  const maxTemp = Math.max(...racks.map((r) => r.outletTemp))
  const avgLoad = racks.reduce((sum, r) => sum + (r.currentPower / r.maxPower) * 100, 0) / racks.length
  const totalPower = racks.reduce((sum, r) => sum + r.currentPower, 0)

  const generateExcelReport = () => {
    setIsGenerating(true)
    
    const wb = XLSX.utils.book_new()
    
    const summaryData = [
      ['3D机房温度流场监控报告'],
      [`生成时间: ${formatDateTime(new Date())}`],
      [`时间范围: ${formatDateTime(timeRange.start)} - ${formatDateTime(timeRange.end)}`],
      [],
      ['一、概览统计'],
      ['指标', '数值'],
      ['机柜总数', racks.length],
      ['空调总数', acUnits.length],
      ['告警总数', alerts.length],
      ['待处理告警', pendingAlerts.length],
      ['已处理告警', resolvedAlerts.length],
      ['需人工确认', needsConfirmation.length],
      ['数据修正次数', dataCorrections.length],
      ['数据质量问题', dataQualityIssues.length],
      [],
      ['二、环境指标'],
      ['指标', '数值'],
      ['平均出风温度', `${avgTemp.toFixed(1)}°C`],
      ['最高出风温度', `${maxTemp.toFixed(1)}°C`],
      ['平均负载率', `${avgLoad.toFixed(1)}%`],
      ['总功率消耗', `${totalPower.toFixed(1)} kW`],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, ws1, '概览')

    const pendingData = [
      ['三、未处理告警'],
      ['时间', '级别', '消息', '来源', '状态'],
      ...pendingAlerts.map((a) => [
        formatDateTime(a.timestamp),
        a.level === 'critical' ? '严重' : a.level === 'warning' ? '警告' : '信息',
        a.message,
        a.sourceType === 'rack' ? '机柜' : a.sourceType === 'ac' ? '空调' : a.sourceType === 'temperature' ? '温度' : '电源',
        a.status === 'pending' ? '待处理' : '已确认',
      ]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(pendingData)
    XLSX.utils.book_append_sheet(wb, ws2, '未处理告警')

    const resolvedData = [
      ['四、已修正告警'],
      ['时间', '级别', '消息', '来源', '状态', '备注'],
      ...resolvedAlerts.map((a) => [
        formatDateTime(a.timestamp),
        a.level === 'critical' ? '严重' : a.level === 'warning' ? '警告' : '信息',
        a.message,
        a.sourceType === 'rack' ? '机柜' : a.sourceType === 'ac' ? '空调' : a.sourceType === 'temperature' ? '温度' : '电源',
        a.status === 'auto-resolved' ? '自动修复' : '已解决',
        a.correctionNote || '',
      ]),
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(resolvedData)
    XLSX.utils.book_append_sheet(wb, ws3, '已修正告警')

    const confirmData = [
      ['五、需人工确认'],
      ['时间', '级别', '消息', '来源', '状态', '备注'],
      ...needsConfirmation.map((a) => [
        formatDateTime(a.timestamp),
        a.level === 'critical' ? '严重' : a.level === 'warning' ? '警告' : '信息',
        a.message,
        a.sourceType === 'rack' ? '机柜' : a.sourceType === 'ac' ? '空调' : a.sourceType === 'temperature' ? '温度' : '电源',
        a.status === 'auto-resolved' ? '自动修复' : '已解决',
        a.correctionNote || '',
      ]),
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(confirmData)
    XLSX.utils.book_append_sheet(wb, ws4, '需人工确认')

    const correctionsData = [
      ['六、数据修正记录'],
      ['采样点', '原值', '修正值', '原因', '操作人', '时间'],
      ...dataCorrections.map((c) => [
        c.sampleId,
        c.originalValue.toFixed(1),
        c.correctedValue.toFixed(1),
        c.reason,
        c.operator,
        formatDateTime(c.correctedAt),
      ]),
    ]
    const ws5 = XLSX.utils.aoa_to_sheet(correctionsData)
    XLSX.utils.book_append_sheet(wb, ws5, '修正记录')

    XLSX.writeFile(wb, `机房监控报告_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setIsGenerating(false)
  }

  return (
    <div className="w-full h-full overflow-auto p-6 grid-bg">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">📄 报告导出</h1>

        <div className="glass-panel p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">报告配置</h3>
          <div className="flex items-center gap-6 mb-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">开始时间</label>
              <input
                type="datetime-local"
                value={timeRange.start.toISOString().slice(0, 16)}
                onChange={(e) => setTimeRange({ ...timeRange, start: new Date(e.target.value) })}
                className="bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-dc-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">结束时间</label>
              <input
                type="datetime-local"
                value={timeRange.end.toISOString().slice(0, 16)}
                onChange={(e) => setTimeRange({ ...timeRange, end: new Date(e.target.value) })}
                className="bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-dc-primary focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={generateExcelReport}
                disabled={isGenerating}
                className="px-6 py-2 bg-dc-primary text-white rounded hover:bg-dc-primary/80 transition-colors disabled:opacity-50"
              >
                {isGenerating ? '生成中...' : '📥 导出Excel报告'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="glass-panel p-6 border-l-4 border-dc-danger">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dc-danger">未处理告警</h3>
              <span className="text-4xl font-bold text-dc-danger">{pendingAlerts.length}</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {pendingAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="p-2 bg-dc-danger/10 rounded text-sm">
                  <p className="text-white truncate">{alert.message}</p>
                  <p className="text-gray-400 text-xs mt-1">{formatDateTime(alert.timestamp)}</p>
                </div>
              ))}
              {pendingAlerts.length === 0 && (
                <p className="text-gray-500 text-sm">暂无未处理告警</p>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 border-l-4 border-dc-success">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dc-success">已修正告警</h3>
              <span className="text-4xl font-bold text-dc-success">{resolvedAlerts.length}</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {resolvedAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="p-2 bg-dc-success/10 rounded text-sm">
                  <p className="text-white truncate">{alert.message}</p>
                  <p className="text-gray-400 text-xs mt-1">{formatDateTime(alert.timestamp)}</p>
                </div>
              ))}
              {resolvedAlerts.length === 0 && (
                <p className="text-gray-500 text-sm">暂无已修正告警</p>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 border-l-4 border-dc-accent">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dc-accent">需人工确认</h3>
              <span className="text-4xl font-bold text-dc-accent">{needsConfirmation.length}</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {needsConfirmation.slice(0, 5).map((alert) => (
                <div key={alert.id} className="p-2 bg-dc-accent/10 rounded text-sm">
                  <p className="text-white truncate">{alert.message}</p>
                  <p className="text-gray-400 text-xs mt-1">{formatDateTime(alert.timestamp)}</p>
                </div>
              ))}
              {needsConfirmation.length === 0 && (
                <p className="text-gray-500 text-sm">暂无需人工确认项</p>
              )}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">环境指标概览</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-black/20 rounded-lg text-center">
              <p className="text-gray-400 text-sm mb-2">平均出风温度</p>
              <p className="text-3xl font-bold text-white">{avgTemp.toFixed(1)}°C</p>
            </div>
            <div className="p-4 bg-black/20 rounded-lg text-center">
              <p className="text-gray-400 text-sm mb-2">最高出风温度</p>
              <p className="text-3xl font-bold text-dc-danger">{maxTemp.toFixed(1)}°C</p>
            </div>
            <div className="p-4 bg-black/20 rounded-lg text-center">
              <p className="text-gray-400 text-sm mb-2">平均负载率</p>
              <p className="text-3xl font-bold text-white">{avgLoad.toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-black/20 rounded-lg text-center">
              <p className="text-gray-400 text-sm mb-2">总功率消耗</p>
              <p className="text-3xl font-bold text-dc-accent">{totalPower.toFixed(1)} kW</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">告警分布</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-black/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">严重告警</span>
                <span className="text-dc-danger font-bold">
                  {alerts.filter((a) => a.level === 'critical').length}
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded overflow-hidden">
                <div
                  className="h-full bg-dc-danger"
                  style={{
                    width: `${(alerts.filter((a) => a.level === 'critical').length / alerts.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="p-4 bg-black/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">警告</span>
                <span className="text-dc-warning font-bold">
                  {alerts.filter((a) => a.level === 'warning').length}
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded overflow-hidden">
                <div
                  className="h-full bg-dc-warning"
                  style={{
                    width: `${(alerts.filter((a) => a.level === 'warning').length / alerts.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="p-4 bg-black/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">信息</span>
                <span className="text-dc-primary font-bold">
                  {alerts.filter((a) => a.level === 'info').length}
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded overflow-hidden">
                <div
                  className="h-full bg-dc-primary"
                  style={{
                    width: `${(alerts.filter((a) => a.level === 'info').length / alerts.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-4">机柜温度分布</h3>
          <div className="grid grid-cols-6 gap-2">
            {racks.map((rack) => (
              <div
                key={rack.id}
                className="p-3 rounded-lg text-center"
                style={{
                  backgroundColor: getAlertLevelColor(
                    rack.outletTemp > 35 ? 'critical' : rack.outletTemp > 30 ? 'warning' : 'info'
                  ) + '20',
                  border: `1px solid ${getAlertLevelColor(
                    rack.outletTemp > 35 ? 'critical' : rack.outletTemp > 30 ? 'warning' : 'info'
                  )}30`,
                }}
              >
                <p className="text-xs text-gray-300">{rack.name}</p>
                <p
                  className="text-xl font-bold mt-1"
                  style={{
                    color: getAlertLevelColor(
                      rack.outletTemp > 35 ? 'critical' : rack.outletTemp > 30 ? 'warning' : 'info'
                    ),
                  }}
                >
                  {rack.outletTemp.toFixed(1)}°C
                </p>
                <p className="text-xs text-gray-400 mt-1">{(rack.currentPower / rack.maxPower * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
