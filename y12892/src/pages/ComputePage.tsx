import { useState } from 'react'
import {
  Play,
  RefreshCw,
  Waves,
  Wind,
  Compass,
  Thermometer,
  AlertTriangle,
  Clock,
  FileText,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export default function ComputePage() {
  const buoyData = useAppStore((s) => s.buoyData)
  const forecastData = useAppStore((s) => s.forecastData)
  const setBuoyData = useAppStore((s) => s.setBuoyData)
  const setForecastData = useAppStore((s) => s.setForecastData)
  const computeResult = useAppStore((s) => s.computeResult)
  const setComputeResult = useAppStore((s) => s.setComputeResult)
  const setCurrentBatchId = useAppStore((s) => s.setCurrentBatchId)
  const isComputing = useAppStore((s) => s.isComputing)
  const setIsComputing = useAppStore((s) => s.setIsComputing)
  const setProcessingRecords = useAppStore((s) => s.setProcessingRecords)
  const inspectionPhotos = useAppStore((s) => s.inspectionPhotos)
  const buoyOfflineEvents = useAppStore((s) => s.buoyOfflineEvents)

  const [showLateAlert, setShowLateAlert] = useState(true)

  const handleCompute = async () => {
    setIsComputing(true)
    try {
      const res = await fetch('/api/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buoyData,
          forecastData,
          inspectionPhotos,
          buoyOfflineEvents,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setComputeResult(data.data)
        setCurrentBatchId(data.data.batchId)
        setProcessingRecords([{
          id: data.data.processingRecordId,
          batchId: data.data.batchId,
          algorithm: 'JONSWAP谱参数化方法',
          inputSummary: buoyData,
          riskLevel: data.data.riskLevel,
          waterQualityAlert: data.data.waterQualityAlert,
          createdAt: data.data.timestamp,
        }])
      }
    } catch (err) {
      console.error('计算失败:', err)
      fallbackCompute()
    } finally {
      setIsComputing(false)
    }
  }

  const fallbackCompute = () => {
    const hs = buoyData.significantWaveHeight
    const tp = buoyData.peakPeriod
    const windSpeed = buoyData.windSpeed

    const windWaveRatio = Math.min(1, windSpeed / (hs * 10 + 1))
    const swellRatio = 1 - windWaveRatio
    const spectrumType = hs > 2.0 ? 'JONSWAP-风暴' : 'JONSWAP-常规'

    const hsExplanation = hs < 1.25
      ? `有效波高${hs}m，海况平静，低于1.25m阈值，属于低风险等级。`
      : hs <= 2.5
        ? `有效波高${hs}m，海况中等，处于1.25-2.5m区间，需关注海况变化。`
        : `有效波高${hs}m，海况恶劣，超过2.5m高浪阈值，航行和作业风险显著。`

    const tpExplanation = tp < 8
      ? `谱峰周期${tp}s，对应短周期海浪，风浪成分较多，海面较混乱。`
      : tp <= 12
        ? `谱峰周期${tp}s，属于中等周期海浪，涌浪与风浪共存。`
        : `谱峰周期${tp}s，为长周期涌浪，波形规则，传播距离远。`

    const dirExplanation = `主波向${buoyData.mainDirection}°，${
      buoyData.mainDirection >= 315 || buoyData.mainDirection < 45 ? '来自偏北方向' :
      buoyData.mainDirection >= 45 && buoyData.mainDirection < 135 ? '来自偏东方向' :
      buoyData.mainDirection >= 135 && buoyData.mainDirection < 225 ? '来自偏南方向' : '来自偏西方向'
    }，需结合风流场综合判断。`

    const windExplanation = `风速${windSpeed}m/s下风浪占比${(windWaveRatio * 100).toFixed(1)}%，风浪成分${windWaveRatio > 0.5 ? '主导' : '较弱'}。`
    const swellExplanation = `涌浪占比${(swellRatio * 100).toFixed(1)}%，谱峰周期${tp}s表明涌浪${swellRatio > 0.5 ? '为主要成分' : '贡献较小'}。`
    const spectrumExplanation = hs > 2.0
      ? `有效波高${hs}m超过2m阈值，海浪谱呈现风暴态JONSWAP谱特征，谱峰增强因子γ=3.3。`
      : `有效波高${hs}m在正常范围，海浪谱符合标准JONSWAP谱，谱峰增强因子γ=3.3。`

    const riskLevel = hs < 1.25 ? 'low' : hs <= 2.5 ? 'medium' : 'high'
    const waterQualityAlert = buoyData.waterTemp > 30 && hs > 1.5 ? 'warning'
      : buoyData.waterTemp > 28 || hs > 1.5 ? 'watch' : 'normal'

    const batchId = `batch_${Date.now()}`
    const result = {
      batchId,
      timestamp: new Date().toISOString(),
      parameters: {
        hs: { value: hs, unit: 'm', explanation: hsExplanation },
        tp: { value: tp, unit: 's', explanation: tpExplanation },
        spectrumType: { value: spectrumType, explanation: spectrumExplanation },
        windWaveRatio: { value: Number(windWaveRatio.toFixed(3)), explanation: windExplanation },
        swellRatio: { value: Number(swellRatio.toFixed(3)), explanation: swellExplanation },
        dominantDirection: { value: buoyData.mainDirection, unit: '°', explanation: dirExplanation },
      },
      riskLevel: riskLevel as 'low' | 'medium' | 'high',
      waterQualityAlert: waterQualityAlert as 'normal' | 'watch' | 'warning',
      processingRecordId: `proc_${Date.now()}`,
    }

    setComputeResult(result)
    setCurrentBatchId(batchId)
    setProcessingRecords([{
      id: result.processingRecordId,
      batchId,
      algorithm: 'JONSWAP谱参数化方法',
      inputSummary: buoyData,
      riskLevel,
      waterQualityAlert,
      createdAt: result.timestamp,
    }])
  }

  const getRiskBadgeClass = (level?: string) => {
    switch (level) {
      case 'high': return 'bg-coral-100 text-coral-700 border-coral-200'
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'low': return 'bg-tide-100 text-tide-700 border-tide-200'
      default: return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  const getRiskLabel = (level?: string) => {
    switch (level) {
      case 'high': return '高风险'
      case 'medium': return '中风险'
      case 'low': return '低风险'
      default: return '待评估'
    }
  }

  const getAlertLabel = (level?: string) => {
    switch (level) {
      case 'warning': return '水质预警'
      case 'watch': return '水质关注'
      case 'normal': return '水质正常'
      default: return '待评估'
    }
  }

  const paramCards = computeResult ? [
    {
      key: 'hs',
      label: '有效波高 Hs',
      value: computeResult.parameters.hs.value,
      unit: computeResult.parameters.hs.unit,
      explanation: computeResult.parameters.hs.explanation,
      icon: Waves,
      accent: 'from-tide-500 to-tide-600',
    },
    {
      key: 'tp',
      label: '谱峰周期 Tp',
      value: computeResult.parameters.tp.value,
      unit: computeResult.parameters.tp.unit,
      explanation: computeResult.parameters.tp.explanation,
      icon: Clock,
      accent: 'from-deep-500 to-deep-600',
    },
    {
      key: 'spectrum',
      label: '谱型分类',
      value: computeResult.parameters.spectrumType.value,
      unit: '',
      explanation: computeResult.parameters.spectrumType.explanation,
      icon: FileText,
      accent: 'from-purple-500 to-purple-600',
    },
    {
      key: 'wind',
      label: '风浪占比',
      value: `${(Number(computeResult.parameters.windWaveRatio.value) * 100).toFixed(1)}%`,
      unit: '',
      explanation: computeResult.parameters.windWaveRatio.explanation,
      icon: Wind,
      accent: 'from-sky-500 to-sky-600',
    },
    {
      key: 'swell',
      label: '涌浪占比',
      value: `${(Number(computeResult.parameters.swellRatio.value) * 100).toFixed(1)}%`,
      unit: '',
      explanation: computeResult.parameters.swellRatio.explanation,
      icon: Waves,
      accent: 'from-indigo-500 to-indigo-600',
    },
    {
      key: 'direction',
      label: '主波向',
      value: computeResult.parameters.dominantDirection.value,
      unit: computeResult.parameters.dominantDirection.unit,
      explanation: computeResult.parameters.dominantDirection.explanation,
      icon: Compass,
      accent: 'from-rose-500 to-rose-600',
    },
  ] : []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">海浪谱参数计算</h2>
          <p className="text-sm text-slate-500 mt-1">录入浮标观测数据，执行海浪谱参数计算</p>
        </div>
        <button
          onClick={handleCompute}
          disabled={isComputing}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition-all duration-200',
            isComputing
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-tide-500 to-tide-600 hover:shadow-glow hover:from-tide-400 hover:to-tide-500'
          )}
        >
          {isComputing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isComputing ? '计算中...' : '执行计算'}
        </button>
      </div>

      {forecastData?.isLate && showLateAlert && (
        <div className="bg-coral-50 border border-coral-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-coral-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-coral-800 font-medium text-sm">风浪预报晚到</div>
            <div className="text-coral-700 text-xs mt-1">
              本次风浪预报数据到达时间晚于预期，已标记为晚到记录。
              您可在<u className="mx-1 cursor-pointer">复核面板</u>中对该记录进行内联修正，无需重新导入。
            </div>
          </div>
          <button
            onClick={() => setShowLateAlert(false)}
            className="text-coral-500 hover:text-coral-700 text-xs"
          >
            知道了
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-tide-500 rounded-full"></div>
              浮标观测数据
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">有效波高 (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={buoyData.significantWaveHeight}
                  onChange={(e) => setBuoyData({ ...buoyData, significantWaveHeight: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tide-500/30 focus:border-tide-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">谱峰周期 (s)</label>
                <input
                  type="number"
                  step="0.1"
                  value={buoyData.peakPeriod}
                  onChange={(e) => setBuoyData({ ...buoyData, peakPeriod: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tide-500/30 focus:border-tide-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">主波向 (°)</label>
                <input
                  type="number"
                  value={buoyData.mainDirection}
                  onChange={(e) => setBuoyData({ ...buoyData, mainDirection: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tide-500/30 focus:border-tide-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">风速 (m/s)</label>
                <input
                  type="number"
                  step="0.1"
                  value={buoyData.windSpeed}
                  onChange={(e) => setBuoyData({ ...buoyData, windSpeed: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tide-500/30 focus:border-tide-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">风向 (°)</label>
                <input
                  type="number"
                  value={buoyData.windDirection}
                  onChange={(e) => setBuoyData({ ...buoyData, windDirection: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tide-500/30 focus:border-tide-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">
                  <Thermometer className="w-3 h-3 inline mr-1" />
                  水温 (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={buoyData.waterTemp}
                  onChange={(e) => setBuoyData({ ...buoyData, waterTemp: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tide-500/30 focus:border-tide-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {forecastData && (
            <div className={`bg-white rounded-xl border p-5 ${
              forecastData.isLate ? 'border-coral-300 bg-coral-50/30' : 'border-slate-200'
            }`}>
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className={`w-1 h-4 rounded-full ${
                    forecastData.isLate ? 'bg-coral-500' : 'bg-deep-500'
                  }`}></div>
                  风浪预报数据
                </span>
                {forecastData.isLate && (
                  <span className="text-xs text-coral-600 bg-coral-100 px-2 py-0.5 rounded-full font-medium">
                    晚到
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">预报波高 (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={forecastData.forecastWaveHeight}
                    onChange={(e) => setForecastData({ ...forecastData, forecastWaveHeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tide-500/30 focus:border-tide-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">预报周期 (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={forecastData.forecastPeriod}
                    onChange={(e) => setForecastData({ ...forecastData, forecastPeriod: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tide-500/30 focus:border-tide-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">预报波向 (°)</label>
                  <input
                    type="number"
                    value={forecastData.forecastDirection}
                    onChange={(e) => setForecastData({ ...forecastData, forecastDirection: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tide-500/30 focus:border-tide-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">到达时间</label>
                  <input
                    type="text"
                    value={forecastData.arrivalTime}
                    onChange={(e) => setForecastData({ ...forecastData, arrivalTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tide-500/30 focus:border-tide-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-7 space-y-5">
          {computeResult ? (
            <>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRiskBadgeClass(computeResult.riskLevel)}`}>
                  {getRiskLabel(computeResult.riskLevel)}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  computeResult.waterQualityAlert === 'warning' ? 'bg-coral-100 text-coral-700 border-coral-200' :
                  computeResult.waterQualityAlert === 'watch' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  'bg-tide-100 text-tide-700 border-tide-200'
                }`}>
                  {getAlertLabel(computeResult.waterQualityAlert)}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  批次：{computeResult.batchId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {paramCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <div
                      key={card.key}
                      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow duration-200 group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.accent} flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-slate-600">{card.label}</span>
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="text-2xl font-bold text-slate-800">
                          {card.value}
                        </span>
                        <span className="text-sm text-slate-400 ml-1">{card.unit}</span>
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                        {card.explanation}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">计算说明</h3>
                <div className="text-xs text-slate-500 leading-relaxed space-y-2">
                  <p>
                    本计算采用 <span className="text-slate-700 font-medium">JONSWAP 谱参数化方法</span>，
                    基于浮标实测的有效波高和谱峰周期，结合风速风向数据进行风浪-涌浪分离。
                  </p>
                  <p>
                    <span className="text-tide-600 font-medium">风险分层</span>与
                    <span className="text-tide-600 font-medium">水质预警</span>
                    共用同一批处理记录，计算结果已关联处理记录 ID：
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 ml-1">
                      {computeResult.processingRecordId}
                    </code>
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 h-96 flex flex-col items-center justify-center text-slate-400">
              <Waves className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm">点击「执行计算」查看海浪谱参数结果</p>
              <p className="text-xs mt-2 opacity-60">计算结果将附带自然语言解释</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
