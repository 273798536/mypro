import { useState } from 'react'
import { useStore } from '../store/useStore'
import { ClipboardCheck, AlertTriangle, CheckCircle, XCircle, Link2 } from 'lucide-react'

export default function Review() {
  const { samples, submitReview } = useStore()
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null)
  const [decision, setDecision] = useState<'passed' | 'rejected'>('passed')
  const [reason, setReason] = useState('')
  const [showMaterials, setShowMaterials] = useState(false)

  const pendingSamples = samples.filter(
    (s) => s.contaminationMark && s.contaminationMark.reviewStatus === 'pending'
  )
  const reviewedSamples = samples.filter(
    (s) => s.contaminationMark && s.contaminationMark.reviewStatus !== 'pending'
  )

  const selectedSample = samples.find(
    (s) => s.contaminationMark?.id === selectedMarkId
  )
  const selectedMark = selectedSample?.contaminationMark ?? null

  const handleSubmit = () => {
    if (!selectedMarkId || !reason.trim()) return
    submitReview(selectedMarkId, decision, reason)
    setSelectedMarkId(null)
    setReason('')
    setDecision('passed')
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-teal-950">异常复核面板</h2>
        <p className="mt-1 text-sm text-slate-500">对污染标记样本进行复核，填写理由后通过或驳回</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            待复核（{pendingSamples.length}）
          </h3>
          {pendingSamples.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedMarkId(s.contaminationMark!.id)}
              className={`card-lift w-full text-left rounded-xl border-2 p-4 transition-all ${
                selectedMarkId === s.contaminationMark!.id
                  ? 'border-amber-400 bg-amber-50/50 shadow-md'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-semibold">{s.code}</span>
                <span className="badge-boundary">{s.category === 'boundary' ? '边界' : '坏'}</span>
              </div>
              <p className="text-sm text-slate-600">{s.contaminationMark!.source}</p>
              <p className="mt-1 text-xs text-slate-400">{s.contaminationMark!.description}</p>
              {s.oldRemark && <p className="mt-1 old-remark">旧备注：{s.oldRemark}</p>}
            </button>
          ))}

          {pendingSamples.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-sm text-slate-500">所有污染标记已复核完毕</p>
            </div>
          )}

          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-500 pt-2">
            <CheckCircle className="h-4 w-4" />
            已复核（{reviewedSamples.length}）
          </h3>
          {reviewedSamples.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedMarkId(s.contaminationMark!.id)}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                selectedMarkId === s.contaminationMark!.id
                  ? 'border-teal-400 bg-teal-50/30 shadow-md'
                  : 'border-slate-200 bg-white opacity-75 hover:opacity-100'
              } ${s.contaminationMark!.reviewStatus === 'passed' ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-red-400'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-semibold">{s.code}</span>
                <span className={s.contaminationMark!.reviewStatus === 'passed' ? 'badge-normal' : 'badge-bad'}>
                  {s.contaminationMark!.reviewStatus === 'passed' ? '复核通过' : '复核驳回'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                复核人：{s.contaminationMark!.reviewRecord!.reviewer} · {s.contaminationMark!.reviewRecord!.reviewedAt}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {selectedMark && selectedSample ? (
            <>
              <div className="panel p-5">
                <h3 className="section-title mb-4">复核操作</h3>
                <div className="rounded-lg bg-slate-50 p-3 mb-4 space-y-2">
                  <p className="font-mono text-sm font-semibold">{selectedSample.code}</p>
                  <p className="text-sm text-slate-600">来源：{selectedSample.source}</p>
                  <p className="text-sm text-slate-600">污染来源：{selectedMark.source}</p>
                  {selectedSample.oldRemark && (
                    <p className="old-remark">旧备注：{selectedSample.oldRemark}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">复核决定</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDecision('passed')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                        decision === 'passed'
                          ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400'
                          : 'bg-white border-2 border-slate-200 text-slate-600'
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      通过
                    </button>
                    <button
                      onClick={() => setDecision('rejected')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                        decision === 'rejected'
                          ? 'bg-red-100 text-red-800 border-2 border-red-400'
                          : 'bg-white border-2 border-slate-200 text-slate-600'
                      }`}
                    >
                      <XCircle className="h-4 w-4" />
                      驳回
                    </button>
                  </div>

                  <label className="block text-sm font-medium text-slate-700">复核理由</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="请填写复核理由，说明为什么通过或驳回..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />

                  <button
                    onClick={handleSubmit}
                    disabled={!reason.trim()}
                    className="btn-primary w-full"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    提交复核
                  </button>
                </div>
              </div>

              {selectedMark.reviewRecord && (
                <div className="panel p-5">
                  <h3 className="section-title mb-4">图像标注对比</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <p className="text-xs font-medium text-slate-500 mb-2">复核前标注</p>
                      <div className="relative h-40 rounded bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                        {selectedMark.reviewRecord.beforeAnnotation.regions.map((region) => (
                          <div
                            key={region.id}
                            className={`absolute border-2 rounded-sm flex items-center justify-center text-[10px] font-medium ${
                              region.type === 'contamination'
                                ? 'border-red-500 bg-red-500/20 text-red-700'
                                : 'border-blue-500 bg-blue-500/20 text-blue-700'
                            }`}
                            style={{
                              left: `${region.x}%`,
                              top: `${region.y}%`,
                              width: `${region.width}%`,
                              height: `${region.height}%`,
                            }}
                          >
                            {region.label.length > 6 ? region.label.slice(0, 6) + '…' : region.label}
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{selectedMark.reviewRecord.beforeAnnotation.label}</p>
                    </div>
                    <div className="rounded-lg bg-white border border-amber-300 p-3">
                      <p className="text-xs font-medium text-amber-600 mb-2">复核后标注</p>
                      <div className="relative h-40 rounded bg-gradient-to-br from-amber-50 to-white overflow-hidden">
                        {selectedMark.reviewRecord.afterAnnotation.regions.map((region) => (
                          <div
                            key={region.id}
                            className={`absolute border-2 rounded-sm flex items-center justify-center text-[10px] font-medium ${
                              region.type === 'contamination'
                                ? 'border-red-500 bg-red-500/20 text-red-700'
                                : region.type === 'abnormality'
                                ? 'border-amber-500 bg-amber-500/20 text-amber-700'
                                : 'border-blue-500 bg-blue-500/20 text-blue-700'
                            }`}
                            style={{
                              left: `${region.x}%`,
                              top: `${region.y}%`,
                              width: `${region.width}%`,
                              height: `${region.height}%`,
                            }}
                          >
                            {region.label.length > 6 ? region.label.slice(0, 6) + '…' : region.label}
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{selectedMark.reviewRecord.afterAnnotation.label}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-2 text-xs text-yellow-700">
                    差异：复核后新增 {selectedMark.reviewRecord.afterAnnotation.regions.length - selectedMark.reviewRecord.beforeAnnotation.regions.length} 处标注
                  </div>
                </div>
              )}

              <div className="panel overflow-hidden">
                <button
                  onClick={() => setShowMaterials(!showMaterials)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50"
                >
                  <span className="section-title flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    本轮关联材料
                  </span>
                  <span className="text-xs text-slate-400">{showMaterials ? '收起' : '展开'}</span>
                </button>
                {showMaterials && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                      <span className="text-slate-600">样本清单：</span>
                      <span className="font-mono text-slate-800">{selectedSample.code}</span>
                    </div>
                    {selectedSample.pathologyNotes.map((note) => (
                      <div key={note.id} className="flex items-center gap-2 text-sm">
                        <div className={`h-1.5 w-1.5 rounded-full ${note.isOld ? 'bg-slate-300' : 'bg-teal-500'}`} />
                        <span className="text-slate-600">病理备注：</span>
                        <span className={note.isOld ? 'text-slate-400 italic' : 'text-slate-800'}>
                          {note.content.slice(0, 30)}...
                        </span>
                        {note.isOld && <span className="text-xs text-slate-400">（旧）</span>}
                      </div>
                    ))}
                    {selectedSample.contaminationMark && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        <span className="text-slate-600">污染记录：</span>
                        <span className="text-red-800">{selectedSample.contaminationMark.source}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="panel p-12 text-center">
              <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-400">选择一个待复核的污染标记样本</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
