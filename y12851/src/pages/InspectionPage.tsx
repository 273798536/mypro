import { useStore } from '@/store/useStore'
import { getRiskLevelLabel, METRIC_DEFS } from '@/utils/calcEngine'
import RiskBadge from '@/components/RiskBadge'
import { Camera, CheckCircle, Upload, AlertTriangle, ImageOff } from 'lucide-react'

export default function InspectionPage() {
  const photoGaps = useStore((s) => s.photoGaps)
  const records = useStore((s) => s.buoyRecords)
  const assessments = useStore((s) => s.riskAssessments)
  const addPhotoToRecord = useStore((s) => s.addPhotoToRecord)

  const withPhoto = records.filter((r) => r.hasPhoto).length
  const withoutPhoto = records.filter((r) => !r.hasPhoto).length
  const total = records.length

  const groupedGaps = photoGaps.reduce<Record<string, typeof photoGaps>>((acc, gap) => {
    const key = gap.stationId
    if (!acc[key]) acc[key] = []
    acc[key].push(gap)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ocean-50">巡检照片</h1>
        <p className="text-sm text-ocean-400 mt-1">照片缺失时先算能算的，再把缺口列给科研助理补</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal/20 flex items-center justify-center">
              <Camera size={20} className="text-teal" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-teal">{withPhoto}</p>
              <p className="text-xs text-ocean-400">已关联照片</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warn/20 flex items-center justify-center">
              <ImageOff size={20} className="text-warn" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-warn">{withoutPhoto}</p>
              <p className="text-xs text-ocean-400">照片缺失</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-ocean-700/50 flex items-center justify-center">
              <CheckCircle size={20} className="text-ocean-300" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-ocean-200">
                {total > 0 ? Math.round((withPhoto / total) * 100) : 0}%
              </p>
              <p className="text-xs text-ocean-400">照片覆盖率</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium text-ocean-300 mb-2">降级策略说明</h3>
        <div className="text-xs text-ocean-400 space-y-1 bg-ocean-950 rounded p-3">
          <p>• 巡检照片缺失时，计算仍然正常进行，不会整批失败</p>
          <p>• 缺失照片的记录，结果标注"待验证"，风险等级降一级</p>
          <p>• 降级规则：高风险→异常，异常→关注，关注和正常不变</p>
          <p>• 补关联照片后，风险等级自动恢复到实际计算值</p>
        </div>
      </div>

      {photoGaps.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-warn flex items-center gap-2 mb-4">
            <AlertTriangle size={16} />
            补缺清单 — {photoGaps.length} 条记录缺少巡检照片
          </h3>

          {Object.entries(groupedGaps).map(([stationId, gaps]) => {
            const stationName = gaps[0].stationName
            const assess = assessments.find((a) => a.stationId === stationId)

            return (
              <div key={stationId} className="mb-4 last:mb-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-ocean-200">{stationName}</span>
                  <span className="text-xs text-ocean-500">{stationId}</span>
                  {assess && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ocean-400">当前风险:</span>
                      <RiskBadge level={assess.adjustedLevel} />
                      {assess.level !== assess.adjustedLevel && (
                        <span className="text-xs text-ocean-500">
                          (实际: {getRiskLevelLabel(assess.level)}，因缺照片降级)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  {gaps.map((gap) => {
                    const record = records.find((r) => r.id === gap.recordId)
                    return (
                      <div
                        key={gap.recordId}
                        className="flex items-center gap-3 px-3 py-2 rounded bg-ocean-900/60"
                      >
                        <ImageOff size={14} className="text-warn shrink-0" />
                        <span className="text-xs text-ocean-400 font-mono shrink-0">
                          {new Date(gap.timestamp).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-xs text-ocean-500">
                          缺: {gap.missingPhotoType}
                        </span>
                        {record && (
                          <div className="flex gap-2 text-xs text-ocean-400">
                            {METRIC_DEFS.slice(0, 3).map((d) => {
                              const val = record[d.key as keyof typeof record]
                              return (
                                <span key={d.key} className="font-mono">
                                  {d.label}:{val !== null ? val : '—'}
                                </span>
                              )
                            })}
                            <span className="text-ocean-600">...</span>
                          </div>
                        )}
                        <div className="ml-auto">
                          <button
                            onClick={() => addPhotoToRecord(gap.recordId, '现场巡检照片')}
                            className="inline-flex items-center gap-1 text-xs text-teal hover:text-teal-light transition-colors"
                          >
                            <Upload size={12} />
                            补关联
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {photoGaps.length === 0 && (
        <div className="card p-8 text-center text-ocean-500 text-sm">
          所有记录均已关联巡检照片
        </div>
      )}
    </div>
  )
}
