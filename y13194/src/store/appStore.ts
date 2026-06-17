import { create } from "zustand";
import type {
  ActivityLog,
  BatteryCell,
  JumpDetection,
  LogFilters,
  Remark,
  ReportConfig,
  ResistanceUnit,
  SensorLogEntry,
  Screenshot,
} from "../types";
import {
  generateActivities,
  generateBatteryPack,
  generateReports,
  generateSensorLogs,
} from "../mock/generator";

const cells = generateBatteryPack();
const { logs, remarks, screenshots, jumps } = generateSensorLogs(cells);
const reports = generateReports();
const activities = generateActivities(logs, remarks, reports);
const firstTs = logs[0]?.timestamp ?? Date.now() - 86400000;
const lastTs = logs[logs.length - 1]?.timestamp ?? Date.now();

export interface AppState {
  ui: {
    activeNav: string;
    rightPanelCollapsed: boolean;
  };
  battery: {
    cells: BatteryCell[];
    selectedId: string | null;
    hoverId: string | null;
  };
  log: {
    logs: SensorLogEntry[];
    timeRange: { start: number; end: number };
    filters: LogFilters;
  };
  history: {
    remarks: Remark[];
    screenshots: Screenshot[];
    auditLogs: ActivityLog[];
  };
  anomaly: {
    jumps: JumpDetection[];
  };
  report: {
    reports: ReportConfig[];
    selectedTemplate: ReportConfig["template"];
    draftReport: Partial<ReportConfig>;
  };

  setActiveNav: (nav: string) => void;
  toggleRightPanel: () => void;
  selectBattery: (id: string | null) => void;
  hoverBattery: (id: string | null) => void;
  setTimeRange: (r: { start: number; end: number }) => void;
  setFilters: (patch: Partial<LogFilters>) => void;
  toggleBatteryFilter: (id: string) => void;
  toggleUnitFilter: (u: ResistanceUnit) => void;
  toggleAnomalyOnly: () => void;
  toggleUnauditedOnly: () => void;
  markAudited: (logId: string, by: string) => void;
  toggleDirectionReversed: (logId: string) => void;
  setEvidenceStatus: (logId: string, status: "pending" | "collected" | "unavailable") => void;
  addRemark: (logId: string, content: string, operator: string) => void;
  setReportTemplate: (t: ReportConfig["template"]) => void;
  updateDraftReport: (patch: Partial<ReportConfig>) => void;
  submitReport: (name: string, createdBy: string) => void;
  updateReportProgress: () => void;
  finalizeReport: (reportId: string, downloadUrl: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  ui: {
    activeNav: "dashboard",
    rightPanelCollapsed: false,
  },
  battery: {
    cells,
    selectedId: cells.find((c) => c.status === "anomaly")?.id ?? cells[0]?.id ?? null,
    hoverId: null,
  },
  log: {
    logs,
    timeRange: { start: firstTs, end: lastTs },
    filters: {
      batteryIds: [],
      units: [],
      anomalyOnly: false,
      unauditedOnly: false,
      directionSigns: [],
    },
  },
  history: {
    remarks,
    screenshots,
    auditLogs: activities,
  },
  anomaly: { jumps },
  report: {
    reports,
    selectedTemplate: "standard",
    draftReport: {
      batteryIds: [],
      timeRange: { start: firstTs, end: lastTs },
      includeAnomalies: true,
      includeHistory: false,
    },
  },

  setActiveNav: (nav) => set((s) => ({ ui: { ...s.ui, activeNav: nav } })),
  toggleRightPanel: () => set((s) => ({ ui: { ...s.ui, rightPanelCollapsed: !s.ui.rightPanelCollapsed } })),
  selectBattery: (id) => set((s) => ({ battery: { ...s.battery, selectedId: id } })),
  hoverBattery: (id) => set((s) => ({ battery: { ...s.battery, hoverId: id } })),
  setTimeRange: (r) => set((s) => ({ log: { ...s.log, timeRange: r } })),
  setFilters: (patch) => set((s) => ({ log: { ...s.log, filters: { ...s.log.filters, ...patch } } })),
  toggleBatteryFilter: (id) =>
    set((s) => {
      const set1 = new Set(s.log.filters.batteryIds);
      set1.has(id) ? set1.delete(id) : set1.add(id);
      return { log: { ...s.log, filters: { ...s.log.filters, batteryIds: Array.from(set1) } } };
    }),
  toggleUnitFilter: (u) =>
    set((s) => {
      const set1 = new Set(s.log.filters.units);
      set1.has(u) ? set1.delete(u) : set1.add(u);
      return { log: { ...s.log, filters: { ...s.log.filters, units: Array.from(set1) } } };
    }),
  toggleAnomalyOnly: () => set((s) => ({ log: { ...s.log, filters: { ...s.log.filters, anomalyOnly: !s.log.filters.anomalyOnly } } })),
  toggleUnauditedOnly: () => set((s) => ({ log: { ...s.log, filters: { ...s.log.filters, unauditedOnly: !s.log.filters.unauditedOnly } } })),
  markAudited: (logId, by) =>
    set((s) => ({
      log: {
        ...s.log,
        logs: s.log.logs.map((l) =>
          l.id === logId ? { ...l, isAudited: true, auditedBy: by, auditedAt: Date.now() } : l,
        ),
      },
    })),
  toggleDirectionReversed: (logId) =>
    set((s) => ({
      log: {
        ...s.log,
        logs: s.log.logs.map((l) => {
          if (l.id !== logId) return l;
          const reversed = l.directionSign !== "reversed";
          return {
            ...l,
            directionSign: reversed ? "reversed" : "positive",
            isAnomaly: reversed,
            anomalyType: reversed ? "direction-reversed" : undefined,
          };
        }),
      },
    })),
  setEvidenceStatus: (logId, status) =>
    set((s) => ({
      log: {
        ...s.log,
        logs: s.log.logs.map((l) => (l.id === logId ? { ...l, evidenceStatus: status } : l)),
      },
    })),
  addRemark: (logId, content, operator) =>
    set((s) => {
      const oldList = s.history.remarks.filter((r) => r.logId === logId);
      const nextVersion = oldList.length + 1;
      const newRemark: Remark = {
        id: `rm_${logId}_${nextVersion}_${Date.now()}`,
        logId,
        content,
        operator,
        createdAt: Date.now(),
        version: nextVersion,
        isLatest: true,
      };
      return {
        history: {
          ...s.history,
          remarks: [
            ...s.history.remarks.map((r) => (r.logId === logId ? { ...r, isLatest: false } : r)),
            newRemark,
          ],
        },
        log: {
          ...s.log,
          logs: s.log.logs.map((l) => (l.id === logId ? { ...l, remarkIds: [...l.remarkIds, newRemark.id] } : l)),
        },
      };
    }),
  setReportTemplate: (t) => set((s) => ({ report: { ...s.report, selectedTemplate: t } })),
  updateDraftReport: (patch) =>
    set((s) => ({ report: { ...s.report, draftReport: { ...s.report.draftReport, ...patch } } })),
  submitReport: (name, createdBy) =>
    set((s) => {
      const d = s.report.draftReport;
      const newReport: ReportConfig = {
        id: `rp_${Date.now()}`,
        name,
        template: s.report.selectedTemplate,
        batteryIds: d.batteryIds ?? s.battery.cells.slice(0, 6).map((c) => c.id),
        timeRange: d.timeRange ?? s.log.timeRange,
        includeAnomalies: d.includeAnomalies ?? true,
        includeHistory: d.includeHistory ?? false,
        status: "queued",
        progress: 0,
        createdAt: Date.now(),
        createdBy,
      };
      return { report: { ...s.report, reports: [newReport, ...s.report.reports] } };
    }),
  updateReportProgress: () =>
    set((s) => ({
      report: {
        ...s.report,
        reports: s.report.reports.map((r) => {
          if (r.status === "queued") return { ...r, status: "generating", progress: 10 };
          if (r.status === "generating") {
            const p = Math.min(100, r.progress + 18);
            return { ...r, progress: p, status: p >= 100 ? "completed" : "generating" };
          }
          return r;
        }),
      },
    })),
  finalizeReport: (reportId, downloadUrl) =>
    set((s) => ({
      report: {
        ...s.report,
        reports: s.report.reports.map((r) =>
          r.id === reportId ? { ...r, downloadUrl, progress: 100, status: "completed" } : r,
        ),
      },
    })),
}));

