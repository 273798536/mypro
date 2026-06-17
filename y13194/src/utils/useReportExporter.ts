import { useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import type { ReportConfig } from "@/types";
import { generateReportPDF, downloadBlob } from "./pdfGenerator";

export function useReportExporter() {
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const state = useAppStore((s) => s);
  const finalizeReport = useAppStore((s) => s.finalizeReport);

  const exportReport = useCallback(
    async (report: ReportConfig, silent = false) => {
      if (busy.has(report.id)) return;
      const nb = new Set(busy);
      nb.add(report.id);
      setBusy(nb);
      try {
        if (!report.downloadUrl) {
          const blob = await generateReportPDF({
            report,
            cells: state.battery.cells,
            logs: state.log.logs,
            remarks: state.history.remarks,
            jumps: state.anomaly.jumps,
          });
          const url = URL.createObjectURL(blob);
          finalizeReport(report.id, url);
        }
        const current = useAppStore.getState().report.reports.find(r => r.id === report.id);
        const finalUrl = current?.downloadUrl ?? URL.createObjectURL(
          await generateReportPDF({
            report,
            cells: state.battery.cells,
            logs: state.log.logs,
            remarks: state.history.remarks,
            jumps: state.anomaly.jumps,
          })
        );
        if (!silent) {
          const name = `${report.name.replace(/[/\\?%*:|"<>]/g, "_")}_${report.id.slice(-6)}.pdf`;
          downloadBlob(await fetch(finalUrl).then(r => r.blob()), name);
        }
      } catch (e) {
        console.error("导出 PDF 失败", e);
        alert("导出 PDF 失败，请重试");
      } finally {
        const nb2 = new Set(busy);
        nb2.delete(report.id);
        setBusy(nb2);
      }
    },
    [busy, state, finalizeReport],
  );

  const downloadById = useCallback(async (reportId: string, silent = false) => {
    const r = useAppStore.getState().report.reports.find(x => x.id === reportId);
    if (!r) return;
    await exportReport(r, silent);
  }, [exportReport]);

  return { exportReport, downloadById, isBusy: (id: string) => busy.has(id) };
}

export { generateReportPDF, downloadBlob };
