import { useOceanStore } from "@/store/useOceanStore"
import { Upload, GitMerge, Trash2, AlertTriangle } from "lucide-react"

export default function DedupPanel() {
  const { duplicateReports, tidalRecords, simulateReimport, mergeDuplicate, discardDuplicate } =
    useOceanStore()

  const getRecord = (id: string) => tidalRecords.find((r) => r.id === id)

  const pendingReports = duplicateReports.filter((d) => d.status === "pending")
  const processedReports = duplicateReports.filter((d) => d.status !== "pending")

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-serif text-sm text-ocean-ink">重导入去重</h3>
        <button
          className="text-xs bg-ocean-deep text-white px-3 py-1.5 rounded-full hover:bg-ocean-mid transition-colors flex items-center gap-1.5"
          onClick={simulateReimport}
        >
          <Upload size={12} />
          模拟重导入
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {pendingReports.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-ocean-coral flex items-center gap-1.5">
              <AlertTriangle size={12} />
              待处理重复 ({pendingReports.length})
            </div>
            {pendingReports.map((dup) => {
              const original = getRecord(dup.originalRecordId)
              const duplicate = getRecord(dup.duplicateRecordId)

              return (
                <div
                  key={dup.id}
                  className="p-3 border border-ocean-coral/20 rounded-lg bg-ocean-coral/5"
                >
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-xs">
                      <div className="text-gray-400 mb-1">原始记录</div>
                      <div className="font-mono text-gray-700">
                        {original?.timestamp.slice(11, 16) ?? "—"} |{" "}
                        {original?.tideLevel?.toFixed(1) ?? "空"}m
                      </div>
                      <div className="text-gray-400 mt-0.5">
                        来源: {original?.source === "manual" ? "手动" : "导入"}
                      </div>
                    </div>
                    <div className="text-xs">
                      <div className="text-gray-400 mb-1">重复记录</div>
                      <div className="font-mono text-ocean-coral">
                        {duplicate?.timestamp.slice(11, 16) ?? "—"} |{" "}
                        {duplicate?.tideLevel?.toFixed(1) ?? "空"}m
                      </div>
                      <div className="text-gray-400 mt-0.5">
                        来源: {duplicate?.source === "import" ? "导入" : "补录"}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="text-[11px] bg-ocean-light/15 text-ocean-mid px-3 py-1 rounded-full hover:bg-ocean-light/25 transition-colors inline-flex items-center gap-1"
                      onClick={() => mergeDuplicate(dup.id)}
                    >
                      <GitMerge size={10} />
                      合并
                    </button>
                    <button
                      className="text-[11px] bg-ocean-coral/15 text-ocean-coral px-3 py-1 rounded-full hover:bg-ocean-coral/25 transition-colors inline-flex items-center gap-1"
                      onClick={() => discardDuplicate(dup.id)}
                    >
                      <Trash2 size={10} />
                      丢弃重复
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {processedReports.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-ocean-green">已处理</div>
            {processedReports.map((dup) => (
              <div
                key={dup.id}
                className="p-2.5 border border-gray-100 rounded-lg bg-gray-50 text-xs text-gray-500 flex items-center gap-2"
              >
                {dup.status === "merged" ? (
                  <GitMerge size={12} className="text-ocean-light" />
                ) : (
                  <Trash2 size={12} className="text-gray-400" />
                )}
                <span>
                  {dup.status === "merged" ? "已合并" : "已丢弃"} — 重复记录
                </span>
              </div>
            ))}
          </div>
        )}

        {duplicateReports.length === 0 && (
          <div className="text-center py-6 text-sm text-gray-400">
            暂无重复记录，可点击"模拟重导入"测试去重功能
          </div>
        )}
      </div>
    </div>
  )
}
