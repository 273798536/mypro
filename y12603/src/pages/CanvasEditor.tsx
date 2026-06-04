import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronRight, AlertTriangle, X } from "lucide-react"
import { useWorkshopStore } from "@/store/useWorkshopStore"
import { useDefectStore } from "@/store/useDefectStore"
import DefectCanvas from "@/components/DefectCanvas"
import ColorRuleSidebar from "@/components/ColorRuleSidebar"

export default function CanvasEditor() {
  const { workshopId } = useParams<{ workshopId: string }>()
  const navigate = useNavigate()

  const { currentWorkshop, fetchWorkshop } = useWorkshopStore()
  const { defects, colorRules, fetchDefects, fetchColorRules, createDefect, createColorRule, updateColorRule, deleteColorRule } =
    useDefectStore()

  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [showOffsetBanner, setShowOffsetBanner] = useState(false)
  const [descModal, setDescModal] = useState<{
    rect: { x: number; y: number; width: number; height: number }
    ruleId: string
  } | null>(null)
  const [descText, setDescText] = useState("")

  useEffect(() => {
    if (!workshopId) return
    fetchWorkshop(workshopId)
    fetchDefects(workshopId)
    fetchColorRules(workshopId)
  }, [workshopId, fetchWorkshop, fetchDefects, fetchColorRules])

  useEffect(() => {
    const hasOffset = defects.some((d) => d.coordinateOffset)
    setShowOffsetBanner(hasOffset)
  }, [defects])

  const handleCreateDefect = useCallback(
    (rect: { x: number; y: number; width: number; height: number }, ruleId: string) => {
      setDescModal({ rect, ruleId })
      setDescText("")
    },
    []
  )

  const handleSubmitDefect = async () => {
    if (!descModal || !workshopId) return
    const rule = colorRules.find((r) => r.id === descModal.ruleId)
    await createDefect(workshopId, {
      type: rule?.name ?? "未分类",
      colorRuleId: descModal.ruleId,
      posX: descModal.rect.x,
      posY: descModal.rect.y,
      width: descModal.rect.width,
      height: descModal.rect.height,
      description: descText,
    })
    setDescModal(null)
    setDescText("")
  }

  const handleToggleType = (type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col">
      {showOffsetBanner && (
        <div className="flex items-center gap-2 bg-yellow-600/90 px-4 py-1.5 text-xs text-white">
          <AlertTriangle size={13} />
          <span>部分缺陷存在坐标偏移，请以现场实际位置为准</span>
          <button onClick={() => setShowOffsetBanner(false)} className="ml-auto hover:opacity-80">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 border-b border-gray-200 bg-white px-4 py-2 text-xs text-gray-500">
        <button onClick={() => navigate("/")} className="hover:text-warn">
          图层管理
        </button>
        <ChevronRight size={12} />
        <span className="text-gray-700">{currentWorkshop?.name ?? "车间"}</span>
        <ChevronRight size={12} />
        <span className="font-medium text-gray-900">画布编辑</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ColorRuleSidebar
          colorRules={colorRules}
          defects={defects}
          workshopId={workshopId!}
          onAddRule={(_, data) => createColorRule(workshopId!, data)}
          onUpdateRule={(_, ruleId, data) => updateColorRule(workshopId!, ruleId, data)}
          onDeleteRule={(_, ruleId) => deleteColorRule(workshopId!, ruleId)}
          hiddenTypes={hiddenTypes}
          onToggleType={handleToggleType}
        />

        <div className="flex-1">
          <DefectCanvas
            defects={defects}
            colorRules={colorRules}
            onCreateDefect={handleCreateDefect}
            selectedDefectId={selectedDefectId}
            onSelectDefect={setSelectedDefectId}
            hiddenTypes={hiddenTypes}
          />
        </div>
      </div>

      {descModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-80 rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">新建缺陷</h3>
            <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
              <span>颜色规则：</span>
              {(() => {
                const rule = colorRules.find((r) => r.id === descModal.ruleId)
                return rule ? (
                  <>
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: rule.color }}
                    />
                    <span>{rule.name}</span>
                  </>
                ) : null
              })()}
            </div>
            <div className="mb-1 text-xs text-gray-500">位置：({Math.round(descModal.rect.x)}, {Math.round(descModal.rect.y)}) {Math.round(descModal.rect.width)}×{Math.round(descModal.rect.height)}</div>
            <textarea
              className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-warn"
              rows={3}
              placeholder="缺陷描述（可选）"
              value={descText}
              onChange={(e) => setDescText(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDescModal(null); setDescText("") }}
                className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSubmitDefect}
                className="rounded-md bg-warn px-4 py-1.5 text-xs text-white hover:bg-warn/90"
              >
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
