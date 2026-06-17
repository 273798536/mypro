import { useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import type { ReportConfig } from "@/types";
import { generateReportPDF, downloadBlob } from "./pdfGenerator";

function buildFileName(report: ReportConfig) {
  const safeName = report.name.replace(/[/\\?%*:|"<>]/g, "_").trim() || "report";
  const idSuffix = report.id.length >= 6 ? report.id.slice(-6) : report.id;
  return `${safeName}_${idSuffix}.pdf`;
}

export function useReportExporter() {
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const exportReport = useCallback(
    async (report: ReportConfig, silent = false) => {
      const reportId = report.id;
      let shouldReturn = false;
      setBusy((prev) => {
        if (prev.has(reportId)) {
          shouldReturn = true;
          return prev;
        }
        const n = new Set(prev);
        n.add(reportId);
        return n;
      });
      if (shouldReturn) return;

      try {
        const st = useAppStore.getState();
        let targetReport = st.report.reports.find((r) => r.id === reportId) ?? report;
        let blob: Blob | null = null;

        if (targetReport.downloadUrl) {
          try {
            const resp = await fetch(targetReport.downloadUrl);
            if (resp.ok) blob = await resp.blob();
          } catch {
            blob = null;
          }
        }

        if (!blob) {
          blob = await generateReportPDF({
            report: targetReport,
            cells: st.battery.cells,
            logs: st.log.logs,
            remarks: st.history.remarks,
            jumps: st.anomaly.jumps,
          });
          const url = URL.createObjectURL(blob);
          st.finalizeReport(reportId, url);
        }

        if (!silent) {
          downloadBlob(blob, buildFileName(targetReport));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[PDF 导出失败]", e);
        alert(`导出 PDF 失败：${msg || "未知错误"}\n请重试或检查控制台详情。`);
      } finally {
        setBusy((prev) => {
          const n = new Set(prev);
          n.delete(reportId);
          return n;
        });
      }
    },
    [],
  );

  const downloadById = useCallback(
    async (reportId: string, silent = false) => {
      const r = useAppStore.getState().report.reports.find((x) => x.id === reportId);
      if (!r) {
        alert("找不到该报告");
        return;
      }
      await exportReport(r, silent);
    },
    [exportReport],
  );

  return { exportReport, downloadById, isBusy: (id: string) => busy.has(id) };
}

export { generateReportPDF, downloadBlob };
