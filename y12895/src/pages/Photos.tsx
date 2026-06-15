import { useState } from "react"
import { Camera, Search, FileText, ExternalLink, Hash, X, ArrowLeft } from "lucide-react"
import { useStore } from "@/store/useStore"
import type { InspectionPhoto } from "@/types"

export default function Photos() {
  const { photos, selectedBatchId } = useStore()
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<InspectionPhoto | null>(null)

  const filtered = photos
    .filter((p) => p.batchId === selectedBatchId)
    .filter((p) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        String(p.originalLineNo).includes(q) ||
        p.imageName.toLowerCase().includes(q)
      )
    })

  return (
    <div className="p-6 space-y-6">
      <div className="section-title">
        <Camera className="w-5 h-5 text-ice" />
        巡检照片
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          className="input-field w-full pl-9"
          placeholder="按行号或图片名搜索…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Camera className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">暂无匹配的巡检照片</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((photo) => (
            <div
              key={photo.id}
              className="card-dark-hover cursor-pointer p-0 overflow-hidden"
              onClick={() => setSelected(photo)}
            >
              <div className="relative">
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.imageName}
                  className="w-full h-40 object-cover rounded-t-lg"
                  loading="lazy"
                />
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-ocean-950/80 text-amber border border-amber/30 backdrop-blur-sm">
                  <Hash className="w-3 h-3" />
                  行号 #{photo.originalLineNo}
                </span>
              </div>

              <div className="p-4 space-y-2">
                <p className="data-mono text-sm truncate" title={photo.imageName}>
                  {photo.imageName}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {photo.sourceRemark}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {photo.sourceTable}
                  </span>
                  <span className="flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    {photo.sourceRecordId}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ocean-950/70 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="card-dark w-full max-w-lg p-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={selected.thumbnailUrl}
                alt={selected.imageName}
                className="w-full h-56 object-cover"
              />
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold bg-ocean-950/80 text-amber border border-amber/30 backdrop-blur-sm">
                <Hash className="w-4 h-4" />
                行号 #{selected.originalLineNo}
              </span>
              <button
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-ocean-950/60 text-slate-300 hover:text-white backdrop-blur-sm transition-colors"
                onClick={() => setSelected(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="data-mono text-base mb-1">{selected.imageName}</p>
                <p className="text-sm text-slate-400">{selected.sourceRemark}</p>
              </div>

              <div className="space-y-2.5">
                <InfoRow label="原始行号" value={`#${selected.originalLineNo}`} />
                <InfoRow label="来源表" value={selected.sourceTable} />
                <InfoRow label="来源记录号" value={selected.sourceRecordId} icon />
                <InfoRow label="来源备注" value={selected.sourceRemark} />
              </div>

              <button className="btn-secondary w-full flex items-center justify-center gap-2 mt-2">
                <ArrowLeft className="w-4 h-4" />
                返回原始记录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-slate-500 w-20 shrink-0">{label}</span>
      <span className="data-mono text-slate-200 flex items-center gap-1.5">
        {icon && <FileText className="w-3.5 h-3.5 text-slate-500" />}
        {value}
      </span>
    </div>
  )
}
