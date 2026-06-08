import { useEffect, useState } from "react"
import {
  X,
  AlertTriangle,
  Play,
  CheckCircle2,
  ArrowRightLeft,
  RefreshCw,
} from "lucide-react"
import type { CrackParams, LengthUnit, WidthUnit, DepthUnit } from "@/types"
import { useAppStore } from "@/store/app"
import { toMm, cn } from "@/lib/utils"
import { StatusTag } from "@/components/ui/StatusTag"

interface Props {
  open: boolean
  onClose: () => void
  crack: CrackParams
}

interface FieldDef {
  key: keyof CrackParams
  label: string
  type: "number" | "text" | "select" | "datetime"
  options?: string[]
}

const FIELDS: FieldDef[] = [
  { key: "collectionTime", label: "采集时间", type: "datetime" },
  { key: "processTime", label: "处理时间", type: "datetime" },
  { key: "lengthValue", label: "长度数值", type: "number" },
  { key: "lengthUnit", label: "长度单位", type: "select", options: ["mm", "cm", "m"] },
  { key: "widthValue", label: "宽度数值", type: "number" },
  { key: "widthUnit", label: "宽度单位", type: "select", options: ["mm", "cm"] },
  { key: "depthValue", label: "深度数值", type: "number" },
  { key: "depthUnit", label: "深度单位", type: "select", options: ["mm", "cm"] },
]

