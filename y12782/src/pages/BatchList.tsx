import { useLabStore } from '../store'
import { Link } from 'react-router-dom'

const statusMap: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'tag-neutral' },
  prepared: { label: '已配制', cls: 'tag-info' },
  audited: { label: '已复核', cls: 'tag-success' },
  expired: { label: '已过期', cls: 'tag-danger' },
  invalid: { label: '已作废', cls: 'tag-danger' },
}

export default function BatchList() {
  const batches = useLabStore((s) => s.batches)
  const spectrums = useLabStore((s) => s.spectrums)
  const anomalies = useLabStore((s) => s.anomalies)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">标准液批次</h2>
        <Link to="/batches/new" className="btn-primary">+ 新建批次</Link>
      </div>

      <div className="page-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-3 font-semibold text-slate-600">批次号</th>
              <th className="pb-3 font-semibold text-slate-600">试剂名称</th>
              <th className="pb-3 font-semibold text-slate-600">标称浓度</th>
              <th className="pb-3 font-semibold text-slate-600">配制日期</th>
              <th className="pb-3 font-semibold text-slate-600">有效期至</th>
              <th className="pb-3 font-semibold text-slate-600">配制人</th>
              <th className="pb-3 font-semibold text-slate-600">状态</th>
              <th className="pb-3 font-semibold text-slate-600">谱图</th>
              <th className="pb-3 font-semibold text-slate-600">异常</th>
              <th className="pb-3 font-semibold text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => {
              const specCount = spectrums.filter((s) => s.batchId === b.id).length
              const anomCount = anomalies.filter((a) => a.batchId === b.id && a.status !== 'closed').length
              const st = statusMap[b.status] || statusMap.draft
              return (
                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3">
                    <Link to={`/batches/${b.id}`} className="text-lab-primary hover:underline font-medium">
                      {b.batchNo}
                    </Link>
                  </td>
                  <td className="py-3">{b.reagentName}</td>
                  <td className="py-3">{b.nominalConcentration} {b.nominalConcentrationUnit}</td>
                  <td className="py-3">{b.preparationDate}</td>
                  <td className="py-3">{b.validUntilDate}</td>
                  <td className="py-3">{b.preparator}</td>
                  <td className="py-3"><span className={st.cls}>{st.label}</span></td>
                  <td className="py-3">{specCount}</td>
                  <td className="py-3">
                    {anomCount > 0 ? (
                      <span className="tag-warn">{anomCount}</span>
                    ) : (
                      <span className="tag-success">0</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Link to={`/batches/${b.id}`} className="text-lab-secondary hover:underline text-xs">详情</Link>
                      <Link to={`/reports/${b.id}`} className="text-lab-secondary hover:underline text-xs">报告</Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {batches.length === 0 && (
          <div className="text-center py-12 text-slate-400">暂无批次数据，点击右上角新建</div>
        )}
      </div>
    </div>
  )
}
