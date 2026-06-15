import { useState } from "react"
import { useOceanStore } from "@/store/useOceanStore"
import { MessageSquarePlus, Check, Clock } from "lucide-react"

export default function ReviewNotes() {
  const { reviewNotes, qualityIssues, addReviewNote, approveReviewNote } = useOceanStore()
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState("")
  const [selectedIssues, setSelectedIssues] = useState<string[]>([])

  const pendingIssues = qualityIssues.filter((i) => i.status !== "resolved")

  const handleSubmit = () => {
    if (!content.trim()) return
    addReviewNote(content.trim(), selectedIssues)
    setContent("")
    setSelectedIssues([])
    setShowForm(false)
  }

  const toggleIssue = (id: string) => {
    setSelectedIssues((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-serif text-sm text-ocean-ink">复核备注</h3>
        <button
          className="text-xs text-ocean-light hover:text-ocean-mid px-3 py-1 rounded-full border border-ocean-light/30 hover:border-ocean-light transition-colors flex items-center gap-1.5"
          onClick={() => setShowForm(!showForm)}
        >
          <MessageSquarePlus size={12} />
          添加备注
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {showForm && (
          <div className="p-3 bg-ocean-surface rounded-lg space-y-3 animate-slide-up">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入复核备注..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-ocean-light resize-none h-20"
            />

            {pendingIssues.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1.5">关联问题</div>
                <div className="flex flex-wrap gap-1.5">
                  {pendingIssues.map((issue) => (
                    <button
                      key={issue.id}
                      className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                        selectedIssues.includes(issue.id)
                          ? "bg-ocean-light/15 border-ocean-light text-ocean-mid"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                      onClick={() => toggleIssue(issue.id)}
                    >
                      {issue.type === "null_value"
                        ? "空值"
                        : issue.type === "duplicate"
                        ? "重复"
                        : issue.type === "timezone_error"
                        ? "时区"
                        : "混写"}
                      : {issue.description.slice(0, 15)}...
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                className="text-xs text-gray-500 px-3 py-1.5 rounded-full hover:bg-gray-100"
                onClick={() => setShowForm(false)}
              >
                取消
              </button>
              <button
                className="text-xs bg-ocean-deep text-white px-4 py-1.5 rounded-full hover:bg-ocean-mid disabled:opacity-50"
                onClick={handleSubmit}
                disabled={!content.trim()}
              >
                提交
              </button>
            </div>
          </div>
        )}

        {reviewNotes.length === 0 && !showForm && (
          <div className="text-center py-6 text-sm text-gray-400">
            暂无复核备注
          </div>
        )}

        {reviewNotes.map((note) => (
          <div
            key={note.id}
            className="p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
              {note.status === "pending" ? (
                <button
                  className="shrink-0 text-[10px] bg-ocean-yellow text-ocean-yellowDark px-2 py-0.5 rounded-full hover:bg-ocean-yellow/80 transition-colors inline-flex items-center gap-0.5"
                  onClick={() => approveReviewNote(note.id)}
                >
                  <Clock size={9} />
                  待确认
                </button>
              ) : (
                <span className="shrink-0 text-[10px] bg-ocean-greenLight text-ocean-greenDark px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                  <Check size={9} />
                  已通过
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
              <Clock size={10} />
              {new Date(note.createdAt).toLocaleString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