export function CorrectionModal({ open, onClose, crack }: Props) {
  const { currentTask, updateParam, recalculateCollision, currentUser } = useAppStore()
  const [selectedField, setSelectedField] = useState<keyof CrackParams>("lengthUnit")
  const [newValue, setNewValue] = useState<string>("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [recalcResult, setRecalcResult] = useState<any>(null)
  const [recalculating, setRecalculating] = useState(false)
  const [savedField, setSavedField] = useState<keyof CrackParams | null>(null)

  useEffect(() => {
    if (open) {
      setSelectedField("lengthUnit")
      setNewValue(String(crack.lengthUnit))
      setReason("")
      setRecalcResult(null)
      setSavedField(null)
    }
  }, [open, crack])

  useEffect(() => {
    const def = FIELDS.find((f) => f.key === selectedField)
    if (def) {
      setNewValue(String(crack[selectedField] ?? ""))
    }
  }, [selectedField, crack])

  if (!open || !currentTask) return null

  const oldVal = String(crack[selectedField] ?? "")
  const def = FIELDS.find((f) => f.key === selectedField)!
  const isUnitField = String(selectedField).endsWith("Unit")
  const isValueField = String(selectedField).endsWith("Value")

  const oldMm = isValueField
    ? toMm(
        crack[selectedField] as number,
        crack[
          (String(selectedField).replace("Value", "Unit") as unknown) as
            | "lengthUnit"
            | "widthUnit"
            | "depthUnit"
        ] as LengthUnit | WidthUnit | DepthUnit,
      )
    : null
  const newMm = isValueField
    ? toMm(
        parseFloat(newValue) || 0,
        crack[
          (String(selectedField).replace("Value", "Unit") as unknown) as
            | "lengthUnit"
            | "widthUnit"
            | "depthUnit"
        ] as LengthUnit | WidthUnit | DepthUnit,
      )
    : isUnitField
      ? toMm(
          crack[
            (String(selectedField).replace("Unit", "Value") as unknown) as
              | "lengthValue"
              | "widthValue"
              | "depthValue"
          ] as number,
          (newValue as unknown) as LengthUnit | WidthUnit | DepthUnit,
        )
      : null

  const mmAbnormal =
    isUnitField &&
    Math.abs(
      toMm(
        crack[
          (String(selectedField).replace("Unit", "Value") as unknown) as
            | "lengthValue"
            | "widthValue"
            | "depthValue"
        ] as number,
        (newValue as unknown) as LengthUnit | WidthUnit | DepthUnit,
      ) -
        toMm(
          crack[
            (String(selectedField).replace("Unit", "Value") as unknown) as
              | "lengthValue"
              | "widthValue"
              | "depthValue"
          ] as number,
          (oldVal as unknown) as LengthUnit | WidthUnit | DepthUnit,
        ),
    ) > 100

  async function handleSubmit() {
    if (!reason.trim()) return
    if (oldVal === newValue) return
    setSubmitting(true)
    try {
      await updateParam(currentTask.id, {
        fieldName: selectedField as string,
        oldValue: oldVal,
        newValue,
        operator: currentUser,
        reason: reason.trim(),
        crackId: crack.crackId,
      })
      setSavedField(selectedField)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRecalc() {
    setRecalculating(true)
    try {
      const results = await recalculateCollision(currentTask.id, crack.crackId)
      setRecalcResult(results?.[0])
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="eng-panel w-[720px] max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-eng-border bg-eng-card/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-eng-warn flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-eng-warn" />
            </div>
            <div>
              <div className="font-mono text-sm text-eng-text font-semibold">
                参数修正 · 裂缝 {crack.crackId}
              </div>
              <div className="text-[10px] text-eng-muted font-mono uppercase tracking-wider">
                PARAMETER CORRECTION · {currentTask.taskNo}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border border-eng-border text-eng-dim hover:text-eng-text hover:border-eng-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          <div>
            <div className="eng-label">选择待修正字段</div>
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSelectedField(f.key)}
                  className={cn(
                    "text-left px-3 py-2 border text-sm transition-all",
                    selectedField === f.key
                      ? "border-eng-primary bg-eng-primary/20 text-eng-text"
                      : "border-eng-border bg-eng-bg text-eng-dim hover:border-eng-muted hover:text-eng-text",
                  )}
                >
                  <div className="font-mono text-xs text-eng-muted uppercase tracking-wider mb-0.5">
                    {f.key}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{f.label}</span>
                    <span className="font-mono text-eng-dim text-xs">
                      {String(crack[f.key] || "—")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="eng-card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-eng-muted font-mono uppercase tracking-wider">
                  原值 · OLD
                </span>
                <StatusTag status="passed" />
              </div>
              <div className="font-mono text-lg text-eng-text">{oldVal || "—"}</div>
              {oldMm !== null && (
                <div className="text-xs text-eng-muted mt-1 font-mono">
                  = {oldMm.toFixed(1)} mm
                </div>
              )}
            </div>
            <div className={cn(
              "eng-card p-3",
              mmAbnormal && "border-eng-warn bg-eng-warn/5",
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-eng-muted font-mono uppercase tracking-wider">
                  新值 · NEW
                </span>
                {mmAbnormal && (
                  <span className="eng-tag border-eng-warn text-eng-warn bg-eng-warn/10 gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    变化显著
                  </span>
                )}
              </div>
              {def.type === "select" ? (
                <select
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="eng-input"
                >
                  {def.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={def.type}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="eng-input"
                />
              )}
              {newMm !== null && (
                <div className="text-xs text-eng-muted mt-1 font-mono">
                  = {newMm.toFixed(1)} mm
                  {mmAbnormal && (
                    <span className="text-eng-warn ml-2">
                      差 {(newMm - oldMm!).toFixed(1)} mm
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="eng-label">
              变更原因 <span className="text-eng-danger">*</span>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="例如：单位 mm 误记为 cm，材料清单与点云模型显示裂缝长度约 250mm 而非 250cm..."
              className="eng-input resize-none"
            />
            <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono">
              <span className="text-eng-muted">
                操作人：{currentUser} · {new Date().toLocaleString("zh-CN", { hour12: false })}
              </span>
              <span className={reason.trim() ? "text-eng-pass" : "text-eng-muted"}>
                {reason.length} 字符
              </span>
            </div>
          </div>

          <div className="eng-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-eng-text font-medium">碰撞检测重算</div>
                <div className="text-xs text-eng-muted mt-0.5">
                  保存修正后将自动重新判定碰撞检测结果
                </div>
              </div>
              <button
                onClick={handleRecalc}
                disabled={recalculating}
                className="eng-btn"
              >
                {recalculating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {recalculating ? "计算中..." : "立即重算"}
              </button>
            </div>
            {recalcResult && (
              <div className="mt-3 pt-3 border-t border-eng-border">
                <div className="flex items-center gap-2 text-sm">
                  {recalcResult.collision?.detected ? (
                    <span className="eng-tag border-eng-warn text-eng-warn bg-eng-warn/10 gap-1">
                      <AlertTriangle className="w-3 h-3" /> 检测到碰撞
                    </span>
                  ) : (
                    <span className="eng-tag border-eng-pass text-eng-pass bg-eng-pass/10 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 未检测到碰撞
                    </span>
                  )}
                  {recalcResult.collisionChanged && (
                    <span className="eng-tag border-eng-accent text-eng-accent bg-eng-accent/10">
                      判定发生变化
                    </span>
                  )}
                </div>
                <div className="text-xs text-eng-dim mt-1.5 font-mono">
                  {recalcResult.collision?.note}
                </div>
                <div className="text-xs text-eng-muted mt-1">
                  结论更新为：
                  <span className="text-eng-text ml-1">{recalcResult.conclusion}</span>
                </div>
              </div>
            )}
          </div>

          {savedField && (
            <div className="eng-card p-3 border-eng-pass bg-eng-pass/5 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-eng-pass" />
              <div className="text-sm text-eng-text">
                字段 <span className="font-mono text-eng-pass">{String(savedField)}</span>{" "}
                已保存，历史记录自动生成
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-eng-border bg-eng-card/60">
          <button onClick={onClose} className="eng-btn-ghost">
            关闭
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim() || oldVal === newValue}
            className="eng-btn"
          >
            {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
            保存修正并记录
          </button>
        </div>
      </div>
    </div>
  )
}
