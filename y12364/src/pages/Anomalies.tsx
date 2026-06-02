import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useAnomalyStore, type Anomaly } from '@/stores/anomalyStore'
import AnomalyTypeBadge from '@/components/AnomalyTypeBadge'

const statusMap: Record<string, string> = {
  open: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
}

export default function Anomalies() {
  const navigate = useNavigate()
  const { anomalies, fetchAnomalies, updateAnomaly, resolveAnomaly, currentAnomaly, setCurrentAnomaly } = useAnomalyStore()
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modelNoFilter, setModelNoFilter] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [resolution, setResolution] = useState('')
  const [zeroCorrectionSpec, setZeroCorrectionSpec] = useState('')

  useEffect(() => {
    fetchAnomalies()
  }, [fetchAnomalies])

  const handleSearch = () => {
    fetchAnomalies({ type: typeFilter, status: statusFilter, modelNo: modelNoFilter })
  }

  const toggleGroup = (type: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  const grouped = anomalies.reduce<Record<string, Anomaly[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = []
    acc[a.type].push(a)
    return acc
  }, {})

  const handleMarkInProgress = async (anomaly: Anomaly) => {
    await updateAnomaly(anomaly.id, { status: 'in_progress' })
  }

  const handleResolve = async (anomaly: Anomaly) => {
    await updateAnomaly(anomaly.id, { resolution, zeroCorrectionSpec })
    await resolveAnomaly(anomaly.id)
    setResolution('')
    setZeroCorrectionSpec('')
  }

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 space-y-6 overflow-auto">
        <div className="flex items-center gap-3 flex-wrap bg-slate-800 rounded-lg p-4 border border-slate-700">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">全部类型</option>
            <option value="zero_drift">零点漂移</option>
            <option value="angle_exceed">迎角越界</option>
            <option value="speed_missing">速度缺采</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">全部状态</option>
            <option value="open">待处理</option>
            <option value="in_progress">处理中</option>
            <option value="resolved">已解决</option>
          </select>
          <input
            type="text"
            placeholder="模型编号"
            value={modelNoFilter}
            onChange={(e) => setModelNoFilter(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-40"
          />
          <button
            onClick={handleSearch}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-4 py-1.5 rounded-md text-sm transition-colors"
          >
            搜索
          </button>
        </div>

        {Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGroup(type)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700/50 transition-colors"
            >
              {collapsedGroups[type] ? <ChevronRight size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              <AnomalyTypeBadge type={type} />
              <span className="text-sm text-slate-400 ml-2">({items.length})</span>
            </button>
            {!collapsedGroups[type] && (
              <div className="divide-y divide-slate-700">
                {items.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    onClick={() => setCurrentAnomaly(anomaly)}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-700/30 transition-colors ${
                      currentAnomaly?.id === anomaly.id ? 'bg-slate-700/30 border-l-2 border-amber-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AnomalyTypeBadge type={anomaly.type} />
                      <span className="text-sm text-slate-300 flex-1">{anomaly.triggerSource}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                        {statusMap[anomaly.status] || anomaly.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      卡在: {anomaly.stuckStep} | 下一步: {anomaly.nextAction}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {anomalies.length === 0 && <div className="text-center text-slate-500 py-12">暂无异常记录</div>}
      </div>

      {currentAnomaly && (
        <div className="w-96 flex-shrink-0 bg-slate-800 border border-slate-700 rounded-lg p-5 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-100">异常详情</h2>
            <button onClick={() => setCurrentAnomaly(null)} className="text-slate-400 hover:text-slate-200">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AnomalyTypeBadge type={currentAnomaly.type} />
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {statusMap[currentAnomaly.status]}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="text-slate-400">触发来源:</span> <span className="text-slate-200">{currentAnomaly.triggerSource}</span></div>
              <div><span className="text-slate-400">卡点步骤:</span> <span className="text-slate-200">{currentAnomaly.stuckStep}</span></div>
              <div><span className="text-slate-400">下一步:</span> <span className="text-slate-200">{currentAnomaly.nextAction}</span></div>
              <div>
                <span className="text-slate-400">所属批次:</span>{' '}
                <button
                  onClick={() => navigate(`/batch/${currentAnomaly.batchId}`)}
                  className="text-amber-500 hover:underline"
                >
                  查看批次
                </button>
              </div>
            </div>
            {currentAnomaly.resolution && (
              <div className="text-sm">
                <span className="text-slate-400">处理说明:</span> <span className="text-slate-200">{currentAnomaly.resolution}</span>
              </div>
            )}
            {currentAnomaly.zeroCorrectionSpec && (
              <div className="text-sm">
                <span className="text-slate-400">零点修正规格:</span> <span className="text-amber-400">{currentAnomaly.zeroCorrectionSpec}</span>
              </div>
            )}
            {currentAnomaly.status !== 'resolved' && (
              <div className="space-y-3 pt-3 border-t border-slate-700">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">处理说明</label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">零点修正规格</label>
                  <textarea
                    value={zeroCorrectionSpec}
                    onChange={(e) => setZeroCorrectionSpec(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex gap-2">
                  {currentAnomaly.status === 'open' && (
                    <button
                      onClick={() => handleMarkInProgress(currentAnomaly)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-colors"
                    >
                      标记处理中
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(currentAnomaly)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors"
                  >
                    标记已解决
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
