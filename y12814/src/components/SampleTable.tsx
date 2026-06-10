import { useTiterStore } from "@/store"
import { Sample } from "@/types"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import StatusBadge from "./StatusBadge"

export default function SampleTable() {
  const { currentBatch, getSamplesByBatch, selectSample, selectedSampleId } =
    useTiterStore()
  const samples = getSamplesByBatch(currentBatch)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
    selectSample(id)
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--color-slate-card)",
        border: "1px solid var(--color-slate-border)",
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between">
        <h3 className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
          样本清单
        </h3>
        <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
          {samples.length} 条记录
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr
              className="text-left"
              style={{
                background: "var(--color-indigo-deep)",
                color: "var(--color-text-muted)",
              }}
            >
              <th className="px-5 py-2.5 font-medium">样本ID</th>
              <th className="px-5 py-2.5 font-medium">物种名</th>
              <th className="px-5 py-2.5 font-medium">标准名</th>
              <th className="px-5 py-2.5 font-medium">滴度值</th>
              <th className="px-5 py-2.5 font-medium">状态</th>
              <th className="px-5 py-2.5 font-medium w-8"></th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample, idx) => (
              <SampleRow
                key={sample.id}
                sample={sample}
                isOdd={idx % 2 === 1}
                isExpanded={expandedId === sample.id}
                isSelected={selectedSampleId === sample.id}
                onToggle={() => toggleExpand(sample.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SampleRow({
  sample,
  isOdd,
  isExpanded,
  isSelected,
  onToggle,
}: {
  sample: Sample
  isOdd: boolean
  isExpanded: boolean
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr
        className="cursor-pointer transition-colors"
        style={{
          background: isSelected
            ? "var(--color-indigo-mid)"
            : isOdd
            ? "rgba(30,41,59,0.5)"
            : "transparent",
        }}
        onClick={onToggle}
      >
        <td className="px-5 py-3 font-mono font-medium" style={{ color: "var(--color-text-primary)" }}>
          {sample.id}
        </td>
        <td className="px-5 py-3" style={{ color: sample.isSynonym ? "var(--color-amber-pending)" : "var(--color-text-primary)" }}>
          {sample.speciesName}
          {sample.isSynonym && (
            <span className="ml-2 text-xs" style={{ color: "var(--color-amber-pending)" }}>
              (同义名)
            </span>
          )}
          {sample.isContaminated && (
            <span className="ml-2 text-xs" style={{ color: "var(--color-red-bad)" }}>
              (非预期物种)
            </span>
          )}
        </td>
        <td className="px-5 py-3 font-mono" style={{ color: "var(--color-text-muted)" }}>
          {sample.standardName || "—"}
        </td>
        <td className="px-5 py-3 font-mono" style={{ color: "var(--color-text-primary)" }}>
          1:{sample.titerValue}
        </td>
        <td className="px-5 py-3">
          <StatusBadge status={sample.status} />
        </td>
        <td className="px-5 py-3">
          {isExpanded ? (
            <ChevronUp size={14} style={{ color: "var(--color-text-muted)" }} />
          ) : (
            <ChevronDown size={14} style={{ color: "var(--color-text-muted)" }} />
          )}
        </td>
      </tr>
      {isExpanded && sample.blockReason && (
        <tr>
          <td colSpan={6} className="px-5 py-3" style={{ background: "var(--color-indigo-mid)" }}>
            <div
              className="rounded-md p-3 text-xs"
              style={{
                background:
                  sample.status === "bad"
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(251,191,36,0.08)",
                border: `1px solid ${
                  sample.status === "bad"
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(251,191,36,0.2)"
                }`,
              }}
            >
              <p className="font-medium mb-1" style={{ color: "var(--color-amber-accent)" }}>
                拦截详情
              </p>
              <p style={{ color: "var(--color-text-secondary)" }}>
                {sample.blockReason}
              </p>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
