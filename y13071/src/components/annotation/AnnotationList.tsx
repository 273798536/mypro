import { Undo2, AlertTriangle, Clock, User } from "lucide-react";
import { useAnnotationStore } from "@/stores/annotationStore";
import { cablewayObjects } from "@/utils/mockData";
import type { Annotation } from "@/shared/types";

function fmt(d: number) {
  return new Date(d).toLocaleString("zh-CN", { hour12: false });
}
function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const objMap = new Map(cablewayObjects.map((o) => [o.id, o]));

export function AnnotationList() {
  const annotations = useAnnotationStore((s) => s.annotations);
  const revokeLast = useAnnotationStore((s) => s.revokeLast);
  const hasActive = annotations.some((a) => a.status === "ACTIVE");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-silver-400 font-mono tracking-wider">
          批注历史（含撤回）
        </div>
        <button
          onClick={() => revokeLast("阿乔")}
          disabled={!hasActive}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-revoke-500/40 text-revoke-400 hover:bg-revoke-500/10 hover:text-silver-200 disabled:opacity-40 disabled:cursor-not-allowed font-mono transition"
        >
          <Undo2 className="w-3 h-3" />
          撤回上一条
        </button>
      </div>
      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
        {annotations.length === 0 && (
          <div className="text-center text-silver-400 text-[11px] py-6 font-mono">
            暂无评审批注
          </div>
        )}
        {annotations.map((a: Annotation) => {
          const obj = objMap.get(a.objectId);
          const revoked = a.status === "REVOKED";
          return (
            <div
              key={a.id}
              className={`rounded border p-2.5 transition ${
                revoked
                  ? "bg-mine-900/40 border-mine-700/40"
                  : "bg-mine-800/40 border-mine-600/60"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    revoked
                      ? "bg-revoke-500/15 text-revoke-400"
                      : "bg-pass-500/15 text-pass-400"
                  }`}
                >
                  {revoked ? "已撤回" : "有效"}
                </span>
                <span className="text-[11px] text-silver-300 font-mono">
                  {obj?.name ?? a.objectId}
                </span>
                {a.mixedWarning && (
                  <span
                    className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-mono bg-cable-500/15 text-cable-400"
                    title="楼层/单位混写"
                  >
                    <AlertTriangle className="w-2.5 h-2.5" />
                    混写提示
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-[10px] text-silver-400 font-mono">
                  <Clock className="w-3 h-3" />
                  {fmtTime(a.timestamp)}
                </span>
              </div>
              <div
                className={`text-[12px] leading-relaxed font-mono ${
                  revoked ? "text-revoke-400 italic line-through" : "text-silver-200"
                }`}
              >
                {a.content}
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-silver-400 font-mono">
                <User className="w-2.5 h-2.5" />
                {a.author} · {fmt(a.createdAt)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
