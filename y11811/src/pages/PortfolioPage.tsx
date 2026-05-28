import { useState } from 'react'
import { Download, Plus, Trash2, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { usePortfolioStore } from '@/store/portfolioStore'
import { SAMPLE_PORTFOLIOS, INDUSTRIES } from '@/data/samples'
import StatusCard from '@/components/StatusCard'

function PortfolioPage() {
  const { portfolio, holdings, industries, loadSample, updateHolding, addHolding, removeHolding } =
    usePortfolioStore()

  const [selectedSample, setSelectedSample] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newHolding, setNewHolding] = useState({
    fundCode: '',
    fundName: '',
    weight: 10,
    industryId: INDUSTRIES[0].id,
    industryName: INDUSTRIES[0].name,
    isProhibited: false,
  })

  const totalWeight = holdings.reduce((sum, h) => sum + h.weight, 0)
  const weightStatus = Math.abs(totalWeight - 100) < 0.01 ? 'pass' : Math.abs(totalWeight - 100) < 5 ? 'warning' : 'fail'

  const industryData = industries.map((ind) => {
    const weight = holdings.filter((h) => h.industryId === ind.id).reduce((sum, h) => sum + h.weight, 0)
    return {
      name: ind.name,
      weight,
      maxWeight: ind.maxWeight,
      overLimit: weight > ind.maxWeight,
    }
  })

  const hasOverLimit = industryData.some((d) => d.overLimit)
  const hasProhibited = holdings.some((h) => h.isProhibited)

  const handleLoadSample = () => {
    if (selectedSample) {
      loadSample(selectedSample)
    }
  }

  const handleAddHolding = () => {
    if (newHolding.fundCode && newHolding.fundName) {
      addHolding(newHolding)
      setShowAddModal(false)
      setNewHolding({
        fundCode: '',
        fundName: '',
        weight: 10,
        industryId: INDUSTRIES[0].id,
        industryName: INDUSTRIES[0].name,
        isProhibited: false,
      })
    }
  }

  const handleWeightChange = (id: string, value: string) => {
    const weight = parseFloat(value) || 0
    updateHolding(id, { weight }, '调整权重')
  }

  const handleIndustryChange = (id: string, industryId: string) => {
    const industry = industries.find((i) => i.id === industryId)
    if (industry) {
      updateHolding(id, { industryId, industryName: industry.name }, '调整行业分类')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">{portfolio.name}</h2>
          <p className="text-neutral-muted mt-1">{portfolio.description}</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedSample}
            onChange={(e) => setSelectedSample(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">选择样例组合</option>
            {SAMPLE_PORTFOLIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleLoadSample}
            disabled={!selectedSample}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            导入样例
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatusCard
          title="权重检查"
          status={weightStatus}
          detail={`当前合计：${totalWeight.toFixed(2)}%`}
        >
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  weightStatus === 'pass' ? 'bg-accent-emerald' : weightStatus === 'warning' ? 'bg-accent-amber' : 'bg-accent-danger'
                }`}
                style={{ width: `${Math.min(totalWeight, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">{totalWeight.toFixed(1)}%</span>
          </div>
        </StatusCard>

        <StatusCard
          title="行业超限"
          status={hasOverLimit ? 'fail' : 'pass'}
          detail={hasOverLimit ? '发现超限行业' : '所有行业合规'}
        >
          <div className="text-sm">
            <span className="font-medium">{industryData.filter((d) => d.overLimit).length}</span> 个行业超限
          </div>
        </StatusCard>

        <StatusCard
          title="禁买标的"
          status={hasProhibited ? 'fail' : 'pass'}
          detail={hasProhibited ? '包含禁买基金' : '未发现禁买标的'}
        >
          <div className="text-sm">
            <span className="font-medium">{holdings.filter((h) => h.isProhibited).length}</span> 只禁买基金
          </div>
        </StatusCard>
      </div>

      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">基金持仓</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-accent-emerald text-white rounded-lg hover:bg-accent-emerald/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加基金
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-muted">基金代码</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-muted">基金名称</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-muted">权重(%)</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-muted">行业分类</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-muted">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-muted">操作</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding) => (
                <tr key={holding.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm">{holding.fundCode}</td>
                  <td className="py-3 px-4 font-medium">{holding.fundName}</td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      value={holding.weight}
                      onChange={(e) => handleWeightChange(holding.id, e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                      step="0.1"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={holding.industryId}
                      onChange={(e) => handleIndustryChange(holding.id, e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {industries.map((ind) => (
                        <option key={ind.id} value={ind.id}>
                          {ind.name} (限{ind.maxWeight}%)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    {holding.isProhibited ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-accent-danger/10 text-accent-danger rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        禁买
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-accent-emerald/10 text-accent-emerald rounded-full">
                        正常
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => removeHolding(holding.id, '手动删除')}
                      className="p-1 text-gray-400 hover:text-accent-danger transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {holdings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-muted">
                    暂无持仓数据，请导入样例或手动添加
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">行业分布</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={industryData} layout="vertical" margin={{ left: 20, right: 30 }}>
              <XAxis type="number" domain={[0, 'dataMax']} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '当前权重']} />
              <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                {industryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.overLimit ? '#E74C3C' : '#2ECC71'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent-emerald"></span>
            <span className="text-neutral-muted">合规行业</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent-danger"></span>
            <span className="text-neutral-muted">超限行业</span>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[480px] shadow-xl">
            <h3 className="text-lg font-semibold text-primary mb-4">添加基金</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-muted mb-1">基金代码</label>
                  <input
                    type="text"
                    value={newHolding.fundCode}
                    onChange={(e) => setNewHolding({ ...newHolding, fundCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="如 000001"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-muted mb-1">权重(%)</label>
                  <input
                    type="number"
                    value={newHolding.weight}
                    onChange={(e) => setNewHolding({ ...newHolding, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    step="0.1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-muted mb-1">基金名称</label>
                <input
                  type="text"
                  value={newHolding.fundName}
                  onChange={(e) => setNewHolding({ ...newHolding, fundName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="如 华夏成长混合"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-muted mb-1">行业分类</label>
                <select
                  value={newHolding.industryId}
                  onChange={(e) => {
                    const industry = industries.find((i) => i.id === e.target.value)
                    if (industry) {
                      setNewHolding({
                        ...newHolding,
                        industryId: industry.id,
                        industryName: industry.name,
                      })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.name} (限{ind.maxWeight}%)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isProhibited"
                  checked={newHolding.isProhibited}
                  onChange={(e) => setNewHolding({ ...newHolding, isProhibited: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isProhibited" className="text-sm text-neutral-muted">
                  标记为禁买标的
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddHolding}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PortfolioPage
