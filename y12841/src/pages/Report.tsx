import { useStore } from '../store/useStore'
import { FileText, AlertTriangle, Link2, Clock, User, FlaskConical, ShieldCheck } from 'lucide-react'

export default function Report() {
  const { samples, sequencingResults, auditLogs } = useStore()

  const normalSamples = samples.filter((s) => s.category === 'normal')
  const boundarySamples = samples.filter((s) => s.category === 'boundary')
  const badSamples = samples.filter((s) => s.category === 'bad')
  const contaminationPassed = samples.filter(
    (s) => s.contaminationMark?.reviewStatus === 'passed'
  )
  const samplesWithMissingTimestamp = samples.filter((s) => s.missingTimestamp)

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  return (
    <div className="p-6 flex justify-center">
      <div className="w-[820px] bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden">
        <header className="bg-teal-950 text-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold">生物课分类检索器 · 分类报告</h2>
              <p className="mt-1 text-sm text-teal-300">批次：2026年夏季育种材料</p>
            </div>
            <div className="text-right text-sm text-teal-300">
              <p>生成时间：{now}</p>
              <p>操作人：陈志远（育种专员）</p>
            </div>
          </div>
        </header>

        <div className="px-8 py-6 space-y-8">
          <section>
            <h3 className="font-serif text-lg font-semibold text-teal-950 mb-4 pb-2 border-b border-slate-200">
              一、分类结果汇总
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/30 p-4 text-center">
                <p className="text-3xl font-bold text-emerald-700">{normalSamples.length}</p>
                <p className="text-sm text-emerald-600 mt-1">正常样本</p>
              </div>
              <div className="rounded-lg border-2 border-amber-200 bg-amber-50/30 p-4 text-center">
                <p className="text-3xl font-bold text-amber-700">{boundarySamples.length}</p>
                <p className="text-sm text-amber-600 mt-1">边界样本</p>
              </div>
              <div className="rounded-lg border-2 border-red-200 bg-red-50/30 p-4 text-center">
                <p className="text-3xl font-bold text-red-700">{badSamples.length}</p>
                <p className="text-sm text-red-600 mt-1">坏样本</p>
              </div>
            </div>

            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">样本编号</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">来源</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">分类</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">测序结论</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">备注</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => {
                  const seqResult = sequencingResults.find((r) => r.sampleId === s.id)
                  return (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-mono text-xs">{s.code}</td>
                      <td className="px-4 py-2 text-xs text-slate-600">{s.source}</td>
                      <td className="px-4 py-2">
                        <span className={
                          s.category === 'normal' ? 'badge-normal' :
                          s.category === 'boundary' ? 'badge-boundary' : 'badge-bad'
                        }>
                          {s.category === 'normal' ? '正常' : s.category === 'boundary' ? '边界' : '坏'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-700 max-w-[240px]">
                        {seqResult?.conclusion}
                        {seqResult?.previousConclusion && (
                          <span className="ml-1 text-amber-600">（已修改）</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {s.contaminationMark && (
                          <span className="badge-contamination text-[10px]">污染</span>
                        )}
                        {s.missingTimestamp && (
                          <span className="missing-tag text-[10px] ml-1">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            缺失
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          {contaminationPassed.length > 0 && (
            <section>
              <h3 className="font-serif text-lg font-semibold text-teal-950 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                二、污染样本复核通过记录
              </h3>
              {contaminationPassed.map((s) => (
                <div key={s.id} className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-semibold">{s.code}</span>
                    <span className="badge-normal">复核通过</span>
                  </div>
                  <p className="text-sm text-slate-700 mb-1">污染来源：{s.contaminationMark!.source}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      复核人：{s.contaminationMark!.reviewRecord!.reviewer}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {s.contaminationMark!.reviewRecord!.reviewedAt}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-emerald-700">
                    通过理由：{s.contaminationMark!.reviewRecord!.reason}
                  </p>
                </div>
              ))}
            </section>
          )}

          {samplesWithMissingTimestamp.length > 0 && (
            <section>
              <h3 className="font-serif text-lg font-semibold text-teal-950 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                三、时间点缺失标注
              </h3>
              <p className="text-sm text-slate-600 mb-3">
                以下样本的数据链中存在时间点缺失，可能影响分类判断的可信度：
              </p>
              {samplesWithMissingTimestamp.map((s) => (
                <div key={s.id} className="rounded-lg border border-yellow-300 bg-yellow-50/50 p-4 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-semibold text-yellow-800">{s.code}</span>
                    <span className="missing-tag">时间点缺失</span>
                  </div>
                  <p className="text-sm text-yellow-700">{s.missingTimestampSource}</p>
                  <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    卡在材料：{s.source}
                  </p>
                </div>
              ))}
            </section>
          )}

          <section>
            <h3 className="font-serif text-lg font-semibold text-teal-950 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-teal-600" />
              四、材料来源追溯
            </h3>
            <div className="space-y-4">
              {samples.map((s) => {
                const seqResult = sequencingResults.find((r) => r.sampleId === s.id)
                const sampleAuditLogs = auditLogs.filter(
                  (l) => l.entityId === s.id || l.entityId === seqResult?.id || l.entityId === s.contaminationMark?.id
                )
                return (
                  <div key={s.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FlaskConical className="h-4 w-4 text-teal-600" />
                      <span className="font-mono text-sm font-semibold">{s.code}</span>
                      <span className={
                        s.category === 'normal' ? 'badge-normal' :
                        s.category === 'boundary' ? 'badge-boundary' : 'badge-bad'
                      }>
                        {s.category === 'normal' ? '正常' : s.category === 'boundary' ? '边界' : '坏'}
                      </span>
                    </div>
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="h-1 w-1 rounded-full bg-teal-500" />
                        <span className="text-slate-500">来源：</span>
                        <span className="text-slate-700">{s.source}</span>
                        <span className="text-slate-400">· {s.createdAt}</span>
                      </div>
                      {s.reagentBatch ? (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="h-1 w-1 rounded-full bg-teal-500" />
                          <span className="text-slate-500">试剂批号：</span>
                          <span className="font-mono text-slate-700">{s.reagentBatch}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="h-1 w-1 rounded-full bg-yellow-500" />
                          <span className="text-yellow-600">试剂批号：未录入</span>
                        </div>
                      )}
                      {seqResult && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="h-1 w-1 rounded-full bg-teal-500" />
                          <span className="text-slate-500">测序维护人：</span>
                          <span className="text-slate-700">{seqResult.maintainer}</span>
                          <span className="text-slate-400">· {seqResult.originalCreatedAt}</span>
                          {seqResult.modifiedAt && (
                            <span className="text-amber-600">· 修改于 {seqResult.modifiedAt}</span>
                          )}
                        </div>
                      )}
                      {s.contaminationMark && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="h-1 w-1 rounded-full bg-red-500" />
                          <span className="text-red-600">污染标记：{s.contaminationMark.source}</span>
                          <span className="text-slate-400">· {s.contaminationMark.detectedAt}</span>
                        </div>
                      )}
                      {s.contaminationMark?.reviewRecord && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="h-1 w-1 rounded-full bg-emerald-500" />
                          <span className="text-emerald-600">复核：{s.contaminationMark.reviewRecord.reviewer}</span>
                          <span className="text-slate-400">· {s.contaminationMark.reviewRecord.reviewedAt}</span>
                        </div>
                      )}
                      {sampleAuditLogs.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="h-1 w-1 rounded-full bg-slate-400" />
                          <span className="text-slate-500">审计记录 {sampleAuditLogs.length} 条</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 px-8 py-4 text-xs text-slate-400">
          生物课分类检索器 · 分类报告 · 生成时间 {now}
        </footer>
      </div>
    </div>
  )
}
