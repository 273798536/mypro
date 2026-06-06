import { useMemo } from 'react'
import { useApp } from '../store/AppContext'
import { OPERATION_TYPE_LABELS, UNIT_LABELS, ANOMALY_TYPE_LABELS } from '../types'
import { exportAsText, exportAsJSON } from '../engine/exportEngine'

function formatDate(d: Date): string {
  if (typeof d === 'string') d = new Date(d)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function SettlementPage() {
  const { state } = useApp()
  const { currentProfile, operationHistory } = state

  const stats = useMemo(() => {
    if (!currentProfile) return null
    const resolved = currentProfile.anomalies.filter(a => a.status === 'resolved').length
    const ignored = currentProfile.anomalies.filter(a => a.status === 'ignored').length
    const pending = currentProfile.anomalies.filter(a => a.status === 'pending').length
    const total = currentProfile.anomalies.length
    const completionRate = total === 0 ? 100 : Math.round(((resolved + ignored) / total) * 100)

    const typeStats = currentProfile.anomalies.reduce((acc, a) => {
      const label = ANOMALY_TYPE_LABELS[a.type]
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      layerCount: currentProfile.layers.length,
      boundaryCount: currentProfile.boundaries.length,
      total,
      resolved,
      ignored,
      pending,
      completionRate,
      typeStats
    }
  }, [currentProfile])

  if (!currentProfile) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-6">
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            📋
          </div>
          <h2 className="text-xl font-bold text-stratum-dark mb-2">暂无剖面数据</h2>
          <p className="text-stratum-mid">请先加载或创建一个岩层剖面后再查看结算页面</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stratum-dark">复盘结算</h1>
          <p className="text-sm text-stratum-mid mt-1">
            {currentProfile.name} · 更新于 {formatDate(currentProfile.updatedAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-stratum-mid mb-1">岩层数</div>
          <div className="text-3xl font-bold text-stratum-dark">{stats?.layerCount}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-stratum-mid mb-1">边界数</div>
          <div className="text-3xl font-bold text-stratum-dark">{stats?.boundaryCount}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-stratum-mid mb-1">异常总数</div>
          <div className="text-3xl font-bold text-stratum-dark mb-2">{stats?.total}</div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">
              待处理 {stats?.pending}
            </span>
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">
              已处理 {stats?.resolved}
            </span>
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
              已忽略 {stats?.ignored}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-stratum-mid mb-1">完成度</div>
          <div className="text-3xl font-bold text-stratum-success mb-2">{stats?.completionRate}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-stratum-success h-2 rounded-full transition-all"
              style={{ width: `${stats?.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-stratum-dark mb-4 flex items-center gap-2">
          <span>📊</span> 异常类型分布
        </h2>
        {Object.keys(stats!.typeStats).length === 0 ? (
          <p className="text-stratum-mid text-sm">暂无异常</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(stats!.typeStats).map(([typeName, count]) => (
              <div key={typeName} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-stratum-mid mb-1">{typeName}</div>
                <div className="text-2xl font-bold text-stratum-dark">{count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-bold text-stratum-dark flex items-center gap-2">
            <span>🪨</span> 岩层明细表
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-stratum-mid">序号</th>
                <th className="px-4 py-3 text-left font-medium text-stratum-mid">名称</th>
                <th className="px-4 py-3 text-left font-medium text-stratum-mid">顶深</th>
                <th className="px-4 py-3 text-left font-medium text-stratum-mid">底深</th>
                <th className="px-4 py-3 text-left font-medium text-stratum-mid">厚度</th>
                <th className="px-4 py-3 text-left font-medium text-stratum-mid">单位</th>
                <th className="px-4 py-3 text-left font-medium text-stratum-mid">来源</th>
                <th className="px-4 py-3 text-left font-medium text-stratum-mid">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentProfile.layers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stratum-mid">
                    暂无岩层数据
                  </td>
                </tr>
              ) : (
                currentProfile.layers.map((layer, idx) => (
                  <tr key={layer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-stratum-mid">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: layer.color }}
                        />
                        <span className="font-medium text-stratum-dark">{layer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stratum-dark">{layer.depth.top}</td>
                    <td className="px-4 py-3 text-stratum-dark">{layer.depth.bottom}</td>
                    <td className="px-4 py-3 text-stratum-dark">{layer.thickness.toFixed(2)}</td>
                    <td className="px-4 py-3 text-stratum-mid">{UNIT_LABELS[layer.unit]}</td>
                    <td className="px-4 py-3 text-stratum-mid">{layer.source || '-'}</td>
                    <td className="px-4 py-3 text-stratum-mid">{layer.remarks || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-bold text-stratum-dark flex items-center gap-2">
            <span>📝</span> 操作记录
          </h2>
          <p className="text-xs text-stratum-mid mt-1">
            提示：撤销重做与导出共用此批记录
          </p>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {operationHistory.length === 0 ? (
            <div className="px-6 py-8 text-center text-stratum-mid text-sm">
              暂无操作记录
            </div>
          ) : (
            [...operationHistory].reverse().map(op => (
              <div key={op.id} className="px-6 py-3 flex items-start gap-3 hover:bg-gray-50">
                <span className="text-xs px-2 py-0.5 rounded bg-stratum-bg text-stratum-mid shrink-0 mt-0.5">
                  {OPERATION_TYPE_LABELS[op.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-stratum-dark">{op.description}</div>
                  <div className="text-xs text-stratum-mid mt-0.5">
                    {formatDate(op.timestamp)}
                    {op.operator && ` · ${op.operator}`}
                  </div>
                </div>
                {op.reversible && (
                  <span className="text-xs text-stratum-success shrink-0">可撤销</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-stratum-dark mb-4 flex items-center gap-2">
          <span>💾</span> 导出报告
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => exportAsText(currentProfile, operationHistory)}
            className="px-5 py-2.5 bg-stratum-dark text-white rounded-lg hover:bg-stratum-mid transition-colors flex items-center gap-2"
          >
            <span>📄</span> 导出文本报告
          </button>
          <button
            onClick={() => exportAsJSON(currentProfile, operationHistory)}
            className="px-5 py-2.5 border border-gray-300 text-stratum-dark rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span>{'{}'}</span> 导出JSON数据
          </button>
        </div>
        <p className="text-xs text-stratum-mid mt-4">
          文本报告适合打印归档，JSON数据适合程序二次处理。两种导出均包含上述异常、岩层明细与操作记录。
        </p>
      </div>
    </div>
  )
}
