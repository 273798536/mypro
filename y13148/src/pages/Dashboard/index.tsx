import { useState, useMemo, useEffect } from 'react'
import {
  BarChart3,
  Target,
  Activity,
  Percent,
  Settings2,
  Ruler,
  Play,
  RotateCcw,
  Filter,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import MetricCard from '@/components/ui/MetricCard'
import Badge from '@/components/ui/Badge'
import MonteCarloChart from '@/components/charts/MonteCarloChart'
import { useRecordStore } from '@/store/useRecordStore'
import { useFilterStore } from '@/store/useFilterStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { runMonteCarloSimulation } from '@/utils/monteCarlo'
import { formatNumber, formatPercent } from '@/utils/format'
import { unitConfigs } from '@/data/unitConfigs'
import type { MonteCarloResult } from '@/types'

export default function Dashboard() {
  const { records } = useRecordStore()
  const { params, setUnit, setConfidenceLevel, setSimulationCount, resetFilters, toggleSourceType } = useFilterStore()
  const { addHistory } = useHistoryStore()

  const [isSimulating, setIsSimulating] = useState(false)
  const [result, setResult] = useState<MonteCarloResult | null>(null)

  const filteredRecords = useMemo(() => {
    return records.filter((r) => params.sourceTypes.includes(r.source))
  }, [records, params.sourceTypes])

  const allUnits = useMemo(() => {
    return unitConfigs.flatMap((cat) =>
      cat.units.map((u) => ({
        value: u.symbol,
        label: `${u.name} (${u.symbol})`,
      }))
    )
  }, [])

  const handleSimulate = () => {
    setIsSimulating(true)
    
    setTimeout(() => {
      const simResult = runMonteCarloSimulation(
        filteredRecords,
        params.simulationCount,
        params.unit,
        params.confidenceLevel
      )
      setResult(simResult)
      addHistory(params, simResult, filteredRecords.length)
      setIsSimulating(false)
    }, 500)
  }

  useEffect(() => {
    if (filteredRecords.length > 0) {
      const simResult = runMonteCarloSimulation(
        filteredRecords,
        params.simulationCount,
        params.unit,
        params.confidenceLevel
      )
      setResult(simResult)
    }
  }, [])

  useEffect(() => {
    if (result && filteredRecords.length > 0) {
      const simResult = runMonteCarloSimulation(
        filteredRecords,
        params.simulationCount,
        params.unit,
        params.confidenceLevel
      )
      setResult(simResult)
    }
  }, [params.unit, params.confidenceLevel, params.simulationCount, filteredRecords.length])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-serif">蒙特卡洛误差分析</h1>
          <p className="text-gray-500 mt-1 text-sm">基于输入数据的蒙特卡洛随机模拟误差分布</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">当前单位：{params.unit}</Badge>
          <Badge variant="success">记录数：{filteredRecords.length}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <MetricCard
          title="均值"
          value={result ? formatNumber(result.mean) : '--'}
          unit={params.unit}
          icon={<Target size={18} />}
          highlight
          description="蒙特卡洛模拟结果均值"
        />
        <MetricCard
          title="标准差"
          value={result ? formatNumber(result.stdDev) : '--'}
          unit={params.unit}
          icon={<Activity size={18} />}
          description="结果离散程度"
        />
        <MetricCard
          title="相对误差"
          value={result ? formatPercent(result.relativeError, 2) : '--'}
          icon={<Percent size={18} />}
          description="标准差 / 均值"
        />
        <MetricCard
          title="置信区间"
          value={result ? `[${formatNumber(result.confidenceInterval.lower)}, ${formatNumber(result.confidenceInterval.upper)}]` : '--'}
          unit={params.unit}
          icon={<BarChart3 size={18} />}
          description={`${(params.confidenceLevel * 100).toFixed(0)}% 置信水平`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card
            title="误差分布直方图"
            subtitle="展示蒙特卡洛模拟结果的频率分布与正态拟合曲线"
            icon={<BarChart3 size={20} />}
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Play size={16} />}
                onClick={handleSimulate}
                loading={isSimulating}
              >
                重新模拟
              </Button>
            }
          >
            <MonteCarloChart result={result || { samples: [], mean: 0, stdDev: 0, variance: 0, confidenceInterval: { lower: 0, upper: 0, level: 0.95 }, histogram: { bins: [], counts: [] }, relativeError: 0 }} unit={params.unit} height={360} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="控制面板"
            icon={<Settings2 size={20} />}
          >
            <div className="space-y-4">
              <Select
                label="显示单位"
                icon={<Ruler size={14} />}
                options={allUnits}
                value={params.unit}
                onChange={(e) => setUnit(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Target size={14} />
                  置信水平：{(params.confidenceLevel * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.8"
                  max="0.99"
                  step="0.01"
                  value={params.confidenceLevel}
                  onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>80%</span>
                  <span>95%</span>
                  <span>99%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Activity size={14} />
                  模拟次数：{params.simulationCount.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="1000"
                  max="100000"
                  step="1000"
                  value={params.simulationCount}
                  onChange={(e) => setSimulationCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1K</span>
                  <span>10K</span>
                  <span>100K</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Filter size={14} />
                  数据来源筛选
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'normal', label: '正常记录' },
                    { key: 'draft', label: '计算草稿' },
                    { key: 'verbal', label: '口头备注' },
                  ].map((src) => (
                    <button
                      key={src.key}
                      onClick={() => toggleSourceType(src.key as any)}
                      className={`px-3 py-1 text-xs rounded-full border transition-all ${
                        params.sourceTypes.includes(src.key as any)
                          ? 'bg-primary-100 text-primary-700 border-primary-300'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={resetFilters}
                className="w-full"
              >
                重置为默认
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
