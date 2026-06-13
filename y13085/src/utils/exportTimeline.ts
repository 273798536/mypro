import type { TimelineEvent, Material, PendingConfirm } from "../data/types";
import {
  STATUS_LABEL_MAP,
  EVENT_TYPE_LABEL_MAP,
  MATERIAL_TYPE_LABEL_MAP,
} from "../data/types";

interface ExportTimelinePayload {
  exportTime: string;
  exportName: string;
  summary: {
    totalEvents: number;
    caliberChangeCount: number;
    statusBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
  };
  events: Array<{
    id: string;
    timestamp: string;
    type: string;
    typeLabel: string;
    description: string;
    relatedObjectId: string;
    status: string;
    statusLabel: string;
    isCaliberChange: boolean;
  }>;
}

interface ExportMaterialPayload {
  exportTime: string;
  summary: {
    totalMaterials: number;
    caliberChangeCount: number;
    typeBreakdown: Record<string, number>;
  };
  materials: Array<{
    id: string;
    relatedObjectId: string;
    type: string;
    typeLabel: string;
    title: string;
    content: string;
    importedAt: string;
    modifiedAt: string;
    hasRetraction: boolean;
    caliberChanged: boolean;
  }>;
}

function buildStatusBreakdown(events: TimelineEvent[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const evt of events) {
    const label = STATUS_LABEL_MAP[evt.status] || evt.status;
    result[label] = (result[label] || 0) + 1;
  }
  return result;
}

function buildTypeBreakdown<T extends { type: string }>(
  items: T[],
  labelMap: Record<string, string>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const label = labelMap[item.type] || item.type;
    result[label] = (result[label] || 0) + 1;
  }
  return result;
}

export function exportTimeline(events: TimelineEvent[]): string {
  const payload: ExportTimelinePayload = {
    exportTime: new Date().toISOString(),
    exportName: "博物馆展柜灯光空间复核-历史时间线",
    summary: {
      totalEvents: events.length,
      caliberChangeCount: events.filter((e) => e.isCaliberChange).length,
      statusBreakdown: buildStatusBreakdown(events),
      typeBreakdown: buildTypeBreakdown(events, EVENT_TYPE_LABEL_MAP),
    },
    events: events
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      .map((evt) => ({
        id: evt.id,
        timestamp: evt.timestamp,
        type: evt.type,
        typeLabel: EVENT_TYPE_LABEL_MAP[evt.type] || evt.type,
        description: evt.description,
        relatedObjectId: evt.relatedObjectId,
        status: evt.status,
        statusLabel: STATUS_LABEL_MAP[evt.status] || evt.status,
        isCaliberChange: evt.isCaliberChange,
      })),
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `博物馆展柜灯光空间复核-历史时间线-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return json;
}

export function exportMaterials(materials: Material[]): string {
  const payload: ExportMaterialPayload = {
    exportTime: new Date().toISOString(),
    summary: {
      totalMaterials: materials.length,
      caliberChangeCount: materials.filter((m) => m.caliberChanged).length,
      typeBreakdown: buildTypeBreakdown(materials, MATERIAL_TYPE_LABEL_MAP),
    },
    materials: materials
      .sort(
        (a, b) =>
          new Date(a.importedAt).getTime() - new Date(b.importedAt).getTime()
      )
      .map((m) => ({
        id: m.id,
        relatedObjectId: m.relatedObjectId,
        type: m.type,
        typeLabel: MATERIAL_TYPE_LABEL_MAP[m.type] || m.type,
        title: m.title,
        content: m.content,
        importedAt: m.importedAt,
        modifiedAt: m.modifiedAt,
        hasRetraction: m.hasRetraction,
        caliberChanged: m.caliberChanged,
      })),
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `博物馆展柜灯光空间复核-材料清单-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return json;
}

export function exportFullReport(
  events: TimelineEvent[],
  materials: Material[],
  pendings: PendingConfirm[]
): string {
  const payload = {
    exportTime: new Date().toISOString(),
    exportName: "博物馆展柜灯光空间复核-完整复核报告",
    summary: {
      totalMaterials: materials.length,
      totalEvents: events.length,
      pendingConfirms: pendings.filter((p) => !p.resolved).length,
      caliberChangeCount: events.filter((e) => e.isCaliberChange).length,
    },
    materials: materials.map((m) => ({
      ...m,
      typeLabel: MATERIAL_TYPE_LABEL_MAP[m.type] || m.type,
    })),
    events: events
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      .map((e) => ({
        ...e,
        typeLabel: EVENT_TYPE_LABEL_MAP[e.type] || e.type,
        statusLabel: STATUS_LABEL_MAP[e.status] || e.status,
      })),
    pendingConfirms: pendings,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `博物馆展柜灯光空间复核-完整报告-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return json;
}

export function generateImportTemplate(): string {
  const payload = {
    materials: [
      {
        id: "mat-example-001",
        relatedObjectId: "lo-001",
        type: "inspection_photo",
        title: "示例：左灯巡检照片",
        content: "巡检记录内容，描述灯光状态...",
        importedAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        hasRetraction: false,
        caliberChanged: false,
      },
      {
        id: "mat-example-002",
        relatedObjectId: "lo-001",
        type: "retraction_record",
        title: "示例：撤回左灯参数",
        content: "撤回原记录中左灯色温值，实际应为...",
        importedAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        hasRetraction: true,
        caliberChanged: true,
      },
    ],
    events: [
      {
        id: "evt-example-001",
        timestamp: new Date().toISOString(),
        type: "import",
        description: "导入示例材料",
        relatedObjectId: "lo-001",
        relatedMaterialId: "mat-example-001",
        status: "confirmed",
        isCaliberChange: false,
      },
    ],
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `材料导入模板-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return json;
}
