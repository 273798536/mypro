import { useState, useMemo } from 'react'
import { Search, ShieldCheck, AlertTriangle, History, Trash2 } from 'lucide-react'
import { useReportStore } from '../store/reportStore'
import { BOUNDARY_STATUS_LABELS, REPORT_STATUS_LABELS } from '../types'

export default function EquipmentVerifyPage() {
  const { reports, checkDuplicate, deleteReport } = useReportStore()
  const [searchId, setSearchId] = useState('')
  const [checked, setChecked] = useState(false)

  const duplicateResult = useMemo(() => {
    if (!searchId.trim() || !checked) return null
    return checkDuplicate(searchId.trim())
  }, [searchId, checked, checkDuplicate])

  const handleSearch = () => {
    setChecked(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1B3A5C]">设备编号校验</h2>
        <p className="mt-1 text-sm text-[#5A7A9A]">检查设备编号是否重复，查看历史报告，处理冲突</p>
      </div>

      <div className="mb-6 rounded-xl border border-[#1B3A5C]/10 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8BA3BF]">
          <ShieldCheck className="h-3.5 w-3.5" />
          编号查询
        </h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8BA3BF]" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => {
                setSearchId(e.target.value)
                setChecked(false)
              }}
              onKeyDown={handleKeyDown}
              placeholder="输入设备编号，如 PUL-2024-0315"
              className="w-full rounded-lg border border-[#1B3A5C]/15 bg-[#F8FAFB] py-2.5 pl-10 pr-4 font-mono text-sm text-[#1B3A5C] placeholder:text-[#8BA3BF]/60 focus:border-[#2D9B83] focus:outline-none focus:ring-1 focus:ring-[#2D9B83]/30 transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded-lg bg-[#1B3A5C] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0F2640]"
          >
            校验
          </button>
        </div>
      </div>

      {duplicateResult && (
        <div className="mb-6">
          {duplicateResult.isDuplicate ? (
            <div className="rounded-xl border border-[#C44D3F]/20 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C44D3F]/10">
                  <AlertTriangle className="h-5 w-5 text-[#C44D3F]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#C44D3F]">发现重复设备编号</h4>
                  <p className="text-xs text-[#5A7A9A]">
                    设备 <span className="font-mono font-bold">{searchId}</span> 已有 {duplicateResult.existingReports.length} 条报告
                  </p>
                </div>
              </div>

              <div className="mb-4 rounded-lg bg-[#C44D3F]/5 p-4">
                <p className="mb-1 text-xs font-semibold text-[#1B3A5C]">原因</p>
                <p className="text-sm text-[#3A5A7A]">
                  设备编号 {searchId} 已存在历史报告记录。为避免数据冲突，需确认处理方式：
                </p>
                <ul className="mt-2 space-y-1 text-xs text-[#5A7A9A]">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#E8A838]" />
                    如需更新旧数据，请在报告生成页选择"覆盖旧报告"
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#2D9B83]" />
                    如为新一轮检测，请选择"新建子报告"
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h5 className="flex items-center gap-2 text-xs font-semibold text-[#8BA3BF]">
                  <History className="h-3.5 w-3.5" />
                  历史报告
                </h5>
                {duplicateResult.existingReports.map((report) => (
                  <div key={report.id} className="rounded-lg border border-[#1B3A5C]/10 bg-[#F8FAFB] p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[#1B3A5C]">{report.equipmentId}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            report.boundaryStatus === 'normal' ? 'bg-[#2D9B83]/10 text-[#2D9B83]' : report.boundaryStatus === 'critical' ? 'bg-[#E8A838]/10 text-[#E8A838]' : 'bg-[#C44D3F]/10 text-[#C44D3F]'
                          }`}>
                            {BOUNDARY_STATUS_LABELS[report.boundaryStatus]}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            report.status === 'processed' ? 'bg-[#2D9B83]/10 text-[#2D9B83]' : report.status === 'pending_material' ? 'bg-[#E8A838]/10 text-[#E8A838]' : 'bg-[#C44D3F]/10 text-[#C44D3F]'
                          }`}>
                            {REPORT_STATUS_LABELS[report.status]}
                          </span>
                        </div>
                        <p className="text-xs text-[#5A7A9A]">
                          张力值：<span className="font-mono font-bold">{report.tensionValue.toFixed(2)} kN</span>
                        </p>
                        <p className="text-[10px] text-[#8BA3BF]">
                          录入时间：{new Date(report.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteReport(report.id)}
                        className="rounded-lg p-2 text-[#8BA3BF] transition-colors hover:bg-[#C44D3F]/10 hover:text-[#C44D3F]"
                        title="删除此报告"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#2D9B83]/20 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2D9B83]/10">
                  <ShieldCheck className="h-5 w-5 text-[#2D9B83]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2D9B83]">设备编号无重复</h4>
                  <p className="text-xs text-[#5A7A9A]">
                    设备 <span className="font-mono font-bold">{searchId}</span> 尚无历史报告，可直接录入
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-[#1B3A5C]/10 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8BA3BF]">
          <History className="h-3.5 w-3.5" />
          全部报告记录
        </h3>
        {reports.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#8BA3BF]">暂无报告记录</p>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between rounded-lg border border-[#1B3A5C]/5 bg-[#F8FAFB] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#1B3A5C]">{report.equipmentId}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    report.boundaryStatus === 'normal' ? 'bg-[#2D9B83]/10 text-[#2D9B83]' : report.boundaryStatus === 'critical' ? 'bg-[#E8A838]/10 text-[#E8A838]' : 'bg-[#C44D3F]/10 text-[#C44D3F]'
                  }`}>
                    {BOUNDARY_STATUS_LABELS[report.boundaryStatus]}
                  </span>
                  <span className="font-mono text-xs text-[#5A7A9A]">{report.tensionValue.toFixed(2)} kN</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#8BA3BF]">{new Date(report.createdAt).toLocaleString('zh-CN')}</span>
                  <button
                    onClick={() => deleteReport(report.id)}
                    className="rounded p-1 text-[#8BA3BF] transition-colors hover:bg-[#C44D3F]/10 hover:text-[#C44D3F]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
