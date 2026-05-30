import type { ExitFlowInfo, FloorPlan } from "@/types";
import { ArrowRight, AlertTriangle } from "lucide-react";

interface ExitFlowPanelProps {
  exitFlows: ExitFlowInfo[];
  floors: FloorPlan[];
}

export default function ExitFlowPanel({ exitFlows, floors }: ExitFlowPanelProps) {
  const getExitName = (exitId: string): string => {
    for (const floor of floors) {
      const exit = floor.exits.find((e) => e.id === exitId);
      if (exit) return `${floor.name.replace(/\d+F\s*/, "")}${exit.direction}向`;
    }
    return exitId;
  };

  return (
    <div className="bg-bg-light/80 backdrop-blur-sm rounded-lg border border-gray-700/40 p-3 space-y-2">
      <div className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
        <ArrowRight size={12} className="text-info" />
        出口流量
      </div>
      {exitFlows.length === 0 && (
        <div className="text-xs text-gray-500 italic">模拟未开始</div>
      )}
      {exitFlows.map((flow) => {
        const pct = Math.min(100, Math.floor(flow.congestionLevel * 100));
        let barColor = "bg-safe";
        let textColor = "text-safe";
        if (pct > 120) { barColor = "bg-danger"; textColor = "text-danger"; }
        else if (pct > 80) { barColor = "bg-accent"; textColor = "text-accent"; }
        else if (pct > 50) { barColor = "bg-warn"; textColor = "text-warn"; }

        return (
          <div key={flow.exitId} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 truncate">{getExitName(flow.exitId)}</span>
              <span className={`font-mono ${textColor}`}>
                {pct > 80 && <AlertTriangle size={10} className="inline mr-0.5" />}
                {pct}%
              </span>
            </div>
            <div className="w-full bg-gray-700/50 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>排队 {flow.queueSize}人</span>
              <span>流量 {flow.flow}/s</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
