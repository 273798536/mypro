import { useStore } from "@/store";
import { ChevronRight, Circle } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber",
  confirmed: "bg-emerald",
  overridden: "bg-zinc-400",
};

const statusLabels: Record<string, string> = {
  pending: "待处理",
  confirmed: "已确认",
  overridden: "已覆盖",
};

export default function AnomalyList() {
  const { anomalies, selectedAnomalyId, setSelectedAnomalyId, filterSession, filterChannel, setFilterSession, setFilterChannel } = useStore();

  const sessions = [...new Set(anomalies.map((a) => a.session))];
  const channels = [...new Set(anomalies.map((a) => a.channel))];

  const filtered = anomalies.filter((a) => {
    if (filterSession && a.session !== filterSession) return false;
    if (filterChannel && a.channel !== filterChannel) return false;
    return true;
  });

  return (
    <div className="bg-surface-800 rounded-lg border border-surface-600">
      <div className="px-4 py-3 border-b border-surface-600 flex items-center justify-between">
        <h2 className="font-mono text-sm font-semibold text-zinc-100">异常列表</h2>
        <div className="flex gap-2">
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="bg-surface-700 border border-surface-500 text-xs text-zinc-300 rounded px-2 py-1 font-mono focus:outline-none focus:border-amber"
          >
            <option value="">全部场次</option>
            {sessions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="bg-surface-700 border border-surface-500 text-xs text-zinc-300 rounded px-2 py-1 font-mono focus:outline-none focus:border-amber"
          >
            <option value="">全部通道</option>
            {channels.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="divide-y divide-surface-600">
        {filtered.map((anomaly) => (
          <button
            key={anomaly.id}
            onClick={() => setSelectedAnomalyId(selectedAnomalyId === anomaly.id ? null : anomaly.id)}
            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors duration-150 hover:bg-surface-700 ${
              selectedAnomalyId === anomaly.id ? "bg-surface-700" : ""
            }`}
          >
            <Circle className={`w-2 h-2 flex-shrink-0 ${statusColors[anomaly.status]}`} fill="currentColor" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-400">{anomaly.id}</span>
                <span className="text-sm text-zinc-200 truncate">{anomaly.channel}</span>
                {anomaly.isBoundary && (
                  <span className="text-xs bg-amber/20 text-amber px-1.5 py-0.5 rounded font-mono">
                    边界
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-500 truncate">{anomaly.session}</div>
            </div>
            <span className={`text-xs font-mono ${anomaly.status === "pending" ? "text-amber" : anomaly.status === "confirmed" ? "text-emerald" : "text-zinc-400"}`}>
              {statusLabels[anomaly.status]}
            </span>
            <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${selectedAnomalyId === anomaly.id ? "rotate-90" : ""}`} />
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="px-4 py-8 text-center text-zinc-500 text-sm">无匹配异常</div>
      )}
    </div>
  );
}
