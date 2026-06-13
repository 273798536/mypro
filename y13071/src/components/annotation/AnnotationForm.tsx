import { useState } from "react";
import { Send, AlertCircle } from "lucide-react";
import { useAnnotationStore } from "@/stores/annotationStore";
import { useFilterStore } from "@/stores/filterStore";
import { usePlaybackStore } from "@/stores/playbackStore";
import { cablewayObjects } from "@/utils/mockData";
import { useMixedUnitDetection } from "@/hooks/useMixedUnitDetection";

export function AnnotationForm() {
  const [content, setContent] = useState("");
  const [objectId, setObjectId] = useState<string>("");
  const addAnnotation = useAnnotationStore((s) => s.addAnnotation);
  const selectedObjectId = useFilterStore((s) => s.selectedObjectId);
  const currentTimestamp = usePlaybackStore((s) => s.currentTimestamp);
  const mixed = useMixedUnitDetection(content);

  const handleSubmit = () => {
    if (!content.trim()) return;
    const targetId = objectId || selectedObjectId || cablewayObjects[0].id;
    addAnnotation({
      objectId: targetId,
      timestamp: currentTimestamp,
      content: content.trim(),
      author: "阿乔",
    });
    setContent("");
  };

  return (
    <div className="space-y-2">
      <div>
        <div className="text-[10px] text-silver-400 font-mono mb-1 tracking-wider">
          关联对象
        </div>
        <select
          value={objectId || selectedObjectId || ""}
          onChange={(e) => setObjectId(e.target.value)}
          className="w-full bg-mine-900/70 border border-mine-600 rounded px-2.5 py-1.5 text-[12px] font-mono text-silver-200 focus:border-cable-500/60 focus:outline-none"
        >
          {cablewayObjects.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} · {o.floor}/{o.unit}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="text-[10px] text-silver-400 font-mono mb-1 tracking-wider">
          批注内容
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="请输入评审批注，如'第3层3F支架振动超限'"
          rows={3}
          className="w-full bg-mine-900/70 border border-mine-600 rounded px-2.5 py-2 text-[12px] font-mono text-silver-200 placeholder:text-silver-400/60 focus:border-cable-500/60 focus:outline-none resize-none"
        />
        {mixed.hasMixed && (
          <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 rounded bg-cable-500/10 border border-cable-500/30 text-[11px] text-cable-300 font-mono animate-float-up">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              检测到楼层/单位混写：同时出现 "
              <span className="text-cable-400 font-semibold">{mixed.matchedFloor}</span>" 与 "
              <span className="text-cable-400 font-semibold">{mixed.matchedUnit}</span>
              "，请确认表述统一。
            </span>
          </div>
        )}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!content.trim()}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-cable-500/20 border border-cable-500/50 text-cable-300 hover:bg-cable-500/30 shadow-glow-cable transition disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-mono"
      >
        <Send className="w-3.5 h-3.5" />
        提交批注
      </button>
    </div>
  );
}
