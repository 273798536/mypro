import { useTiterStore } from "@/store"
import { SYNONYM_RULES } from "@/types"
import { ArrowRight, BookOpen } from "lucide-react"

export default function SynonymCard() {
  const { currentBatch, getSynonymSamples } = useTiterStore()
  const synonymSamples = getSynonymSamples(currentBatch)

  if (synonymSamples.length === 0) return null

  return (
    <div
      className="rounded-lg p-5 glow-amber"
      style={{
        background: "var(--color-slate-card)",
        border: "1px solid rgba(232,168,56,0.3)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={16} style={{ color: "var(--color-amber-accent)" }} />
        <h3 className="text-sm font-medium" style={{ color: "var(--color-amber-accent)" }}>
          物种名同义提示
        </h3>
      </div>

      <div className="space-y-3">
        {synonymSamples.map((sample) => (
          <div
            key={sample.id}
            className="rounded-md p-3"
            style={{
              background: "rgba(251,191,36,0.06)",
              border: "1px solid rgba(251,191,36,0.15)",
            }}
          >
            <div className="flex items-center gap-2 text-xs mb-2">
              <span className="font-mono font-medium" style={{ color: "var(--color-text-primary)" }}>
                {sample.id}
              </span>
              <ArrowRight size={12} style={{ color: "var(--color-text-muted)" }} />
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{
                  background: "rgba(251,191,36,0.15)",
                  color: "var(--color-amber-pending)",
                }}
              >
                待确认
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="font-mono" style={{ color: "var(--color-amber-pending)" }}>
                {sample.speciesName}
              </span>
              <ArrowRight size={14} style={{ color: "var(--color-text-muted)" }} />
              <span className="font-mono" style={{ color: "var(--color-emerald-pass)" }}>
                {sample.standardName}
              </span>
            </div>

            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {sample.speciesName} 是 {sample.standardName} 的同义名（亚种名）。
              根据同义词表规则，录入时使用了非标准物种名，需确认该样本物种是否与标准名一致。
              确认后将自动归并到标准名下。
            </p>
          </div>
        ))}
      </div>

      <div
        className="mt-4 pt-3 border-t text-xs"
        style={{ borderColor: "rgba(232,168,56,0.2)", color: "var(--color-text-muted)" }}
      >
        <p className="font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
          同义词表参考
        </p>
        {SYNONYM_RULES.map((rule) => (
          <div key={rule.standardName} className="mb-1.5">
            <span className="font-mono" style={{ color: "var(--color-emerald-pass)" }}>
              {rule.standardName}
            </span>
            <span className="mx-1.5">←</span>
            <span className="font-mono" style={{ color: "var(--color-text-muted)" }}>
              [{rule.synonyms.join(", ")}]
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
