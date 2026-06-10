import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  Download,
  Printer,
  CheckSquare,
  Square,
  FileCode,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { exportAsPDF, exportAsHTML } from "@/utils/exportReport";
import { PrimerSample } from "@/types";
import { cn } from "@/lib/utils";

interface ExportToolbarProps {
  sample: PrimerSample;
  includeRawData: boolean;
  onToggleRawData: (v: boolean) => void;
}

export default function ExportToolbar({
  sample,
  includeRawData,
  onToggleRawData,
}: ExportToolbarProps) {
  const navigate = useNavigate();
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);

  const handleBack = () => {
    navigate(-1);
  };

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const filename = `引物边界报告_${sample.batch}_${sample.name}_${Date.now()}`;
      await exportAsPDF("report-content", filename);
    } finally {
      setTimeout(() => setExportingPdf(false), 1500);
    }
  };

  const handleExportHTML = () => {
    setExportingHtml(true);
    try {
      const el = document.getElementById("report-content");
      if (el) {
        const filename = `引物边界报告_${sample.batch}_${sample.name}_${Date.now()}`;
        exportAsHTML(el, filename);
      }
    } finally {
      setTimeout(() => setExportingHtml(false), 1500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="sticky top-0 z-50 print:hidden">
      <div className="bg-primary-900/95 backdrop-blur-md border-b border-primary-800 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3 flex-wrap py-2 sm:h-16 sm:py-0">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg",
                  "text-primary-200 hover:text-white hover:bg-primary-800",
                  "transition-all duration-200 active:scale-95",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500"
                )}
              >
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                <span className="text-sm font-medium hidden sm:inline">返回</span>
              </button>

              <div className="h-8 w-px bg-primary-700 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-primary-300" />
                <div className="flex flex-col leading-tight">
                  <span className="text-white font-semibold text-sm sm:text-base">
                    报告预览
                  </span>
                  <span className="text-primary-400 text-[11px] font-mono hidden sm:block">
                    {sample.id} · {sample.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-800/60 border border-primary-700 cursor-pointer hover:bg-primary-800 transition-colors group">
                <button
                  type="button"
                  onClick={() => onToggleRawData(!includeRawData)}
                  className={cn(
                    "transition-all duration-200",
                    includeRawData ? "text-teal-400" : "text-primary-400 group-hover:text-primary-300"
                  )}
                >
                  {includeRawData ? (
                    <CheckSquare className="w-4.5 h-4.5" />
                  ) : (
                    <Square className="w-4.5 h-4.5" />
                  )}
                </button>
                <span className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  includeRawData ? "text-teal-300" : "text-primary-300"
                )}>
                  包含原始数据
                </span>
              </label>

              <button
                onClick={handlePrint}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg",
                  "text-primary-200 hover:text-white hover:bg-primary-800",
                  "border border-primary-700 hover:border-primary-600",
                  "transition-all duration-200 active:scale-95",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500"
                )}
                title="打印报告"
              >
                <Printer className="w-4.5 h-4.5" />
                <span className="text-sm font-medium hidden sm:inline">打印</span>
              </button>

              <button
                onClick={handleExportHTML}
                disabled={exportingHtml}
                className={cn(
                  "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg",
                  "text-white bg-primary-700 hover:bg-primary-600",
                  "border border-primary-600 hover:border-primary-500",
                  "transition-all duration-200 active:scale-95",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500",
                  "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                )}
                title="导出为HTML"
              >
                {exportingHtml ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <FileCode className="w-4.5 h-4.5" />
                )}
                <span className="text-sm font-medium whitespace-nowrap">
                  {exportingHtml ? "导出中" : "导出HTML"}
                </span>
              </button>

              <button
                onClick={handleExportPDF}
                disabled={exportingPdf}
                className={cn(
                  "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg",
                  "text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600",
                  "border border-teal-500 hover:border-teal-400",
                  "shadow-lg shadow-teal-900/30 hover:shadow-xl hover:shadow-teal-900/40",
                  "transition-all duration-200 active:scale-95",
                  "focus:outline-none focus:ring-2 focus:ring-teal-400",
                  "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                )}
                title="导出为PDF"
              >
                {exportingPdf ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <Download className="w-4.5 h-4.5" />
                )}
                <span className="text-sm font-semibold whitespace-nowrap">
                  {exportingPdf ? "生成中" : "导出PDF"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
