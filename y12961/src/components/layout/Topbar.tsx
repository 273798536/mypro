import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ChevronDown,
  Download,
  FileJson,
  FileSpreadsheet,
  Layers,
  Check,
  Calendar,
  CircleDot,
} from "lucide-react";
import { useCheckStore, allBatches } from "@/store/useCheckStore";
import { exportRoutesCsv, exportRoutesJson } from "@/utils/download";
import { cn } from "@/lib/utils";

const PAGE_TITLE: Record<string, string> = {
  "/": "总览看板",
  "/routes": "路由明细",
  "/schema": "Schema 对比",
  "/audit": "审计追踪",
  "/backup": "备份记录对比",
};

function fmtTime(iso: string) {
  if (!iso) return "待定";
  return iso.replace("T", " ").replace(/\+08:00$/, "");
}

export default function Topbar() {
  const { batch, setBatch } = useCheckStore();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const title = PAGE_TITLE[location.pathname] ?? "分库分表路由检查";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-ink-950/70 px-4 py-3 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
          {title}
        </h1>
        <span className="hidden font-mono text-[10px] text-ink-500 md:inline">
          / sharding routing check
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Batch indicator + selector */}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="group flex items-center gap-2.5 rounded-lg border border-line bg-ink-900/70 px-3 py-1.5 text-left transition-colors hover:border-sky/40"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky/10 text-sky">
              <Layers className="h-3.5 w-3.5" />
            </span>
            <div className="leading-tight">
              <div className="num text-[11px] font-semibold text-zinc-100">
                {batch.id}
              </div>
              <div className="flex items-center gap-1 font-mono text-[9px] text-ink-500">
                <Calendar className="h-2.5 w-2.5" />
                {fmtTime(batch.generatedAt)}
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-ink-500 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-2 w-72 origin-top-right animate-rise rounded-lg border border-line bg-ink-900/95 p-2 shadow-card backdrop-blur-md">
                <div className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  运行历史 · 切换批次
                </div>
                {allBatches.map((b) => {
                  const active = b.id === batch.id;
                  const ok = b.materials.filter((m) => m.coverage === "ok").length;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setBatch(b.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "mt-1 flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors",
                        active ? "bg-sky/10" : "hover:bg-ink-850",
                      )}
                    >
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center">
                        {active ? (
                          <Check className="h-3.5 w-3.5 text-sky" />
                        ) : (
                          <CircleDot className="h-3 w-3 text-ink-500" />
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="num block text-[11px] font-semibold text-zinc-100">
                          {b.id}
                        </span>
                        <span className="block text-[10px] text-ink-500">
                          {b.label}
                        </span>
                        <span className="mt-1 flex items-center gap-2 font-mono text-[9px] text-ink-500">
                          <span>{fmtTime(b.generatedAt)}</span>
                          <span className="text-ink-600">·</span>
                          <span>材料 {ok}/{b.materials.length}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
                <div className="mt-1 border-t border-line px-2 py-1.5 font-mono text-[9px] text-ink-600">
                  选中后图表 / 明细 / 下载 同源跟随
                </div>
              </div>
            </>
          )}
        </div>

        {/* Same-source download */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => exportRoutesCsv(batch)}
            title="导出当前批次路由明细 CSV（与图表同源）"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-900/70 px-2.5 py-1.5 font-mono text-[11px] text-zinc-300 transition-colors hover:border-emerald/40 hover:text-emerald-soft"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={() => exportRoutesJson(batch)}
            title="导出当前批次路由明细 JSON（与图表同源）"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-900/70 px-2.5 py-1.5 font-mono text-[11px] text-zinc-300 transition-colors hover:border-sky/40 hover:text-sky-soft"
          >
            <FileJson className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">JSON</span>
          </button>
          <button
            onClick={() => exportRoutesCsv(batch)}
            className="flex items-center gap-1.5 rounded-lg bg-sky px-3 py-1.5 font-mono text-[11px] font-semibold text-ink-950 transition-all hover:bg-sky-soft hover:shadow-glow"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">下载结果</span>
          </button>
        </div>
      </div>
    </header>
  );
}
