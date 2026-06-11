import { useStore } from '../store/useStore'
import { GitCompareArrows, ArrowRight, AlertTriangle } from 'lucide-react'

export default function Compare() {
  const { sequencingResults, samples } = useStore()
  const modifiedResults = sequencingResults.filter((r) => r.previousConclusion !== null)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-teal-950">结论对比视图</h2>
        <p className="mt-1 text-sm text-slate-500">测序结果修改后，新旧结论并排展示，方便查看影响范围</p>
      </div>

      {modifiedResults.length === 0 ? (
        <div className="panel p-12 text-center">
          <GitCompareArrows className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">暂无修改过的测序结果</p>
        </div>
      ) : (
        <div className="space-y-6">
          {modifiedResults.map((result) => {
            const sample = samples.find((s) => s.id === result.sampleId)
            return (
              <div key={result.id} className="panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <GitCompareArrows className="h-4 w-4 text-teal-700" />
                    <span className="font-mono text-sm font-semibold">{sample?.code}</span>
                    <span className="text-sm text-slate-500">· {sample?.source}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>维护人：{result.maintainer}</span>
                    <span>修改时间：{result.modifiedAt}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2">
                  <div className="border-r border-slate-200 bg-slate-50/80 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-slate-400" />
                      <p className="text-sm font-semibold text-slate-500">旧结论</p>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-4">
                      <p className="text-sm text-slate-600 leading-relaxed">{result.previousConclusion}</p>
                    </div>
                    <div className="mt-3 flex items-end gap-1 h-12">
                      {result.data.map((point, i) => {
                        const height = (point.quality - 0.5) * 200
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-t bg-slate-300"
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                        )
                      })}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">原始测序数据 · {result.originalCreatedAt}</p>
                  </div>

                  <div className="bg-white p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <p className="text-sm font-semibold text-amber-700">新结论</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        已修改
                      </span>
                    </div>
                    <div className="rounded-lg border border-amber-300 bg-amber-50/30 p-4">
                      <p className="text-sm text-slate-800 font-medium leading-relaxed">{result.conclusion}</p>
                    </div>
                    <div className="mt-3 flex items-end gap-1 h-12">
                      {result.data.map((point, i) => {
                        const height = (point.quality - 0.5) * 200
                        const isLow = point.quality < 0.75
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-t ${isLow ? 'bg-red-400' : 'bg-teal-600'}`}
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                        )
                      })}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">更新后测序数据 · {result.modifiedAt}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 px-5 py-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">影响范围</p>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm">
                      <span className="font-mono text-xs">{sample?.code}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="badge-bad text-xs">
                        {sample?.category === 'boundary' ? '边界样本' : sample?.category === 'bad' ? '坏样本' : '正常样本'}
                      </span>
                    </span>
                    {sample?.contaminationMark && (
                      <span className="badge-contamination">
                        关联污染标记 · {sample.contaminationMark.source.slice(0, 20)}...
                      </span>
                    )}
                    {sample?.missingTimestamp && (
                      <span className="missing-tag">
                        时间点缺失
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
