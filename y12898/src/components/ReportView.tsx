import { useOceanStore } from "@/store/useOceanStore"
import { Shield, Droplets, Copy, AlertTriangle, CheckCircle2 } from "lucide-react"

export default function ReportView() {
  const { riskNotices, waterQualityRecords, duplicateReports, tidalRecords, corrections, qualityIssues } =
    useOceanStore()

  const resolvedIssues = qualityIssues.filter((i) => i.status === "resolved").length
  const totalIssues = qualityIssues.length
  const approvedCorrections = corrections.filter((c) => c.reviewStatus === "approved").length
  const totalCorrections = corrections.length
  const processedDuplicates = duplicateReports.filter((d) => d.status !== "pending").length
  const totalDuplicates = duplicateReports.length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-ocean-coral/20 overflow-hidden">
          <div className="px-4 py-2.5 bg-ocean-coral/5 border-b border-ocean-coral/10 flex items-center gap-2">
            <Shield size={14} className="text-ocean-coral" />
            <h4 className="text-xs font-medium text-ocean-coral">风险通报</h4>
            <span className="text-[10px] bg-ocean-coral/15 text-ocean-coral px-1.5 py-0.5 rounded-full ml-auto">
              {riskNotices.length}
            </span>
          </div>
          <div className="p-3 space-y-2">
            {riskNotices.map((notice) => (
              <div
                key={notice.id}
                className="p-2.5 rounded-lg border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      notice.level === "red"
                        ? "bg-red-500"
                        : notice.level === "orange"
                        ? "bg-ocean-coral"
                        : "bg-amber-400"
                    }`}
                  />
                  <span className="text-sm font-medium text-ocean-ink">
                    {notice.title}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {notice.description}
                </p>
                <div className="text-[10px] text-gray-400 mt-1.5">
                  {new Date(notice.timestamp).toLocaleString("zh-CN")}
                </div>
              </div>
            ))}
            {riskNotices.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">暂无风险通报</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-ocean-mid/20 overflow-hidden">
          <div className="px-4 py-2.5 bg-ocean-mid/5 border-b border-ocean-mid/10 flex items-center gap-2">
            <Droplets size={14} className="text-ocean-mid" />
            <h4 className="text-xs font-medium text-ocean-mid">水质记录</h4>
            <span className="text-[10px] bg-ocean-mid/15 text-ocean-mid px-1.5 py-0.5 rounded-full ml-auto">
              {waterQualityRecords.length}
            </span>
          </div>
          <div className="p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1.5 font-medium">时间</th>
                  <th className="text-right py-1.5 font-medium">溶氧</th>
                  <th className="text-right py-1.5 font-medium">盐度</th>
                  <th className="text-right py-1.5 font-medium">温度</th>
                </tr>
              </thead>
              <tbody>
                {waterQualityRecords.map((wq) => (
                  <tr key={wq.id} className="border-b border-gray-50">
                    <td className="py-1.5 font-mono">{wq.timestamp.slice(11, 16)}</td>
                    <td className="py-1.5 text-right">
                      <span className={wq.dissolvedOxygen !== null && wq.dissolvedOxygen < 6 ? "text-ocean-coral font-medium" : ""}>
                        {wq.dissolvedOxygen?.toFixed(1) ?? "—"}
                      </span>
                    </td>
                    <td className="py-1.5 text-right">{wq.salinity?.toFixed(1) ?? "—"}</td>
                    <td className="py-1.5 text-right">{wq.temperature?.toFixed(1) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-amber-300/20 overflow-hidden">
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200/50 flex items-center gap-2">
            <Copy size={14} className="text-amber-500" />
            <h4 className="text-xs font-medium text-amber-600">重复上报</h4>
            <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full ml-auto">
              {duplicateReports.length}
            </span>
          </div>
          <div className="p-3 space-y-2">
            {duplicateReports.map((dup) => (
              <div
                key={dup.id}
                className={`p-2.5 rounded-lg border text-xs ${
                  dup.status === "pending"
                    ? "border-amber-200 bg-amber-50/50"
                    : dup.status === "merged"
                    ? "border-ocean-green/20 bg-ocean-greenLight/30"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {dup.status === "pending" ? (
                    <AlertTriangle size={12} className="text-amber-500" />
                  ) : (
                    <CheckCircle2 size={12} className="text-ocean-green" />
                  )}
                  <span className="text-gray-700">
                    {dup.status === "pending"
                      ? "待处理"
                      : dup.status === "merged"
                      ? "已合并"
                      : "已丢弃"}
                  </span>
                </div>
                <div className="mt-1 text-gray-500">
                  原始: {dup.originalValue ?? "空"} → 重复: {dup.duplicateValue ?? "空"}
                </div>
              </div>
            ))}
            {duplicateReports.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">暂无重复上报</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h4 className="font-serif text-sm text-ocean-ink mb-3">汇总统计</h4>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-ocean-surface rounded-lg">
            <div className="text-2xl font-mono font-bold text-ocean-deep">
              {tidalRecords.length}
            </div>
            <div className="text-xs text-gray-400 mt-1">潮汐记录</div>
          </div>
          <div className="text-center p-3 bg-ocean-surface rounded-lg">
            <div className="text-2xl font-mono font-bold text-ocean-coral">
              {totalIssues > 0 ? `${resolvedIssues}/${totalIssues}` : "0"}
            </div>
            <div className="text-xs text-gray-400 mt-1">问题已解决</div>
          </div>
          <div className="text-center p-3 bg-ocean-surface rounded-lg">
            <div className="text-2xl font-mono font-bold text-amber-500">
              {totalCorrections > 0 ? `${approvedCorrections}/${totalCorrections}` : "0"}
            </div>
            <div className="text-xs text-gray-400 mt-1">修正已审核</div>
          </div>
          <div className="text-center p-3 bg-ocean-surface rounded-lg">
            <div className="text-2xl font-mono font-bold text-ocean-mid">
              {totalDuplicates > 0 ? `${processedDuplicates}/${totalDuplicates}` : "0"}
            </div>
            <div className="text-xs text-gray-400 mt-1">重复已处理</div>
          </div>
        </div>
      </div>
    </div>
  )
}
