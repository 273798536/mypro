import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Flag,
  History,
  Upload,
  Camera,
} from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useDataStore } from "@/store/dataStore";
import { formatDuration } from "@/utils/format";
import type { DedupStrategy, DuplicateCheckResult, SunlightDataset } from "@/types";
import { computeFileHash, checkDuplicate } from "@/services/dedupService";
import DuplicateDialog from "./DuplicateDialog";

interface GameControlsProps {
  onImportRequest?: (
    dataset: Omit<SunlightDataset, "id" | "importedAt">,
  ) => void;
  onExportScreenshot?: () => void;
}

export default function GameControls({
  onImportRequest,
  onExportScreenshot,
}: GameControlsProps) {
  const status = useGameStore((s) => s.status);
  const stats = useGameStore((s) => s.stats);
  const start = useGameStore((s) => s.start);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const reset = useGameStore((s) => s.reset);
  const settle = useGameStore((s) => s.settle);
  const getElapsedMs = useGameStore((s) => s.getElapsedMs);

  const [, tick] = useState(0);
  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => tick((x) => x + 1), 500);
    return () => window.clearInterval(id);
  }, [status]);

  const [dupDialog, setDupDialog] = useState<{
    open: boolean;
    checkResult: DuplicateCheckResult | null;
    candidate: Omit<SunlightDataset, "id" | "importedAt"> | null;
  }>({ open: false, checkResult: null, candidate: null });

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".json")) return;
    const contentHash = await computeFileHash(file);
    const existing = useDataStore.getState().datasets;
    const result = checkDuplicate(existing, file.name, contentHash);
    const text = await file.text();
    let buildingName = "未命名楼体";
    let importSource = "手动导入";
    try {
      const parsed = JSON.parse(text);
      if (parsed.buildingName) buildingName = parsed.buildingName;
      if (parsed.importSource) importSource = parsed.importSource;
    } catch {
      /* ignore */
    }
    const candidate = {
      fileName: file.name,
      contentHash,
      buildingName,
      importSource,
    };
    if (result.isDuplicate) {
      setDupDialog({ open: true, checkResult: result, candidate });
    } else {
      onImportRequest?.(candidate);
    }
  };

  const statusColor = {
    idle: "text-zinc-400",
    running: "text-lime-400",
    paused: "text-alert-400",
    settled: "text-cool-400",
  }[status];

  const statusText = {
    idle: "待开始",
    running: "处理中",
    paused: "已暂停",
    settled: "已结算",
  }[status];

  return (
    <div className="glass-card p-3 md:p-4 flex flex-wrap items-center gap-3 relative z-10">
      <div className="flex items-center gap-2 pr-3 border-r border-cyan-500/20">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            status === "running" ? "bg-lime-400 animate-pulse shadow-glow" :
            status === "paused" ? "bg-alert-400 shadow-glow-alert" :
            status === "settled" ? "bg-cool-400 shadow-glow-cool" :
            "bg-zinc-500"
          }`}
        />
        <div>
          <div className={`font-mono-app text-sm font-semibold ${statusColor}`}>
            {statusText}
          </div>
          <div className="font-mono-app text-[11px] text-zinc-400">
            {formatDuration(getElapsedMs())}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {status === "idle" || status === "settled" ? (
          <button
            onClick={start}
            className="btn-pill bg-lime-400/15 border-lime-400/40 text-lime-400 hover:bg-lime-400/25 hover:shadow-glow"
          >
            <Play size={14} /> 开始
          </button>
        ) : status === "running" ? (
          <button
            onClick={pause}
            className="btn-pill bg-alert-400/15 border-alert-400/40 text-alert-400 hover:bg-alert-400/25"
          >
            <Pause size={14} /> 暂停
          </button>
        ) : (
          <button
            onClick={resume}
            className="btn-pill bg-lime-400/15 border-lime-400/40 text-lime-400 hover:bg-lime-400/25"
          >
            <Play size={14} /> 继续
          </button>
        )}

        <button
          onClick={reset}
          className="btn-pill bg-zinc-500/15 border-zinc-400/30 text-zinc-300 hover:bg-zinc-400/20"
        >
          <RotateCcw size={14} /> 重开
        </button>

        <button
          onClick={settle}
          disabled={status === "idle" || status === "settled"}
          className="btn-pill bg-cool-400/15 border-cool-400/40 text-cool-400 hover:bg-cool-400/25 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Flag size={14} /> 结算
        </button>

        <a
          href="/review"
          className="btn-pill bg-purple-400/15 border-purple-400/40 text-purple-300 hover:bg-purple-400/25"
        >
          <History size={14} /> 复盘
        </a>
      </div>

      <div className="divider-soft flex-1 mx-1 hidden md:block" />

      <div className="flex items-center gap-4 text-[11px] font-mono-app text-zinc-400">
        <span>记录 <b className="text-zinc-100">{stats.totalRecords}</b></span>
        <span>越界 <b className="text-alert-400">{stats.overrunCount}</b></span>
        <span>去重 <b className="text-lime-400">{stats.duplicateBlocked}</b></span>
        <span>截图 <b className="text-cool-400">{stats.exportedCount}</b></span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <label className="btn-pill bg-white/5 border-white/15 text-zinc-200 hover:bg-white/10 cursor-pointer">
          <Upload size={14} /> 导入数据
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          onClick={onExportScreenshot}
          className="btn-pill bg-white/5 border-white/15 text-zinc-200 hover:bg-white/10"
        >
          <Camera size={14} /> 导出截图
        </button>
      </div>

      {dupDialog.open && dupDialog.candidate && dupDialog.checkResult && (
        <DuplicateDialog
          checkResult={dupDialog.checkResult}
          candidate={dupDialog.candidate}
          onClose={() => setDupDialog({ open: false, checkResult: null, candidate: null })}
          onConfirm={(strategy: DedupStrategy) => {
            if (strategy !== "skip" && onImportRequest && dupDialog.candidate) {
              onImportRequest(dupDialog.candidate);
            } else {
              useGameStore.getState().incrementStat("duplicateBlocked");
            }
            setDupDialog({ open: false, checkResult: null, candidate: null });
          }}
        />
      )}
    </div>
  );
}
