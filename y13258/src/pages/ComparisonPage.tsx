import { useState, Fragment } from 'react'
import { useStore } from '@/store/useStore'
import { FileText, MapPin, DollarSign, Clock, Shield, BarChart3, RotateCcw } from 'lucide-react'
import ReportModal from '@/components/ReportModal'

const safetyBadge: Record<string, string> = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-yellow-100 text-yellow-700',
  C: 'bg-red-100 text-red-700',
}

export default function ComparisonPage() {
  const { plans, filter, setFilter, resetFilter, getFilteredPlans, generateMarkdownReport } = useStore()
  const filtered = getFilteredPlans()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showReport, setShowReport] = useState(false)

  const avgCost = filtered.length ? filtered.reduce((s, p) => s + p.cost, 0) / filtered.length : 0
  const avgDist = filtered.length ? filtered.reduce((s, p) => s + p.distance, 0) / filtered.length : 0
  const avgCov = filtered.length ? filtered.reduce((s, p) => s + p.coverage, 0) / filtered.length : 0

  const toggleSafety = (level: string) => {
    const next = filter.safetyLevels.includes(level)
      ? filter.safetyLevels.filter((l) => l !== level)
      : [...filter.safetyLevels, level]
    setFilter({ safetyLevels: next })
  }

  return (
    <div className="flex gap-6 p-6 min-h-screen bg-gray-50">
      <aside className="w-72 shrink-0 sticky top-6 self-start">
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">筛选条件</h2>
            <span className="text-xs bg-[#0D7377]/10 text-[#0D7377] px-2 py-0.5 rounded-full font-medium">
              已筛选 {filtered.length}/{plans.length} 个方案
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <MapPin size={14} /> 距离范围 (km)
            </label>
            <div className="flex gap-2">
              <input
                type="number" min={0} max={20}
                value={filter.distanceRange[0]}
                onChange={(e) => setFilter({ distanceRange: [Number(e.target.value), filter.distanceRange[1]] })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/40"
              />
              <span className="text-gray-400 self-center">-</span>
              <input
                type="number" min={0} max={20}
                value={filter.distanceRange[1]}
                onChange={(e) => setFilter({ distanceRange: [filter.distanceRange[0], Number(e.target.value)] })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <DollarSign size={14} /> 费用范围 (元)
            </label>
            <div className="flex gap-2">
              <input
                type="number" min={0} max={3000}
                value={filter.costRange[0]}
                onChange={(e) => setFilter({ costRange: [Number(e.target.value), filter.costRange[1]] })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/40"
              />
              <span className="text-gray-400 self-center">-</span>
              <input
                type="number" min={0} max={3000}
                value={filter.costRange[1]}
                onChange={(e) => setFilter({ costRange: [filter.costRange[0], Number(e.target.value)] })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <Clock size={14} /> 时长范围 (分钟)
            </label>
            <div className="flex gap-2">
              <input
                type="number" min={0} max={60}
                value={filter.durationRange[0]}
                onChange={(e) => setFilter({ durationRange: [Number(e.target.value), filter.durationRange[1]] })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/40"
              />
              <span className="text-gray-400 self-center">-</span>
              <input
                type="number" min={0} max={60}
                value={filter.durationRange[1]}
                onChange={(e) => setFilter({ durationRange: [filter.durationRange[0], Number(e.target.value)] })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <Shield size={14} /> 安全等级
            </label>
            <div className="flex gap-2">
              {['A', 'B', 'C'].map((level) => (
                <button
                  key={level}
                  onClick={() => toggleSafety(level)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    filter.safetyLevels.includes(level)
                      ? 'bg-[#0D7377] text-white border-[#0D7377]'
                      : 'bg-white text-gray-500 border-gray-300 hover:border-[#0D7377]/50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <BarChart3 size={14} /> 最低覆盖率 (%)
            </label>
            <input
              type="number" min={0} max={100}
              value={filter.coverageMin}
              onChange={(e) => setFilter({ coverageMin: Number(e.target.value) })}
              className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/40"
            />
          </div>

          <button
            onClick={resetFilter}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#0D7377] text-[#0D7377] text-sm font-medium hover:bg-[#0D7377]/5 transition-colors"
          >
            <RotateCcw size={14} /> 重置筛选
          </button>
        </div>
      </aside>

      <main className="flex-1 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: <BarChart3 size={18} className="text-[#0D7377]" />, label: '入选方案数', value: filtered.length },
            { icon: <DollarSign size={18} className="text-[#0D7377]" />, label: '平均费用', value: `${avgCost.toFixed(0)} 元` },
            { icon: <MapPin size={18} className="text-[#0D7377]" />, label: '平均距离', value: `${avgDist.toFixed(1)} km` },
            { icon: <BarChart3 size={18} className="text-[#0D7377]" />, label: '平均覆盖率', value: `${avgCov.toFixed(1)}%` },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border-l-4 border-[#0D7377] p-4">
              <div className="flex items-center gap-2 mb-1">
                {card.icon}
                <span className="text-sm text-gray-500">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-teal-700">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-3 font-medium">方案名称</th>
                <th className="text-left px-4 py-3 font-medium">学校</th>
                <th className="text-left px-4 py-3 font-medium">距离(km)</th>
                <th className="text-left px-4 py-3 font-medium">费用(元)</th>
                <th className="text-left px-4 py-3 font-medium">时长(分钟)</th>
                <th className="text-left px-4 py-3 font-medium">安全等级</th>
                <th className="text-left px-4 py-3 font-medium">覆盖率(%)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((plan) => (
                <Fragment key={plan.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                    className="border-t cursor-pointer hover:bg-teal-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">{plan.name}</td>
                    <td className="px-4 py-3 text-gray-600">{plan.school}</td>
                    <td className="px-4 py-3">{plan.distance}</td>
                    <td className="px-4 py-3">{plan.cost}</td>
                    <td className="px-4 py-3">{plan.duration}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${safetyBadge[plan.safetyLevel]}`}>
                        {plan.safetyLevel}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-medium ${plan.coverage < 70 ? 'text-[#FF8C42]' : 'text-gray-700'}`}>
                      {plan.coverage}
                    </td>
                  </tr>
                  {expandedId === plan.id && (
                    <tr className="border-t bg-gray-50/60">
                      <td colSpan={7} className="px-4 py-3 text-gray-600 text-sm">
                        {plan.description}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    没有符合条件的方案
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <button
        onClick={() => setShowReport(true)}
        className="fixed bottom-8 right-8 bg-[#0D7377] hover:bg-[#0a5c5f] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        <FileText size={22} />
      </button>

      {showReport && (
        <ReportModal
          open={showReport}
          title="学校接送方案比选报告"
          markdown={generateMarkdownReport()}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
