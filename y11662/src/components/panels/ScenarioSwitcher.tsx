import { useState } from 'react'
import { Layers, Plus, Trash2, Edit2, Save, X } from 'lucide-react'
import { useScenarioStore } from '../../stores/scenarioStore'
import { useBondStore } from '../../stores/bondStore'

export function ScenarioSwitcher() {
  const scenarios = useScenarioStore((state) => state.scenarios)
  const activeScenarioId = useScenarioStore((state) => state.activeScenarioId)
  const setActiveScenario = useScenarioStore((state) => state.setActiveScenario)
  const addScenario = useScenarioStore((state) => state.addScenario)
  const updateScenario = useScenarioStore((state) => state.updateScenario)
  const deleteScenario = useScenarioStore((state) => state.deleteScenario)

  const cashFlows = useBondStore((state) => state.cashFlows)
  const holdings = useBondStore((state) => state.holdings)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editOffset, setEditOffset] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newOffset, setNewOffset] = useState(0)

  const handleAddScenario = () => {
    if (!newName.trim()) return

    const newScenario = {
      id: `scenario-${Date.now()}`,
      name: newName.trim(),
      rateOffset: newOffset,
      yieldCurve: generateYieldCurve(newOffset),
      description: `自定义情景: ${newName.trim()}, 利率偏移 ${newOffset}bp`,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addScenario(newScenario)
    setShowAddForm(false)
    setNewName('')
    setNewOffset(0)
  }

  const handleSaveEdit = (id: string) => {
    const scenario = scenarios.find((s) => s.id === id)
    if (scenario) {
      updateScenario(id, {
        rateOffset: editOffset,
        yieldCurve: generateYieldCurve(editOffset),
      })
    }
    setEditingId(null)
  }

  const getScenarioStats = (scenarioId: string) => {
    const flows = cashFlows.filter((cf) => cf.scenarioId === scenarioId)
    const totalAmount = flows.reduce((sum, cf) => sum + cf.amount, 0)
    const avgYield = holdings.length > 0
      ? holdings.reduce((sum, b) => sum + b.yieldRate, 0) / holdings.length
      : 0
    const avgDuration = holdings.length > 0
      ? holdings.reduce((sum, b) => sum + b.duration, 0) / holdings.length
      : 0

    return {
      flowCount: flows.length,
      totalAmount,
      avgYield: avgYield * 100,
      avgDuration,
    }
  }

  const currentStats = activeScenarioId ? getScenarioStats(activeScenarioId) : null

  return (
    <div className="flex items-center gap-4 h-14 px-4 bg-[#0d1117]/95 border-b border-[#21262d]">
      <div className="flex items-center gap-2">
        <Layers size={16} className="text-[#58a6ff]" />
        <span className="text-sm text-[#8b949e]">利率情景:</span>
      </div>

      <div className="flex-1 flex items-center gap-2 overflow-x-auto">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded text-xs cursor-pointer
              transition-all duration-200 whitespace-nowrap
              ${scenario.id === activeScenarioId
                ? 'bg-[#1f6feb] text-white'
                : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]'
              }
            `}
            onClick={() => setActiveScenario(scenario.id)}
          >
            <span className="font-medium">{scenario.name}</span>
            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
              scenario.rateOffset > 0
                ? 'bg-[#f85149]/20 text-[#f85149]'
                : scenario.rateOffset < 0
                ? 'bg-[#00d4aa]/20 text-[#00d4aa]'
                : 'bg-[#6e7681]/20 text-[#6e7681]'
            }`}>
              {scenario.rateOffset > 0 ? '+' : ''}{scenario.rateOffset}bp
            </span>

            {editingId === scenario.id ? (
              <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  step="10"
                  value={editOffset}
                  onChange={(e) => setEditOffset(parseInt(e.target.value))}
                  className="w-16 h-1 accent-[#58a6ff]"
                />
                <button
                  onClick={() => handleSaveEdit(scenario.id)}
                  className="p-0.5 hover:text-[#00d4aa]"
                >
                  <Save size={12} />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-0.5 hover:text-[#f85149]"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 ml-2 opacity-60 hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingId(scenario.id)
                    setEditOffset(scenario.rateOffset)
                  }}
                  className="p-0.5 hover:text-[#58a6ff]"
                >
                  <Edit2 size={10} />
                </button>
                {scenario.id !== 'scenario-base' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteScenario(scenario.id)
                    }}
                    className="p-0.5 hover:text-[#f85149]"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-xs
              bg-[#21262d] text-[#6e7681] hover:bg-[#30363d] hover:text-[#c9d1d9]
              transition-all duration-200"
          >
            <Plus size={12} />
            添加
          </button>
        )}

        {showAddForm && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#21262d]">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="情景名称"
              className="bg-transparent text-xs text-[#c9d1d9] placeholder:text-[#6e7681]
                focus:outline-none w-24"
              autoFocus
            />
            <input
              type="number"
              value={newOffset}
              onChange={(e) => setNewOffset(parseInt(e.target.value))}
              placeholder="bp"
              className="w-16 bg-transparent text-xs text-[#c9d1d9] placeholder:text-[#6e7681]
                focus:outline-none"
            />
            <button
              onClick={handleAddScenario}
              className="p-0.5 text-[#00d4aa] hover:text-[#00d4aa]/80"
            >
              <Save size={12} />
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-0.5 text-[#6e7681] hover:text-[#f85149]"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {currentStats && (
        <div className="flex items-center gap-4 text-xs border-l border-[#21262d] pl-4">
          <div className="flex items-center gap-1">
            <span className="text-[#6e7681]">现金流:</span>
            <span className="text-[#c9d1d9] font-mono">{currentStats.flowCount}条</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#6e7681]">合计:</span>
            <span className="text-[#00d4aa] font-mono">
              {(currentStats.totalAmount / 100000000).toFixed(2)}亿
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#6e7681]">均收益:</span>
            <span className="text-[#f59e0b] font-mono">{currentStats.avgYield.toFixed(2)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#6e7681]">均久期:</span>
            <span className="text-[#8957e5] font-mono">{currentStats.avgDuration.toFixed(2)}年</span>
          </div>
        </div>
      )}
    </div>
  )
}

function generateYieldCurve(offset: number): number[] {
  const baseCurve = [0.021, 0.0225, 0.024, 0.0255, 0.027, 0.0285, 0.0295, 0.0305, 0.0315, 0.0325]
  return baseCurve.map((r) => r + offset / 10000)
}