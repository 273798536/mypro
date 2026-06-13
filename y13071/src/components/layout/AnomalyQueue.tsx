import { AlertTriangle, ChevronLeft, ChevronRight, CheckCheck, CircleDot } from "lucide-react";
import { useMemo, useState } from "react";
import { useFilterStore } from "@/stores/filterStore";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useAnnotationStore } from "@/stores/annotationStore";
import { cablewayObjects } from "@/utils/mockData";
import type { Anomaly, Severity, ResolveStatus } from "@/shared/types";
import { useCameraSync } from "@/hooks/useCameraSync";

const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  MAJOR: 1,
  MINOR: 2,
};
const RESOLVE_ORDER: Record<ResolveStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  RESOLVED: 2,
};

interface Props {
  cameraSync: ReturnType<typeof useCameraSync>;
}

const SEV_COLOR: Record<Severity, string> = {
  CRITICAL: "bg-cable-500",
  MAJOR: "bg-fix-500",
  MINOR: "bg-pass-500",
};
const SEV_LABEL: Record<Severity, string> = {
  CRITICAL: "严重",
  MAJOR: "重要",
  MINOR: "一般",
};
const RESOLVE_LABEL: Record<ResolveStatus, string> = {
  PENDING: "待处理",
  CONFIRMED: "已确认",
  RESOLVED: "已解决",
};

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function AnomalyQueue({ cameraSync }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const rawAnomalies = useFilterStore((s) => s.anomalies);
  const filters = useFilterStore((s) => s.filters);
  const selectObject = useFilterStore((s) => s.selectObject);
  const confirmAnomaly = useFilterStore((s) => s.confirmAnomaly);
  const resolveAnomaly = useFilterStore((s) => s.resolveAnomaly);
  const seek = usePlaybackStore((s) => s.seek);
  const addHistory = useAnnotationStore((s) => s.addHistory);
  const objMap = new Map(cablewayObjects.map((o) => [o.id, o]));

  const anomalies = useMemo(() => {
    return rawAnomalies
      .filter((a) => {
        const obj = objMap.get(a.objectId);
        if (!obj) return false;
        if (filters.floors.length && !filters.floors.includes(obj.floor))
          return false;
        if (filters.units.length && !filters.units.includes(obj.unit))
          return false;
        if (filters.types.length && !filters.types.includes(obj.type))
          return false;
        return true;
      })
      .sort((a, b) => {
        if (a.resolved !== b.resolved)
          return RESOLVE_ORDER[a.resolved] - RESOLVE_ORDER[b.resolved];
        return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      });
  }, [rawAnomalies, filters, objMap]);

  const handleJump = (a: Anomaly) => {
    const obj = objMap.get(a.objectId);
    seek(a.timestamp);
    selectObject(a.objectId);
    if (obj) cameraSync.flyTo(obj.position, 10);
  };

  const handleConfirm = (a: Anomaly) => {
    confirmAnomaly(a.id, "阿乔");
    addHistory(
      "CONFIRM",
      a.id,
      "阿乔",
      { resolved: a.resolved },
      { resolved: "CONFIRMED" }
    );
  };

  const handleResolve = (a: Anomaly) => {
    resolveAnomaly(a.id, "阿乔");
    addHistory(
      "CONFIRM",
      a.id,
      "阿乔",
      { resolved: a.resolved },
      { resolved: "RESOLVED" }
    );
  };

  return (
    <div
      className={`absolute right-0 top-14 bottom-28 z-20 transition-all duration-300 ${
        collapsed ? "w-10" : "w-80"
      }`}
    >
      <div className="h-full glass m-3 mr-3 rounded-lg border border-mine-700/60 flex flex-col overflow-hidden scan-bg">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-mine-700/60">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-cable-400" />
              <span className="font-display text-[13px] text-silver-200">
                异常队列
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cable-500/20 text-cable-300 font-mono">
                {anomalies.filter((a) => a.resolved === "PENDING").length} 待办
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-mine-700/60 text-silver-300"
          >
            {collapsed ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
        {!collapsed && (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {anomalies.length === 0 && (
              <div className="text-center text-silver-400 text-[11px] py-8 font-mono">
                当前筛选条件下暂无异常
              </div>
            )}
            {anomalies.map((a) => {
              const obj = objMap.get(a.objectId);
              return (
                <div
                  key={a.id}
                  onClick={() => handleJump(a)}
                  className="group relative rounded-md border border-mine-700/70 bg-mine-900/50 hover:bg-mine-800/70 hover:border-cable-500/40 cursor-pointer transition p-2.5 animate-float-up"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${SEV_COLOR[a.severity]}`}
                  />
                  <div className="flex items-start justify-between gap-2 pl-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            a.severity === "CRITICAL"
                              ? "bg-cable-500/20 text-cable-300"
                              : a.severity === "MAJOR"
                              ? "bg-fix-500/20 text-fix-400"
                              : "bg-pass-500/20 text-pass-400"
                          }`}
                        >
                          {SEV_LABEL[a.severity]}
                        </span>
                        <span className="text-[10px] font-mono text-silver-400">
                          {fmtTime(a.timestamp)}
                        </span>
                        <span
                          className={`text-[10px] font-mono ml-auto ${
                            a.resolved === "PENDING"
                              ? "text-cable-400"
                              : a.resolved === "CONFIRMED"
                              ? "text-fix-400"
                              : "text-pass-400"
                          }`}
                        >
                          {RESOLVE_LABEL[a.resolved]}
                        </span>
                      </div>
                      <div className="text-[12px] text-silver-200 font-mono mb-0.5">
                        {obj?.name ?? a.objectId}
                      </div>
                      <div className="text-[11px] text-silver-400 leading-relaxed">
                        {a.description}
                      </div>
                      {a.resolver && (
                        <div className="text-[10px] text-silver-400 mt-1 font-mono">
                          处理人：{a.resolver}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2 pl-1.5 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirm(a);
                      }}
                      disabled={a.resolved !== "PENDING"}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-mine-700/70 border border-mine-600 text-silver-300 hover:text-fix-400 hover:border-fix-500/50 disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                    >
                      <CircleDot className="w-3 h-3" />
                      确认
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolve(a);
                      }}
                      disabled={a.resolved === "RESOLVED"}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-mine-700/70 border border-mine-600 text-silver-300 hover:text-pass-400 hover:border-pass-500/50 disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                    >
                      <CheckCheck className="w-3 h-3" />
                      解决
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
