import { AlertTriangle, Check, FileText, X } from "lucide-react";
import type { DedupStrategy, DuplicateCheckResult, SunlightDataset } from "@/types";

interface DuplicateDialogProps {
  checkResult: DuplicateCheckResult;
  candidate: Omit<SunlightDataset, "id" | "importedAt">;
  onClose: () => void;
  onConfirm: (strategy: DedupStrategy) => void;
}

export default function DuplicateDialog({
  checkResult,
  candidate,
  onClose,
  onConfirm,
}: DuplicateDialogProps) {
  const existing = checkResult.existingDataset;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-[640px] max-w-[92vw] p-6 animate-[float_0.35s_ease-out]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-alert-400/15 border border-alert-400/40 flex items-center justify-center text-alert-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="text-lg font-semibold">检测到重复导入</div>
              <div className="text-xs text-zinc-400 mt-1 font-mono-app">
                SHA-256: {candidate.contentHash.slice(0, 16)}…
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] font-mono-app text-zinc-400 mb-1">已有数据</div>
            {existing && (
              <>
                <div className="text-sm font-medium text-zinc-100 truncate">
                  {existing.fileName}
                </div>
                <div className="text-xs text-zinc-400 mt-2">
                  楼号：{existing.buildingName}
                </div>
                <div className="text-xs text-zinc-400">
                  来源：{existing.importSource}
                </div>
                <div className="text-[11px] text-zinc-500 font-mono-app mt-2">
                  导入于 {new Date(existing.importedAt).toLocaleString()}
                </div>
              </>
            )}
          </div>
          <div className="rounded-xl border border-lime-400/30 bg-lime-400/5 p-3">
            <div className="text-[11px] font-mono-app text-lime-400 mb-1">本次导入</div>
            <div className="text-sm font-medium text-zinc-100 truncate">
              {candidate.fileName}
            </div>
            <div className="text-xs text-zinc-400 mt-2">
              楼号：{candidate.buildingName}
            </div>
            <div className="text-xs text-zinc-400">
              来源：{candidate.importSource}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white/5 border border-white/10 p-3 mb-5">
          <div className="text-xs font-semibold text-zinc-300 mb-2">差异摘要</div>
          <ul className="text-xs text-zinc-400 space-y-1">
            {checkResult.diffSummary?.map((d, i) => (
              <li key={i} className="flex items-start gap-2">
                <FileText size={12} className="mt-0.5 text-cool-400 shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            onClick={() => onConfirm("skip")}
            className="btn-pill bg-white/5 border-white/15 text-zinc-300 hover:bg-white/10"
          >
            <X size={14} /> 跳过（拦截重复）
          </button>
          <button
            onClick={() => onConfirm("merge")}
            className="btn-pill bg-cool-400/15 border-cool-400/40 text-cool-400 hover:bg-cool-400/25"
          >
            合并备注
          </button>
          <button
            onClick={() => onConfirm("overwrite")}
            className="btn-pill bg-alert-400/15 border-alert-400/40 text-alert-400 hover:bg-alert-400/25"
          >
            <Check size={14} /> 覆盖旧数据
          </button>
        </div>
      </div>
    </div>
  );
}
