import { useSimStore } from "../store/simStore";
import ParamPanel from "../components/ParamPanel";
import MetricCards from "../components/MetricCards";
import SimChart from "../components/SimChart";
import TerminalSummary from "../components/TerminalSummary";
import { Play, RotateCcw } from "lucide-react";

export default function SimulationPage() {
  const { isRunning, result, run, scenarioName } = useSimStore();
  const scenarioLabels: Record<string, string> = {
    normal: "正常运行",
    low_chlorine: "余氯偏低",
    pump_shutdown: "泵停机",
    visitor_surge: "客流突增",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-200">仿真总览</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            当前场景：{scenarioLabels[scenarioName] || scenarioName}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={run}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 text-slate-950 font-semibold text-sm rounded-lg transition-all shadow-lg shadow-cyan-500/20"
          >
            {isRunning ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            运行仿真
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-5">
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 mb-3">
            参数设置
          </h3>
          <ParamPanel />
        </div>
        <div className="space-y-4">
          {result ? (
            <>
              <MetricCards />
              <SimChart />
              <TerminalSummary />
            </>
          ) : (
            <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-12 text-center">
              <DropletsIcon />
              <p className="text-slate-500 text-sm mt-4">
                点击「运行仿真」开始计算
              </p>
              <p className="text-slate-700 text-xs mt-1">
                选择场景预设或手动调整参数后运行
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DropletsIcon() {
  return (
    <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 flex items-center justify-center">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
        <path d="M12.56 14.1c1.44 0 2.6-1.19 2.6-2.64 0-.76-.37-1.47-1.11-2.08S12.73 7.89 12.56 7.1c-.19.94-.74 1.85-1.49 2.45s-1.11 1.28-1.11 2c0 1.45 1.17 2.64 2.6 2.64z" />
      </svg>
    </div>
  );
}
