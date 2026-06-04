import { useState } from "react"
import { Send } from "lucide-react"
import type { HandlingOpinion } from "@/types"

interface OpinionTimelineProps {
  opinions: HandlingOpinion[]
  onSubmit: (content: string, author: string) => void
}

export default function OpinionTimeline({ opinions, onSubmit }: OpinionTimelineProps) {
  const [content, setContent] = useState("")
  const [author, setAuthor] = useState("")

  const handleSubmit = () => {
    if (!content.trim() || !author.trim()) return
    onSubmit(content.trim(), author.trim())
    setContent("")
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-700">处理意见</h3>

      {opinions.length === 0 ? (
        <p className="text-sm text-gray-400">暂无处理意见</p>
      ) : (
        <div className="relative ml-3 border-l-2 border-gray-200 pl-4">
          {opinions.map((op) => (
            <div key={op.id} className="relative mb-4 last:mb-0">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-muted" />
              <p className="text-sm text-gray-700">{op.content}</p>
              <p className="mt-1 text-xs text-gray-400">
                {op.author} · {new Date(op.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="输入处理意见..."
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-warn focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="署名"
          className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-warn focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || !author.trim()}
          className="flex items-center gap-1 rounded bg-warn px-3 py-1.5 text-sm text-white disabled:opacity-40 hover:bg-warn/90 transition-colors"
        >
          <Send size={14} />
          提交
        </button>
      </div>
    </div>
  )
}
