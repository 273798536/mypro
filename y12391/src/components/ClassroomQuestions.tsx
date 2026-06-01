import { useState, useCallback, useEffect } from "react"
import { useEnvelopeStore } from "@/store"
import type { EnvelopeParams } from "@/types"
import { PARAM_LIMITS } from "@/types"
import { ChevronDown, ChevronRight, Trash2, Plus, BookOpen } from "lucide-react"

interface ClassroomQuestionsProps {
  onImpact?: (affectedVersionIds: string[]) => void
}

const PARAM_COLORS: Record<keyof EnvelopeParams, string> = {
  attack: "bg-blue-500/30 text-blue-300 border-blue-500/50",
  decay: "bg-purple-500/30 text-purple-300 border-purple-500/50",
  sustain: "bg-green-500/30 text-green-300 border-green-500/50",
  release: "bg-orange-500/30 text-orange-300 border-orange-500/50",
}

const PARAM_KEYS = Object.keys(PARAM_LIMITS) as (keyof EnvelopeParams)[]

export default function ClassroomQuestions({ onImpact }: ClassroomQuestionsProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [newContent, setNewContent] = useState("")
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([])
  const [selectedParamKeys, setSelectedParamKeys] = useState<(keyof EnvelopeParams)[]>([])
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const questions = useEnvelopeStore((s) => s.questions)
  const versions = useEnvelopeStore((s) => s.versions)
  const anomalies = useEnvelopeStore((s) => s.anomalies)
  const currentVersionId = useEnvelopeStore((s) => s.currentVersionId)
  const addQuestion = useEnvelopeStore((s) => s.addQuestion)
  const deleteQuestion = useEnvelopeStore((s) => s.deleteQuestion)

  const handleSubmit = useCallback(() => {
    if (!newContent.trim()) return
    addQuestion(newContent.trim(), selectedVersionIds, selectedParamKeys, [])
    if (onImpact) onImpact(selectedVersionIds)
    setNewContent("")
    setSelectedVersionIds([])
    setSelectedParamKeys([])
    setHighlightedId(Date.now().toString())
  }, [newContent, selectedVersionIds, selectedParamKeys, addQuestion, onImpact])

  useEffect(() => {
    if (!highlightedId) return
    const timer = setTimeout(() => setHighlightedId(null), 1500)
    return () => clearTimeout(timer)
  }, [highlightedId])

  const toggleVersion = (id: string) =>
    setSelectedVersionIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    )

  const toggleParam = (key: keyof EnvelopeParams) =>
    setSelectedParamKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )

  const lastQuestion = questions[questions.length - 1]

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700/50 overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-gray-400" />
          <span className="font-medium text-gray-200">课堂题目</span>
          {questions.length > 0 && (
            <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">
              {questions.length}
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronRight size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          collapsed ? "max-h-0" : "max-h-[2000px]"
        }`}
      >
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="输入题目内容..."
              className="w-full bg-gray-900/50 border border-gray-600/50 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
            <div>
              <span className="text-xs text-gray-400">关联版本:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => toggleVersion(v.id)}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                      selectedVersionIds.includes(v.id)
                        ? "bg-blue-500/30 text-blue-300 border-blue-500/50"
                        : "bg-gray-700/30 text-gray-400 border-gray-600/30 hover:border-gray-500/50"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-400">关联参数:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {PARAM_KEYS.map((key) => (
                  <label
                    key={key}
                    className={`text-xs px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                      selectedParamKeys.includes(key)
                        ? PARAM_COLORS[key]
                        : "bg-gray-700/30 text-gray-400 border-gray-600/30 hover:border-gray-500/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedParamKeys.includes(key)}
                      onChange={() => toggleParam(key)}
                      className="hidden"
                    />
                    {PARAM_LIMITS[key].label}
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!newContent.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition-colors"
            >
              <Plus size={14} />
              添加
            </button>
          </div>

          {questions.map((q) => {
            const isCurrent = q.affectedVersionIds.includes(currentVersionId || "")
            const isLatest = q.id === lastQuestion?.id && highlightedId
            return (
              <div
                key={q.id}
                className={`p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 transition-all duration-500 ${
                  isCurrent ? "border-l-2 border-l-[#4488ff]" : ""
                } ${isLatest ? "ring-1 ring-blue-400/50 bg-blue-900/20" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 break-words">{q.content}</p>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {new Date(q.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {q.affectedVersionIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {q.affectedVersionIds.map((vid) => {
                      const v = versions.find((ver) => ver.id === vid)
                      return v ? (
                        <span
                          key={vid}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-300"
                        >
                          {v.label}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
                {q.affectedParamKeys.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {q.affectedParamKeys.map((key) => (
                      <span
                        key={key}
                        className={`text-xs px-1.5 py-0.5 rounded border ${PARAM_COLORS[key]}`}
                      >
                        {PARAM_LIMITS[key].label}
                      </span>
                    ))}
                  </div>
                )}
                {q.affectedAnomalyIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {q.affectedAnomalyIds.map((aid) => {
                      const a = anomalies.find((an) => an.id === aid)
                      return a ? (
                        <span
                          key={aid}
                          className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        >
                          {a.description.slice(0, 20)}…
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
