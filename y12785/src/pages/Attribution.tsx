import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Send, ArrowLeft, Beaker, Thermometer, Play } from 'lucide-react'
import { useAppStore } from '@/store'
import SafetyHint from '@/components/SafetyHint'
import type { SafetyHintItem } from '@/store'
import { fetchApi, fromSnakeData } from '@/lib/utils'

interface FragmentAttribution {
  id: string
  fragmentIon: string
  parentIon: string
  matchScore: number
  confidence: 'high' | 'medium' | 'low'
  safetyHint?: string
  sourceMaterial?: string
}

interface ConcentrationResult {
  sampleWeight: number
  weightUnit: string
  dilutionFactor: number
  concentration: number
  concentrationUnit: string
  significantDigits: number
  uncertainty: number
}

interface TemperatureRecord {
  timestamp: string
  temperature: number
  isControlPoint: boolean
}

const confidenceColorMap = {
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-coral-500',
}

const confidenceLabelMap = {
  high: '高',
  medium: '中',
  low: '低',
}

export default function Attribution() {
  const { batchId } = useParams<{ batchId: string }>()
  const navigate = useNavigate()
  const { addToast, updateBatch } = useAppStore()

  const [attributions, setAttributions] = useState<FragmentAttribution[]>([])
  const [concentration, setConcentration] = useState<ConcentrationResult | null>(null)
  const [temperatures, setTemperatures] = useState<TemperatureRecord[]>([])
  const [safetyHints, setSafetyHints] = useState<SafetyHintItem[]>([])

  const [sampleWeight, setSampleWeight] = useState('')
  const [dilutionFactor, setDilutionFactor] = useState('1')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!batchId) return

    fetchApi<any[]>(`/api/batches/${batchId}/attributions`)
      .then((res) => {
        const attrs = fromSnakeData<FragmentAttribution[]>(res)
        setAttributions(attrs)
        const hints: SafetyHintItem[] = attrs
          .filter((a) => a.safetyHint)
          .map((a, i) => ({
            id: `hint-${batchId}-${i}`,
            batchId,
            content: a.safetyHint!,
            sourceMaterial: a.sourceMaterial || '',
          }))
        setSafetyHints(hints)
      })
      .catch(() => {})

    fetchApi<any>(`/api/batches/${batchId}/concentration`)
      .then((res) => {
        const data = fromSnakeData<ConcentrationResult>(res)
        if (data && data.concentration !== undefined) {
          setConcentration(data)
          setSampleWeight(String(data.sampleWeight))
          setDilutionFactor(String(data.dilutionFactor))
        }
      })
      .catch(() => {})

    fetchApi<any[]>(`/api/batches/${batchId}/temperatures`)
      .then((res) => {
        setTemperatures(fromSnakeData<TemperatureRecord[]>(res))
      })
      .catch(() => {})
  }, [batchId])

  async function handleRunAttribution() {
    if (!batchId) return
    try {
      await fetch(`/api/batches/${batchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'analyzing', operator: 'material_engineer' }),
      }).catch(() => {})

      const res = await fetchApi<any[]>(`/api/batches/${batchId}/attributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const attrs = fromSnakeData<FragmentAttribution[]>(res)
      setAttributions(attrs)
      const hints: SafetyHintItem[] = attrs
        .filter((a) => a.safetyHint)
        .map((a, i) => ({
          id: `hint-${batchId}-${i}`,
          batchId,
          content: a.safetyHint!,
          sourceMaterial: a.sourceMaterial || '',
        }))
      setSafetyHints(hints)
      addToast({ type: 'success', message: '归因分析完成' })
      updateBatch(batchId, { status: 'analyzing' })
    } catch (e: any) {
      addToast({
        type: 'error',
        message: e.message || '归因分析失败',
        actionableHint: e.actionableHint,
      })
    }
  }

  async function handleCalculate() {
    if (!batchId) return
    try {
      const res = await fetch(`/api/batches/${batchId}/concentration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sample_weight: parseFloat(sampleWeight),
          dilution_factor: parseFloat(dilutionFactor),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        addToast({
          type: 'error',
          message: err.message || '浓度换算失败',
          actionableHint: err.actionableHint,
        })
        return
      }
      const body = await res.json()
      const data = fromSnakeData<ConcentrationResult>(body.data)
      setConcentration(data)
      addToast({ type: 'success', message: '浓度计算完成' })
    } catch {
      addToast({ type: 'error', message: '网络错误' })
    }
  }

  async function handleSubmitReview() {
    if (!batchId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/batches/${batchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending_review', operator: 'material_engineer' }),
      })
      if (!res.ok) {
        const err = await res.json()
        addToast({
          type: 'error',
          message: err.message || '提交复核失败',
          actionableHint: err.actionableHint,
        })
        return
      }
      updateBatch(batchId, { status: 'pending_review' })
      addToast({ type: 'success', message: '已提交复核' })
      navigate('/')
    } catch {
      addToast({ type: 'error', message: '网络错误' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddTemperatureSample() {
    if (!batchId) return
    const now = new Date()
    const samples = Array.from({ length: 12 }, (_, i) => {
      const t = new Date(now.getTime() + i * 10 * 60 * 1000)
      const isControl = i % 4 === 0
      return {
        timestamp: t.toISOString(),
        temperature: Number((25 + i * 1.5 + Math.sin(i) * 2).toFixed(1)),
        is_control_point: isControl ? 1 : 0,
      }
    })
    try {
      await fetch(`/api/batches/${batchId}/temperatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: samples }),
      })
      const res = await fetchApi<any[]>(`/api/batches/${batchId}/temperatures`)
      setTemperatures(fromSnakeData<TemperatureRecord[]>(res))
      addToast({ type: 'success', message: '已添加温度样例数据' })
    } catch (e: any) {
      addToast({ type: 'error', message: '添加温度数据失败' })
    }
  }

  const chartData = temperatures.map((t) => ({
    time: new Date(t.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    temperature: t.temperature,
    isControlPoint: t.isControlPoint,
  }))

  function formatSignificant(value: number, digits: number) {
    const str = value.toPrecision(digits)
    const dotIndex = str.indexOf('.')
    if (dotIndex === -1) return <span className="font-mono">{str}</span>
    const intPart = str.slice(0, dotIndex)
    const decPart = str.slice(dotIndex)
    return (
      <span className="font-mono">
        {intPart}
        <span className="underline decoration-2 decoration-amber-500">
          {decPart}
        </span>
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={18} className="text-indigo-900" />
        </button>
        <div>
          <h2 className="font-serif text-2xl font-semibold text-indigo-900">
            碎片归因分析
          </h2>
          <p className="text-sm text-cool-gray mt-0.5">
            批次 ID: {batchId}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Beaker size={16} className="text-indigo-900" />
                  <h3 className="font-serif text-base font-semibold text-indigo-900">
                    碎片归属
                  </h3>
                </div>
                <button
                  onClick={handleRunAttribution}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900 text-white text-xs rounded-md font-medium hover:bg-indigo-800 transition-colors"
                >
                  <Play size={12} />
                  运行归因分析
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-2.5 font-medium text-cool-gray">
                      碎片离子
                    </th>
                    <th className="px-4 py-2.5 font-medium text-cool-gray">
                      母离子
                    </th>
                    <th className="px-4 py-2.5 font-medium text-cool-gray">
                      匹配度
                    </th>
                    <th className="px-4 py-2.5 font-medium text-cool-gray">
                      置信度
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attributions.map((attr) => (
                    <tr
                      key={attr.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono text-indigo-900">
                        {attr.fragmentIon}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-indigo-900">
                        {attr.parentIon}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                attr.matchScore >= 0.8
                                  ? 'bg-emerald-500'
                                  : attr.matchScore >= 0.5
                                    ? 'bg-amber-500'
                                    : 'bg-coral-500'
                              }`}
                              style={{
                                width: `${attr.matchScore * 100}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono text-xs text-cool-gray">
                            {(attr.matchScore * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                            confidenceColorMap[attr.confidence]
                          }/10 text-${confidenceColorMap[attr.confidence].replace('bg-', '')}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${confidenceColorMap[attr.confidence]}`}
                          />
                          {confidenceLabelMap[attr.confidence]}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attributions.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-cool-gray"
                      >
                        暂无归因数据，请先执行归因分析
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Thermometer size={16} className="text-indigo-900" />
                <h3 className="font-serif text-base font-semibold text-indigo-900">
                  温度曲线
                </h3>
              </div>
              <button
                onClick={handleAddTemperatureSample}
                className="text-xs px-3 py-1.5 bg-indigo-900/10 text-indigo-900 rounded-md font-medium hover:bg-indigo-900/20 transition-colors"
              >
                添加样例数据
              </button>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    unit="°C"
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#1B2A4A"
                    strokeWidth={2}
                    dot={({ cx, cy, payload }) => {
                      if (payload.isControlPoint) {
                        return (
                          <circle
                            key={`dot-${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="#E8913A"
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        )
                      }
                      return (
                        <circle
                          key={`dot-${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill="#1B2A4A"
                          stroke="#fff"
                          strokeWidth={1.5}
                        />
                      )
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-cool-gray text-sm">
                暂无温度数据
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-serif text-base font-semibold text-indigo-900 mb-4">
              浓度换算
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-cool-gray mb-1">
                  样品称量 (mg)
                </label>
                <input
                  type="number"
                  value={sampleWeight}
                  onChange={(e) => setSampleWeight(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900"
                  step="0.001"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-cool-gray mb-1">
                  稀释倍数
                </label>
                <input
                  type="number"
                  value={dilutionFactor}
                  onChange={(e) => setDilutionFactor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900"
                  step="1"
                />
              </div>
              <button
                onClick={handleCalculate}
                className="w-full bg-indigo-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors"
              >
                计算浓度
              </button>
            </div>

            {concentration && (
              <div className="mt-4 p-4 bg-indigo-900/5 rounded-lg">
                <p className="text-xs text-cool-gray mb-2">计算结果</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-cool-gray">浓度</span>
                    <span className="text-lg">
                      {formatSignificant(
                        concentration.concentration,
                        concentration.significantDigits
                      )}
                      <span className="text-xs text-cool-gray ml-1">
                        {concentration.concentrationUnit}
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cool-gray">不确定度</span>
                    <span className="font-mono">
                      ±{concentration.uncertainty}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cool-gray">有效位数</span>
                    <span className="font-mono">
                      {concentration.significantDigits}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            <h3 className="font-serif text-base font-semibold text-indigo-900 mb-3">
              安全提示
            </h3>
            <SafetyHint hints={safetyHints} />
            {safetyHints.length === 0 && (
              <div className="text-sm text-cool-gray text-center py-4">
                暂无安全提示
              </div>
            )}
          </section>

          <button
            onClick={handleSubmitReview}
            disabled={submitting || attributions.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {submitting ? '提交中...' : '提交复核'}
          </button>
        </aside>
      </div>
    </div>
  )
}
