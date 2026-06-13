import { useState, useRef, useEffect } from "react";
import {
  exportTimeline,
  exportMaterials,
  exportFullReport,
  generateImportTemplate,
} from "../../utils/exportTimeline";
import type { TimelineEvent, Material, PendingConfirm } from "../../data/types";
import { Download, ChevronDown, FileText, Package, FileJson, ClipboardList } from "lucide-react";

interface ExportButtonProps {
  events: TimelineEvent[];
  materials?: Material[];
  pendingConfirms?: PendingConfirm[];
}

export default function ExportButton({
  events,
  materials = [],
  pendingConfirms = [],
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    {
      key: "timeline",
      label: "导出时间线",
      icon: FileText,
      onClick: () => {
        exportTimeline(events);
        setOpen(false);
      },
    },
    {
      key: "materials",
      label: "导出材料清单",
      icon: Package,
      onClick: () => {
        exportMaterials(materials);
        setOpen(false);
      },
      disabled: materials.length === 0,
    },
    {
      key: "full",
      label: "导出完整报告",
      icon: ClipboardList,
      onClick: () => {
        exportFullReport(events, materials, pendingConfirms);
        setOpen(false);
      },
    },
    {
      key: "template",
      label: "下载导入模板",
      icon: FileJson,
      onClick: () => {
        generateImportTemplate();
        setOpen(false);
      },
    },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-copper/10 border border-copper/30 rounded text-xs text-copper hover:bg-copper/20 transition-colors"
      >
        <Download size={13} />
        导出
        <ChevronDown size={12} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[160px] bg-[#1A1A2E] border border-zinc-700/50 rounded-md shadow-xl z-20 py-1">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                item.disabled
                  ? "text-zinc-600 cursor-not-allowed"
                  : "text-zinc-300 hover:bg-copper/10 hover:text-copper"
              }`}
            >
              <item.icon size={13} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
