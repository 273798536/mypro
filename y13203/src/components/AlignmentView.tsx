import { useStore } from "@/store";
import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

export default function AlignmentView() {
  const { alignmentItems } = useStore();

  const alignedCount = alignmentItems.filter((i) => i.alignmentStatus === "aligned").length;
  const offsetCount = alignmentItems.filter((i) => i.alignmentStatus === "offset").length;

  return (
    <div className="bg-surface-800 rounded-lg border border-surface-600">
      <div className="px-4 py-3 border-b border-surface-600 flex items-center justify-between">
        <h3 className="font-mono text-sm font-semibold text-zinc-100">对齐校验</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald">
            <CheckCircle className="w-3 h-3" />
            {alignedCount} 对齐
          </span>
          <span className="flex items-center gap-1 text-danger">
            <AlertCircle className="w-3 h-3" />
            {offsetCount} 偏移
          </span>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="grid grid-cols-[1fr_24px_1fr_24px_1fr] gap-x-2 items-start mb-2">
          <span className="text-xs text-zinc-500 font-mono text-center">音频文件</span>
          <span />
          <span className="text-xs text-zinc-500 font-mono text-center">曲目表</span>
          <span />
          <span className="text-xs text-zinc-500 font-mono text-center">最后清单</span>
        </div>

        <div className="space-y-2">
          {alignmentItems.map((item) => (
            <div
              key={item.id}
              className={`grid grid-cols-[1fr_24px_1fr_24px_1fr] gap-x-2 items-center p-2 rounded ${
                item.alignmentStatus === "offset" ? "bg-danger/5 border border-danger/20" : "bg-surface-700/30"
              }`}
            >
              <div className="text-xs text-zinc-300 font-mono truncate" title={item.fileName}>
                {item.fileName}
              </div>
              <ArrowRight className="w-3 h-3 text-surface-500 mx-auto" />
              <div className="text-xs text-zinc-300 truncate" title={item.trackName}>
                {item.trackName}
              </div>
              <ArrowRight className="w-3 h-3 text-surface-500 mx-auto" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-300 truncate" title={item.checklistEntry}>
                  {item.checklistEntry}
                </span>
                {item.alignmentStatus === "offset" ? (
                  <AlertCircle className="w-3 h-3 text-danger flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-3 h-3 text-emerald flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>

        {offsetCount > 0 && (
          <div className="mt-3 bg-amber/5 border border-amber/20 rounded p-3">
            <p className="text-xs text-amber mb-1">偏移项目</p>
            {alignmentItems
              .filter((i) => i.alignmentStatus === "offset")
              .map((item) => (
                <div key={item.id} className="mb-1">
                  <span className="text-xs text-zinc-300 font-mono">{item.fileName}</span>
                  <span className="text-xs text-zinc-500"> — {item.note}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