export function useFilteredLogs() {
  const { logs, timeRange, filters } = useAppStore((s) => s.log);
  const selectedBatteryId = useAppStore((s) => s.battery.selectedId);
  const remarks = useAppStore((s) => s.history.remarks);
  return logs.filter((l) => {
    if (l.timestamp < timeRange.start || l.timestamp > timeRange.end) return false;
    if (selectedBatteryId && l.batteryId !== selectedBatteryId) return false;
    if (filters.batteryIds.length && !filters.batteryIds.includes(l.batteryId)) return false;
    if (filters.units.length && !filters.units.includes(l.unit)) return false;
    if (filters.anomalyOnly && !l.isAnomaly) return false;
    if (filters.unauditedOnly && l.isAudited) return false;
    if (filters.directionSigns.length && !filters.directionSigns.includes(l.directionSign)) return false;
    if (filters.remarkKeyword) {
      const rms = remarks.filter((r) => r.logId === l.id);
      if (!rms.some((r) => r.content.includes(filters.remarkKeyword!))) return false;
    }
    return true;
  });
}

export function useStats() {
  const logs = useAppStore((s) => s.log.logs);
  const directionAnomalies = logs.filter((l) => l.anomalyType === "direction-reversed").length;
  const jumps = logs.filter((l) => l.anomalyType?.startsWith("jump")).length;
  const pendingEvidence = logs.filter((l) => l.evidenceStatus === "pending").length;
  const audited = logs.filter((l) => l.isAudited).length;
  const unaudited = logs.filter((l) => !l.isAudited).length;
  return { directionAnomalies, jumps, pendingEvidence, audited, unaudited, total: logs.length };
}
