import { useStore } from '../store/useStore'
import SampleCard from '../components/SampleCard'
import SequencingPanel from '../components/SequencingPanel'
import PathologyDrawer from '../components/PathologyDrawer'
import ContaminationBanner from '../components/ContaminationBanner'
import { FileText, AlertTriangle } from 'lucide-react'

export default function Workspace() {
  const { samples, selectedSampleId, setSelectedSample, pathologyDrawerOpen, setPathologyDrawerOpen, getSequencingResult } = useStore()

  const selectedSample = samples.find((s) => s.id === selectedSampleId)
  const sequencingResult = selectedSample ? getSequencingResult(selectedSample.id) : undefined

  const normalSamples = samples.filter((s) => s.category === 'normal')
  const boundarySamples = samples.filter((s) => s.category === 'boundary')
  const badSamples = samples.filter((s) => s.category === 'bad')

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-teal-950">分类检索工作台</h2>
            <p className="mt-1 text-sm text-slate-500">当前批次：2026年夏季育种材料 · 共 {samples.length} 份样本</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="badge-normal">正常 {normalSamples.length}</span>
            <span className="badge-boundary">边界 {boundarySamples.length}</span>
            <span className="badge-bad">坏样本 {badSamples.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              正常样本
            </h3>
            <div className="space-y-3">
              {normalSamples.map((s) => (
                <SampleCard
                  key={s.id}
                  sample={s}
                  isSelected={selectedSampleId === s.id}
                  onClick={() => setSelectedSample(s.id)}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              边界样本
            </h3>
            <div className="space-y-3">
              {boundarySamples.map((s) => (
                <SampleCard
                  key={s.id}
                  sample={s}
                  isSelected={selectedSampleId === s.id}
                  onClick={() => setSelectedSample(s.id)}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              坏样本
            </h3>
            <div className="space-y-3">
              {badSamples.map((s) => (
                <SampleCard
                  key={s.id}
                  sample={s}
                  isSelected={selectedSampleId === s.id}
                  onClick={() => setSelectedSample(s.id)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {selectedSample && (
        <div className="w-[480px] border-l border-slate-200 bg-white overflow-y-auto">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="section-title">样本详情</h3>
              <button
                onClick={() => setPathologyDrawerOpen(true)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                病理备注
              </button>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-bold text-teal-950">{selectedSample.code}</span>
                {selectedSample.missingTimestamp && (
                  <span className="missing-tag" title={selectedSample.missingTimestampSource || ''}>
                    <AlertTriangle className="h-3 w-3" />
                    时间点缺失
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600">来源：{selectedSample.source}</p>
              <p className="text-sm text-slate-600">
                采样时间：<span className="font-mono">{selectedSample.createdAt}</span>
                {selectedSample.updatedAt && (
                  <span className="ml-3 text-xs text-amber-600">
                    （更新于 {selectedSample.updatedAt}）
                  </span>
                )}
              </p>
              {selectedSample.reagentBatch ? (
                <p className="text-sm text-slate-600">
                  试剂批号：<span className="font-mono">{selectedSample.reagentBatch}</span>
                </p>
              ) : (
                <div className="missing-tag w-fit">试剂批号未录入</div>
              )}
              {selectedSample.oldRemark && (
                <p className="old-remark">旧备注：{selectedSample.oldRemark}</p>
              )}
            </div>

            {selectedSample.contaminationMark && (
              <ContaminationBanner mark={selectedSample.contaminationMark} />
            )}

            {sequencingResult && <SequencingPanel result={sequencingResult} />}

            {selectedSample.missingTimestamp && selectedSample.missingTimestampSource && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3">
                <p className="text-xs font-medium text-yellow-700 mb-1">时间点缺失说明</p>
                <p className="text-sm text-yellow-800">{selectedSample.missingTimestampSource}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedSample && (
        <div className="flex w-[480px] items-center justify-center border-l border-slate-200 bg-slate-50/50">
          <p className="text-sm text-slate-400">← 选择一个样本查看详情</p>
        </div>
      )}

      {selectedSample && (
        <PathologyDrawer
          notes={selectedSample.pathologyNotes}
          open={pathologyDrawerOpen}
          onClose={() => setPathologyDrawerOpen(false)}
        />
      )}
    </div>
  )
}
