import { useState, useEffect } from 'react'
import {
  FileCheck2,
  Camera,
  WifiOff,
  AlertTriangle,
  Edit3,
  Check,
  MessageSquare,
  Anchor,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export default function ReviewPage() {
  const currentBatchId = useAppStore((s) => s.currentBatchId)
  const setCorrections = useAppStore((s) => s.setCorrections)
  const setOpinions = useAppStore((s) => s.setOpinions)
  const setBuoyData = useAppStore((s) => s.setBuoyData)
  const setForecastData = useAppStore((s) => s.setForecastData)
  const setInspectionPhotos = useAppStore((s) => s.setInspectionPhotos)
  const setBuoyOfflineEvents = useAppStore((s) => s.setBuoyOfflineEvents)

  const buoyData = useAppStore((s) => s.buoyData)
  const forecastData = useAppStore((s) => s.forecastData)
  const inspectionPhotos = useAppStore((s) => s.inspectionPhotos)
  const buoyOfflineEvents = useAppStore((s) => s.buoyOfflineEvents)
  const corrections = useAppStore((s) => s.corrections)
  const opinions = useAppStore((s) => s.opinions)

  const [loading, setLoading] = useState(false)
  const [savingCorrection, setSavingCorrection] = useState(false)
  const [savingOpinion, setSavingOpinion] = useState(false)

  const [editingForecast, setEditingForecast] = useState(false)
  const [correctedWaveHeight, setCorrectedWaveHeight] = useState(forecastData?.forecastWaveHeight || 0)
  const [correctedPeriod, setCorrectedPeriod] = useState(forecastData?.forecastPeriod || 0)
  const [correctedDirection, setCorrectedDirection] = useState(forecastData?.forecastDirection || 0)
  const [correctionReason, setCorrectionReason] = useState('')

  const [opinionText, setOpinionText] = useState('')
  const [submittedBy, setSubmittedBy] = useState('海洋监测员')

  const [buoyVerified, setBuoyVerified] = useState(false)
  const [photosVerified, setPhotosVerified] = useState(false)
  const [offlineVerified, setOfflineVerified] = useState(false)

  const shipTrajectory = [
    { lat: 31.2304, lng: 121.4737, timestamp: '2026-06-16T08:00:00Z', label: '出发港' },
    { lat: 31.5, lng: 122.0, timestamp: '2026-06-16T09:30:00Z', label: 'A点' },
    { lat: 31.8, lng: 122.5, timestamp: '2026-06-16T11:00:00Z', label: '浮标站位' },
    { lat: 32.0, lng: 123.0, timestamp: '2026-06-16T12:30:00Z', label: '作业区' },
  ]

  useEffect(() => {
    if (currentBatchId) {
      loadReviewData()
    }
  }, [currentBatchId])

  const loadReviewData = async () => {
    if (!currentBatchId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/review/${currentBatchId}`)
      const data = await res.json()
      if (data.success) {
        const d = data.data
        if (d.buoyData) setBuoyData(d.buoyData)
        if (d.lateForecast) {
          setForecastData({
            forecastWaveHeight: d.lateForecast.forecastWaveHeight,
            forecastPeriod: d.lateForecast.forecastPeriod,
            forecastDirection: d.lateForecast.forecastDirection,
            arrivalTime: d.lateForecast.arrivalTime,
            isLate: d.lateForecast.isLate,
          })
        }
        if (d.inspectionPhotos) setInspectionPhotos(d.inspectionPhotos)
        if (d.buoyOfflineEvents) setBuoyOfflineEvents(d.buoyOfflineEvents)
        if (d.existingCorrections) setCorrections(d.existingCorrections)
        if (d.existingOpinions) setOpinions(d.existingOpinions)
      }
    } catch (err) {
      console.error('加载复核数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCorrection = async () => {
    if (!currentBatchId || !correctionReason.trim()) return
    setSavingCorrection(true)
    try {
      const res = await fetch(`/api/review/${currentBatchId}/correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctedForecast: {
            forecastWaveHeight: correctedWaveHeight,
            forecastPeriod: correctedPeriod,
            forecastDirection: correctedDirection,
          },
          reason: correctionReason,
          correctedBy: submittedBy,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const newCorrection = {
          ...data.data,
          originalValue: JSON.stringify({
            waveHeight: forecastData?.forecastWaveHeight,
            period: forecastData?.forecastPeriod,
            direction: forecastData?.forecastDirection,
          }),
          correctedValue: JSON.stringify({
            waveHeight: correctedWaveHeight,
            period: correctedPeriod,
            direction: correctedDirection,
          }),
        }
        setCorrections([...corrections, newCorrection])
        setEditingForecast(false)
        setCorrectionReason('')
      }
    } catch (err) {
      console.error('保存修正失败:', err)
    } finally {
      setSavingCorrection(false)
    }
  }

  const handleSubmitOpinion = async () => {
    if (!currentBatchId || !opinionText.trim()) return
    setSavingOpinion(true)
    try {
      const res = await fetch(`/api/review/${currentBatchId}/opinion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opinion: opinionText,
          shipTrajectory,
          submittedBy,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const newOpinion = {
          ...data.data,
          opinion: data.data.opinion || opinionText,
          submittedBy: data.data.submittedBy || submittedBy,
          shipTrajectory,
        }
        setOpinions([...opinions, newOpinion])
        setOpinionText('')
      }
    } catch (err) {
      console.error('提交意见失败:', err)
    } finally {
      setSavingOpinion(false)
    }
  }

  const allVerified = buoyVerified && photosVerified && offlineVerified

  if (!currentBatchId) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-dashed border-slate-300 h-96 flex flex-col items-center justify-center text-slate-400">
          <FileCheck2 className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-sm">请先在计算工作台执行计算</p>
          <p className="text-xs mt-2 opacity-60">计算完成后可在此处复核数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">复核面板</h2>
          <p className="text-sm text-slate-500 mt-1">
            浮标数据、巡检照片、浮标离线统一复核 · 风浪预报晚到可内联修正
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadReviewData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            刷新
          </button>
          <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
            allVerified
              ? 'bg-tide-100 text-tide-700 border border-tide-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {allVerified ? '✓ 复核完成' : '复核进行中'}
          </span>
        </div>
      </div>

      {loading && (
        <div className="bg-deep-50 border border-deep-200 rounded-lg p-3 flex items-center gap-2 text-deep-700 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在从后端加载复核数据...
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className={`px-4 py-3 flex items-center justify-between ${
            buoyVerified ? 'bg-tide-50 border-b border-tide-200' : 'bg-slate-50 border-b border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <FileCheck2 className={cn('w-4 h-4', buoyVerified ? 'text-tide-600' : 'text-slate-500')} />
              <span className="text-sm font-medium text-slate-700">浮标观测数据</span>
            </div>
            <button
              onClick={() => setBuoyVerified(!buoyVerified)}
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all',
                buoyVerified
                  ? 'bg-tide-500 text-white'
                  : 'bg-white border border-slate-300 text-slate-400 hover:border-tide-400'
              )}
            >
              {buoyVerified && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">有效波高</span>
              <span className="font-medium text-slate-700">{buoyData.significantWaveHeight} m</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">谱峰周期</span>
              <span className="font-medium text-slate-700">{buoyData.peakPeriod} s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">主波向</span>
              <span className="font-medium text-slate-700">{buoyData.mainDirection}°</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">风速</span>
              <span className="font-medium text-slate-700">{buoyData.windSpeed} m/s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">水温</span>
              <span className="font-medium text-slate-700">{buoyData.waterTemp} °C</span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-400">
                来源：东海浮标站 #07
              </div>
              <div className="text-xs text-slate-400">
                采集时间：2026-06-16 10:00
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className={`px-4 py-3 flex items-center justify-between ${
            photosVerified ? 'bg-tide-50 border-b border-tide-200' : 'bg-slate-50 border-b border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <Camera className={cn('w-4 h-4', photosVerified ? 'text-tide-600' : 'text-slate-500')} />
              <span className="text-sm font-medium text-slate-700">巡检照片</span>
              <span className="text-xs text-slate-400">({inspectionPhotos.length}张)</span>
            </div>
            <button
              onClick={() => setPhotosVerified(!photosVerified)}
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all',
                photosVerified
                  ? 'bg-tide-500 text-white'
                  : 'bg-white border border-slate-300 text-slate-400 hover:border-tide-400'
              )}
            >
              {photosVerified && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2">
              {inspectionPhotos.map((photo, idx) => (
                <div
                  key={idx}
                  className="aspect-square bg-gradient-to-br from-deep-200 to-deep-300 rounded-lg flex flex-col items-center justify-center text-deep-700 text-xs relative overflow-hidden group"
                >
                  <Camera className="w-5 h-5 mb-1 opacity-60" />
                  <span className="text-[10px] font-mono opacity-70">{photo.slice(0, 8)}</span>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs">查看</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 text-xs text-slate-400">
              拍摄人：李巡检
            </div>
            <div className="text-xs text-slate-400">
              拍摄时间：2026-06-16 09:30
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className={`px-4 py-3 flex items-center justify-between ${
            offlineVerified ? 'bg-tide-50 border-b border-tide-200' : 'bg-amber-50 border-b border-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              <WifiOff className={cn('w-4 h-4', offlineVerified ? 'text-tide-600' : 'text-amber-600')} />
              <span className="text-sm font-medium text-slate-700">浮标离线事件</span>
              <span className="text-xs text-slate-400">({buoyOfflineEvents.length}次)</span>
            </div>
            <button
              onClick={() => setOfflineVerified(!offlineVerified)}
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all',
                offlineVerified
                  ? 'bg-tide-500 text-white'
                  : 'bg-white border border-slate-300 text-slate-400 hover:border-tide-400'
              )}
            >
              {offlineVerified && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="p-4 space-y-3">
            {buoyOfflineEvents.map((event: any, idx: number) => (
              <div key={idx} className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <div className="flex items-center gap-2 text-amber-700 text-xs font-medium mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  离线事件 #{idx + 1}
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">开始</span>
                    <span className="font-mono">{event.startTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">结束</span>
                    <span className="font-mono">{event.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">原因</span>
                    <span>{event.reason}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {forecastData?.isLate && (
        <div className={`bg-white rounded-xl border overflow-hidden ${
          editingForecast ? 'border-coral-400' : 'border-coral-200'
        }`}>
          <div className="bg-coral-50 px-5 py-3 flex items-center justify-between border-b border-coral-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-coral-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-coral-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-coral-800">风浪预报晚到记录</h3>
                <p className="text-xs text-coral-600">
                  预报到达时间：{forecastData.arrivalTime} · 预计晚到约 45 分钟
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingForecast(!editingForecast)
                if (!editingForecast) {
                  setCorrectedWaveHeight(forecastData.forecastWaveHeight)
                  setCorrectedPeriod(forecastData.forecastPeriod)
                  setCorrectedDirection(forecastData.forecastDirection)
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-coral-200 text-coral-700 hover:bg-coral-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              内联修正
            </button>
          </div>

          {editingForecast ? (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">修正后预报波高 (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={correctedWaveHeight}
                    onChange={(e) => setCorrectedWaveHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-coral-500/30 focus:border-coral-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">修正后预报周期 (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={correctedPeriod}
                    onChange={(e) => setCorrectedPeriod(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-coral-500/30 focus:border-coral-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">修正后预报波向 (°)</label>
                  <input
                    type="number"
                    value={correctedDirection}
                    onChange={(e) => setCorrectedDirection(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-coral-500/30 focus:border-coral-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">修正原因 *</label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="请说明修正原因，如：参考邻近浮标数据调整..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-coral-500/30 focus:border-coral-500 outline-none h-20 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingForecast(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveCorrection}
                  disabled={savingCorrection || !correctionReason.trim()}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm text-white transition-colors flex items-center gap-2',
                    savingCorrection || !correctionReason.trim()
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-coral-500 hover:bg-coral-600'
                  )}
                >
                  {savingCorrection && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  保存修正
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">原预报波高</div>
                  <div className="text-lg font-bold text-slate-700">{forecastData.forecastWaveHeight} m</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">原预报周期</div>
                  <div className="text-lg font-bold text-slate-700">{forecastData.forecastPeriod} s</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">原预报波向</div>
                  <div className="text-lg font-bold text-slate-700">{forecastData.forecastDirection}°</div>
                </div>
              </div>
              {corrections.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-500 mb-2">已有修正记录 ({corrections.length}) · 已持久化保存</div>
                  {corrections.map((c: any, idx: number) => (
                    <div key={idx} className="text-xs text-slate-600 bg-tide-50 rounded-lg p-2.5 mb-2 border border-tide-100">
                      <div className="flex justify-between items-center">
                        <span className="text-tide-700 font-medium">
                          {c.type || '修正'} #{idx + 1}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {c.id}
                        </span>
                      </div>
                      <div className="mt-1 text-slate-600">原因：{c.reason}</div>
                      <div className="mt-1 text-slate-500 text-[11px]">
                        修正人：{c.correctedBy || '未知'} · {c.createdAt}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-tide-600" />
            处理意见
          </h3>
          <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
            {opinions.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8">
                暂无处理意见
              </div>
            ) : (
              opinions.map((op: any, idx: number) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-slate-700">{op.submittedBy}</span>
                    <span className="text-xs text-slate-400 font-mono text-[10px]">{op.id}</span>
                  </div>
                  <p className="text-sm text-slate-600">{op.opinion}</p>
                  <div className="mt-1.5 text-[11px] text-slate-400">{op.createdAt}</div>
                </div>
              ))
            )}
          </div>
          <div className="space-y-3">
            <textarea
              value={opinionText}
              onChange={(e) => setOpinionText(e.target.value)}
              placeholder="填写处理意见..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tide-500/30 focus:border-tide-500 outline-none h-20 resize-none"
            />
            <div className="flex justify-between items-center">
              <input
                type="text"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded text-xs w-32"
                placeholder="提交人"
              />
              <button
                onClick={handleSubmitOpinion}
                disabled={savingOpinion || !opinionText.trim()}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm text-white transition-colors flex items-center gap-2',
                  savingOpinion || !opinionText.trim()
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-tide-500 hover:bg-tide-600'
                )}
              >
                {savingOpinion && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                提交意见
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Anchor className="w-4 h-4 text-deep-600" />
            船舶轨迹
          </h3>
          <div className="bg-deep-50 rounded-lg h-48 relative overflow-hidden border border-deep-100">
            <svg className="w-full h-full" viewBox="0 0 280 160">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <path
                d={shipTrajectory.map((p, i) => {
                  const x = 20 + (p.lng - 121.4) * 80
                  const y = 140 - (p.lat - 31.2) * 50
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                }).join(' ')}
                stroke="#0c89e0"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4,2"
              />
              {shipTrajectory.map((p, i) => {
                const x = 20 + (p.lng - 121.4) * 80
                const y = 140 - (p.lat - 31.2) * 50
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="5" fill="#2EC4B6" stroke="white" strokeWidth="2" />
                    <text x={x} y={y - 8} textAnchor="middle" className="text-[9px]" fill="#475569">
                      {p.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between">
              <span className="text-slate-400">船名</span>
              <span className="text-slate-700">海巡 0731</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">当前位置</span>
              <span className="text-slate-700 font-mono">31.8°N, 122.5°E</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">航向/航速</span>
              <span className="text-slate-700">135° · 12 节</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
