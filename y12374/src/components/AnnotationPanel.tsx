import { useState } from "react";
import { MessageSquare, Send, User } from "lucide-react";
import { useStore } from "@/store";
import type { Annotation } from "@/types";

interface AnnotationPanelProps {
  caseId: string;
  annotations: Annotation[];
}

export default function AnnotationPanel({ caseId, annotations }: AnnotationPanelProps) {
  const addAnnotation = useStore((s) => s.addAnnotation);
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("老师");
  const [clue, setClue] = useState("老师批注");

  const handleSubmit = () => {
    if (!content.trim()) return;
    addAnnotation(caseId, content.trim(), author.trim() || "老师", clue.trim() || "老师批注");
    setContent("");
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <h3 className="text-sm font-medium text-[#1B2A4A] mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-[#D4A843]" />
        批注
      </h3>
      <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
        {annotations.length === 0 && (
          <p className="text-xs text-zinc-400">暂无批注</p>
        )}
        {annotations.map((ann) => (
          <div key={ann.id} className="bg-zinc-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center gap-1 text-xs font-medium text-[#1B2A4A]">
                <User className="w-3 h-3" />
                {ann.author}
              </span>
              <span className="text-xs text-zinc-400">{formatDate(ann.createdAt)}</span>
              <span className="text-xs text-zinc-400 ml-auto">线索：{ann.linkedClue}</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">{ann.content}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-100 pt-3">
        <div className="flex gap-2 mb-2">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="署名"
            className="w-20 px-2 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:border-[#D4A843]"
          />
          <input
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            placeholder="关联线索"
            className="w-24 px-2 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:border-[#D4A843]"
          />
        </div>
        <div className="flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="输入批注内容…"
            className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:border-[#D4A843]"
          />
          <button
            onClick={handleSubmit}
            className="shrink-0 px-3 py-1.5 bg-[#1B2A4A] text-white text-xs rounded-md hover:bg-[#2a3d5e] transition-colors flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
