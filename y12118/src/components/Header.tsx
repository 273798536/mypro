import { useAppStore } from "@/utils/store";
import type { ScenarioPreset } from "@/utils/types";
import {
  Play,
  FileJson,
  FileSpreadsheet,
  Zap,
  AlertTriangle,
  Clock,
  Copy,
} from "lucide-react";
import { exportToCSV, exportToJSON, downloadFile } from "@/utils/exporter";

const SCENARIOS: { key: ScenarioPreset; label: string; icon: React.ReactNode }[] = [
  { key: "smooth", label: "顺利", icon: <Zap className="w-3.5 h-3.5" /> },
  { key: "budget_exhausted", label: "预算耗尽", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { key: "conversion_delay", label: "转化延迟", icon: <Clock className="w-3.5 h-3.5" /> },
  { key: "material_duplicate", label: "素材重复", icon: <Copy className="w-3.5 h-3.5" /> },
];

export default function Header() {
  const { output, loadScenario, runAllocation, channels } = useAppStore();

  const handleExportCSV = () => {
    if (!output) return;
    const csv = exportToCSV(output);
    downloadFile(csv, "budget_allocation.csv", "text/csv");
  };

  const handleExportJSON = () => {
    if (!output) return;
    const json = exportToJSON(output);
    downloadFile(json, "budget_allocation.json", "application/json");
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">
              竞价广告预算分配
            </h1>
            <p className="text-[10px] text-zinc-500 tracking-wide">
              BUDGET ALLOCATION ENGINE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 mr-1">场景</span>
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => loadScenario(s.key)}
              className="px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors flex items-center gap-1.5 border border-zinc-800"
            >
              {s.icon}
              {s.label}
            </button>
          ))}

          <div className="w-px h-6 bg-zinc-800 mx-2" />

          <button
            onClick={runAllocation}
            disabled={channels.length === 0}
            className="px-4 py-1.5 rounded-md text-xs font-medium bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5" />
            执行分配
          </button>

          {output && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors flex items-center gap-1.5 border border-zinc-800"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors flex items-center gap-1.5 border border-zinc-800"
              >
                <FileJson className="w-3.5 h-3.5" />
                JSON
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
