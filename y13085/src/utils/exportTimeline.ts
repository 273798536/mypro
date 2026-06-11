import type { TimelineEvent } from "../data/types";
import { STATUS_LABEL_MAP } from "../data/types";

interface ExportItem {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  relatedObjectId: string;
  status: string;
  isCaliberChange: boolean;
}

export function exportTimeline(events: TimelineEvent[]): void {
  const items: ExportItem[] = events.map((evt) => ({
    id: evt.id,
    timestamp: evt.timestamp,
    type: evt.type,
    description: evt.description,
    relatedObjectId: evt.relatedObjectId,
    status: STATUS_LABEL_MAP[evt.status] || evt.status,
    isCaliberChange: evt.isCaliberChange,
  }));

  const payload = {
    exportTime: new Date().toISOString(),
    totalEvents: items.length,
    caliberChangeCount: items.filter((i) => i.isCaliberChange).length,
    events: items,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `博物馆展柜灯光空间复核-历史时间线-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
