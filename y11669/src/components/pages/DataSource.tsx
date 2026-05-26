import { useDataStore } from '../../store/useDataStore'
import { formatDateTime } from '../../utils/timeUtils'
import { getStatusColor } from '../../utils/colorScale'

export function DataSource() {
  const { temperatureSamples, dataCorrections, dataQualityIssues, acUnits, racks } = useDataStore()

  const stats = {
    totalSamples: temperatureSamples.length,
    goodSamples: temperatureSamples.filter((s) => s.qualityFlag === 'good').length,
    missingSamples: temperatureSamples.filter((s) => s.qualityFlag === 'missing').length,
    totalCorrections: dataCorrections.length,
    dataSources: [...new Set(temperatureSamples.map((s) => s.dataSource))],
  }

  return (
    <div className="w-full h-full overflow-auto p-6 grid-bg">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">📊 数据来源追踪</h1>

        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="glass-panel p-4">
            <p className="text-gray-400 text-sm">采样点总数</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.totalSamples}</p>
          </div>
          <div className="glass-panel p-4 border-l-4 border-dc-success">
            <p className="text-gray-400 text-sm">质量良好</p>
            <p className="text-3xl font-bold text-dc-success mt-1">{stats.goodSamples}</p>
          </div>
          <div className="glass-panel p-4 border-l-4 border-dc-danger">
            <p className="text-gray-400 text-sm">数据缺失</p>
            <p className="text-3xl font-bold text-dc-danger mt-1">{stats.missingSamples}</p>
          </div>
          <div className="glass-panel p-4 border-l-4 border-dc-warning">
            <p className="text-gray-400 text-sm">修正记录</p>
            <p className="text-3xl font-bold text-dc-warning mt-1">{stats.totalCorrections}</p>
          </div>
          <div className="glass-panel p-4 border-l-4 border-dc-accent">
            <p className="text-gray-400 text-sm">数据来源</p>
            <p className="text-3xl font-bold text-dc-accent mt-1">{stats.dataSources.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="glass-panel p-4">
            <h3 className="text-lg font-semibold text-white mb-4">数据来源分布</h3>
            <div className="space-y-3">
              {stats.dataSources.map((source) => {
                const count = temperatureSamples.filter((s) => s.dataSource === source).length
                const percent = (count / stats.totalSamples) * 100
                return (
                  <div key={source}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{source}</span>
                      <span className="text-white font-mono">{count} ({percent.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-black/30 rounded overflow-hidden">
                      <div
                        className="h-full bg-dc-primary transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-lg font-semibold text-white mb-4">数据质量问题</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {dataQualityIssues.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无数据质量问题</p>
              ) : (
                dataQualityIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded text-sm"
                    style={{
                      backgroundColor:
                        issue.severity === 'critical'
                          ? 'rgba(244, 67, 54, 0.1)'
                          : issue.severity === 'warning'
                          ? 'rgba(255, 152, 0, 0.1)'
                          : 'rgba(33, 150, 243, 0.1)',
                      borderLeft: `3px solid ${
                        issue.severity === 'critical'
                          ? '#F44336'
                          : issue.severity === 'warning'
                          ? '#FF9800'
                          : '#2196F3'
                      }`,
                    }}
                  >
                    <p className="text-white">{issue.message}</p>
                    <p className="text-gray-400 text-xs mt-1">{formatDateTime(issue.timestamp)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">空调数据状态</h3>
          <div className="grid grid-cols-3 gap-4">
            {acUnits.map((ac) => (
              <div key={ac.id} className="p-4 bg-black/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-medium">{ac.name}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(ac.status) }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">送风温度</span>
                    <p className="text-dc-accent font-mono">{ac.supplyTemp}°C</p>
                  </div>
                  <div>
                    <span className="text-gray-400">回风温度</span>
                    <p className="text-white font-mono">{ac.returnTemp}°C</p>
                  </div>
                  <div>
                    <span className="text-gray-400">风机转速</span>
                    <p className="text-white font-mono">{ac.fanSpeed}%</p>
                  </div>
                  <div>
                    <span className="text-gray-400">运行状态</span>
                    <p className={ac.running ? 'text-dc-success' : 'text-dc-danger'}>
                      {ac.running ? '运行中' : '已停止'}
                    </p>
                  </div>
                </div>
                {ac.dataLagSeconds > 60 && (
                  <div className="mt-3 p-2 bg-dc-warning/10 rounded text-xs text-dc-warning">
                    ⚠️ 数据滞后 {Math.floor(ac.dataLagSeconds / 60)} 分钟
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">采样点状态</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/30">
                <tr>
                  <th className="text-left p-3 text-gray-400">采样点ID</th>
                  <th className="text-left p-3 text-gray-400">所属机柜</th>
                  <th className="text-left p-3 text-gray-400">数据来源</th>
                  <th className="text-left p-3 text-gray-400">进风温度</th>
                  <th className="text-left p-3 text-gray-400">出风温度</th>
                  <th className="text-left p-3 text-gray-400">采样时间</th>
                  <th className="text-left p-3 text-gray-400">质量状态</th>
                </tr>
              </thead>
              <tbody>
                {temperatureSamples.slice(0, 20).map((sample) => {
                  const rack = racks.find((r) => r.id === sample.rackId)
                  return (
                    <tr key={sample.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-3 text-gray-300 font-mono text-xs">{sample.id}</td>
                      <td className="p-3 text-white">{rack?.name || sample.rackId}</td>
                      <td className="p-3 text-dc-accent">{sample.dataSource}</td>
                      <td className="p-3 text-white font-mono">{sample.inletTemp.toFixed(1)}°C</td>
                      <td className="p-3 text-white font-mono">{sample.outletTemp.toFixed(1)}°C</td>
                      <td className="p-3 text-gray-400 font-mono text-xs">{formatDateTime(sample.timestamp)}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            sample.qualityFlag === 'good'
                              ? 'bg-dc-success/20 text-dc-success'
                              : sample.qualityFlag === 'missing'
                              ? 'bg-dc-danger/20 text-dc-danger'
                              : sample.qualityFlag === 'outlier'
                              ? 'bg-dc-warning/20 text-dc-warning'
                              : 'bg-dc-accent/20 text-dc-accent'
                          }`}
                        >
                          {sample.qualityFlag === 'good'
                            ? '正常'
                            : sample.qualityFlag === 'missing'
                            ? '缺失'
                            : sample.qualityFlag === 'outlier'
                            ? '异常值'
                            : '冲突'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="text-lg font-semibold text-white mb-4">数据修正历史</h3>
          {dataCorrections.length === 0 ? (
            <p className="text-gray-500">暂无修正记录</p>
          ) : (
            <div className="space-y-3">
              {dataCorrections.map((correction) => (
                <div key={correction.id} className="p-4 bg-black/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">采样点: {correction.sampleId}</span>
                    <span className="text-gray-400 text-sm">{correction.dataSource}</span>
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">原值:</span>
                      <span className="text-dc-danger font-mono line-through">{correction.originalValue.toFixed(1)}</span>
                    </div>
                    <span className="text-gray-500">→</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">修正值:</span>
                      <span className="text-dc-success font-mono">{correction.correctedValue.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm">原因: {correction.reason}</p>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>操作人: {correction.operator}</span>
                    <span>时间: {formatDateTime(correction.correctedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
