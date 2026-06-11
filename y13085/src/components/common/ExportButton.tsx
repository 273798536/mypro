import { exportTimeline } from "../../utils/exportTimeline";
import { Download } from "lucide-react";

export default function ExportButton({ events }: { events: import("../../data/types").TimelineEvent[] }) {
  return (
    <button
      onClick={() => exportTimeline(events)}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-copper/10 border border-copper/30 rounded text-xs text-copper hover:bg-copper/20 transition-colors"
    >
      <Download size={13} />
      导出时间线
    </button>
  );
}
