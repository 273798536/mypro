import { useState } from "react";
import { useDashboardStore } from "@/store/dashboardStore";
import { useTimelineStore } from "@/store/timelineStore";
import { exportSamplesCSV, exportSamplesJSON, exportTimelineCSV, exportTimelineJSON, triggerDownload } from "@/utils/export";
import { formatDate } from "@/utils/formatters";
import { ChevronDown, Download, FileJson, FileSpreadsheet } from "lucide-react";

interface Props {
  context: "dashboard" | "timeline";
}

export default function ExportDropdown({ context }: Props) {
  const [open, setOpen] = useState(false);
  const { getFilteredSamples, filters, versions, grayConfigs } = useDashboardStore();
  const { getFilteredEvents } = useTimelineStore();

  const versionMap = Object.fromEntries(versions.map((v) => [v.id, v.id]));
  const grayMap = Object.fromEntries(grayConfigs.map((g) => [g.id, g.name]));
  const today = formatDate(new Date().toISOString(), false);

  const handleExport = (type: "csv" | "json", target: "samples" | "timeline") => {
    if (target === "samples") {
      const list = getFilteredSamples();
      const name = `drift-samples-${today}-${list.length}`;
      if (type === "csv") {
        triggerDownload(`${name}.csv`, exportSamplesCSV(list, filters, versionMap, grayMap), "text/csv;charset=utf-8");
      } else {
        triggerDownload(`${name}.json`, exportSamplesJSON(list, filters), "application/json");
      }
    } else {
      const list = getFilteredEvents();
      const name = `drift-timeline-${today}-${list.length}`;
      if (type === "csv") {
        triggerDownload(`${name}.csv`, exportTimelineCSV(list), "text/csv;charset=utf-8");
      } else {
        triggerDownload(`${name}.json`, exportTimelineJSON(list), "application/json");
      }
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-primary">
        <Download size={15} />
        {context === "dashboard" ? "导出样本报告" : "导出时间线"}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-ink-700/70 bg-ink-900/95 shadow-card backdrop-blur">
            {context === "dashboard" && (
              <div className="border-b border-ink-700/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                样本报告
              </div>
            )}
            {context === "timeline" && (
              <div className="border-b border-ink-700/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                时间线报告
              </div>
            )}
            {context === "dashboard" && (
              <>
                <ExportItem
                  icon={FileSpreadsheet}
                  label="CSV 格式"
                  desc="枚举说明表 + 页面状态标签"
                  onClick={() => handleExport("csv", "samples")}
                />
                <ExportItem
                  icon={FileJson}
                  label="JSON 格式"
                  desc="结构化数据 + 中文对照"
                  onClick={() => handleExport("json", "samples")}
                />
              </>
            )}
            {context === "timeline" && (
              <>
                <ExportItem
                  icon={FileSpreadsheet}
                  label="CSV 格式"
                  desc="display_label 与页面一致"
                  onClick={() => handleExport("csv", "timeline")}
                />
                <ExportItem
                  icon={FileJson}
                  label="JSON 格式"
                  desc="含 type + typeLabel 双字段"
                  onClick={() => handleExport("json", "timeline")}
                />
              </>
            )}
            <div className="border-t border-ink-700/60 bg-ink-950/60 px-4 py-2 text-[10px] text-ink-500">
              💡 导出文件包含当前筛选条件，确保离线查看与页面一致
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ExportItem({
  icon: Icon,
  label,
  desc,
  onClick,
}: {
  icon: typeof FileSpreadsheet;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-ink-800/60"
    >
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-200">{label}</div>
        <div className="truncate text-[11px] text-ink-500">{desc}</div>
      </div>
    </button>
  );
}
