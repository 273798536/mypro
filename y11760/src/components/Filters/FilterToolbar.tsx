import { Filter, Search, RotateCcw } from 'lucide-react'
import { useGraphStore } from '../../stores/graphStore'
import { enterprises, guaranteeContracts } from '../../data/mockData'
import type { RiskSeverity, GuaranteeType } from '../../types'

const allIndustries = [...new Set(enterprises.map((e) => e.industry))]
const allGuaranteeTypes: GuaranteeType[] = ['一般保证', '连带责任', '抵押担保', '质押担保']

export function FilterToolbar() {
  const { filters, setFilters, resetFilters } = useGraphStore()

  const toggleRiskLevel = (level: RiskSeverity) => {
    const newLevels = filters.riskLevels.includes(level)
      ? filters.riskLevels.filter((l) => l !== level)
      : [...filters.riskLevels, level]
    setFilters({ riskLevels: newLevels })
  }

  const toggleIndustry = (industry: string) => {
    const newIndustries = filters.industries.includes(industry)
      ? filters.industries.filter((i) => i !== industry)
      : [...filters.industries, industry]
    setFilters({ industries: newIndustries })
  }

  const toggleGuaranteeType = (type: GuaranteeType) => {
    const newTypes = filters.guaranteeTypes.includes(type)
      ? filters.guaranteeTypes.filter((t) => t !== type)
      : [...filters.guaranteeTypes, type]
    setFilters({ guaranteeTypes: newTypes })
  }

  const hasActiveFilters =
    filters.riskLevels.length < 3 ||
    filters.industries.length > 0 ||
    filters.guaranteeTypes.length > 0 ||
    filters.searchQuery

  return (
    <div className="w-64 bg-[#0f0f1f] border-r border-gray-800 h-full flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Filter size={16} />
            <span className="font-medium">筛选工具</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw size={12} />
              重置
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1">
            <Search size={12} />
            搜索
          </label>
          <input
            type="text"
            placeholder="输入企业/人名..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-2 block">风险等级</label>
          <div className="space-y-1">
            {(['high', 'medium', 'low'] as const).map((level) => (
              <button
                key={level}
                onClick={() => toggleRiskLevel(level)}
                className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                  filters.riskLevels.includes(level)
                    ? level === 'high'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : level === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-[#1a1a2e] text-gray-400 border border-transparent hover:border-gray-600'
                }`}
              >
                {level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-2 block">企业行业</label>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {allIndustries.map((industry) => (
              <button
                key={industry}
                onClick={() => toggleIndustry(industry)}
                className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                  filters.industries.includes(industry)
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-[#1a1a2e] text-gray-400 border border-transparent hover:border-gray-600'
                }`}
              >
                {industry}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-2 block">担保类型</label>
          <div className="space-y-1">
            {allGuaranteeTypes.map((type) => (
              <button
                key={type}
                onClick={() => toggleGuaranteeType(type)}
                className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                  filters.guaranteeTypes.includes(type)
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-[#1a1a2e] text-gray-400 border border-transparent hover:border-gray-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
        <div>
          节点总数：{useGraphStore.getState().nodes.length}（可见：
          {useGraphStore.getState().visibleNodeIds.size}）
        </div>
        <div>
          担保合同：{useGraphStore.getState().edges.length}（可见：
          {useGraphStore.getState().visibleEdgeIds.size}）
        </div>
      </div>
    </div>
  )
}
