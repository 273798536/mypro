import { useSimStore } from "../store/simStore";
import { ELECTRICITY_LABELS, ELECTRICITY_COLORS } from "../data/constants";

export default function ScheduleTable() {
  const result = useSimStore((s) => s.result);
  if (!result) return null;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          24h 电价排程与泵启停建议
        </h3>
        <div className="grid grid-cols-12 gap-1">
          {result.hourlyResults.map((r) => (
            <div
              key={r.hour}
              className="rounded-md p-1.5 text-center text-[10px] transition-all hover:scale-105"
              style={{
                backgroundColor: `${ELECTRICITY_COLORS[r.electricityType]}15`,
                border: `1px solid ${ELECTRICITY_COLORS[r.electricityType]}30`,
              }}
            >
              <div className="text-slate-500 font-mono">
                {String(r.hour).padStart(2, "0")}
              </div>
              <div
                className="font-semibold mt-0.5"
                style={{ color: ELECTRICITY_COLORS[r.electricityType] }}
              >
                {ELECTRICITY_LABELS[r.electricityType]}
              </div>
              <div className="mt-0.5">
                {r.pumpRunning ? (
                  <span className="text-emerald-400">▶ 运行</span>
                ) : r.pumpScheduled && !r.pumpRunning ? (
                  <span className="text-red-400">✕ 停机</span>
                ) : (
                  <span className="text-slate-600">— 停止</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          余氯补给与投加建议
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700/40">
                <th className="py-2 px-2 text-left">时段</th>
                <th className="py-2 px-2 text-right">余氯</th>
                <th className="py-2 px-2 text-right">投加前</th>
                <th className="py-2 px-2 text-center">投加</th>
                <th className="py-2 px-2 text-center">泵</th>
                <th className="py-2 px-2 text-right">电费</th>
                <th className="py-2 px-2 text-left">建议</th>
              </tr>
            </thead>
            <tbody>
              {result.hourlyResults.map((r) => (
                <tr
                  key={r.hour}
                  className={`border-b border-slate-800/40 ${
                    r.anomaly ? "bg-red-500/5" : ""
                  } ${r.chlorineDosed ? "bg-amber-500/5" : ""}`}
                >
                  <td className="py-1.5 px-2 font-mono text-slate-400">
                    {String(r.hour).padStart(2, "0")}:00
                  </td>
                  <td
                    className={`py-1.5 px-2 text-right font-mono ${
                      r.chlorineLevel < result.params.chlorineThreshold
                        ? "text-red-400"
                        : "text-slate-300"
                    }`}
                  >
                    {r.chlorineLevel.toFixed(3)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-500">
                    {r.chlorineBeforeDose.toFixed(3)}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {r.chlorineDosed ? (
                      <span className="text-amber-400">+{result.params.chlorineDoseAmount}</span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {r.pumpRunning ? (
                      <span className="text-emerald-400">●</span>
                    ) : r.pumpScheduled && !r.pumpRunning ? (
                      <span className="text-red-400">✕</span>
                    ) : (
                      <span className="text-slate-700">○</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">
                    {r.electricityCost.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-2 text-slate-500 max-w-[200px] truncate">
                    {r.anomaly
                      ? r.anomaly.description
                      : r.chlorineDosed
                      ? "自动投加余氯"
                      : r.pumpRunning
                      ? "正常循环"
                      : "待机"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          排程成本对比
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "全日运行",
              cost: result.hourlyResults.reduce(
                (s, r) => s + result.params.pumpFlow * 0.15 * r.electricityPrice,
                0
              ),
            },
            {
              label: "谷时优先",
              cost: result.hourlyResults
                .filter(
                  (r) =>
                    r.electricityType === "valley" ||
                    r.chlorineLevel < result.params.chlorineThreshold
                )
                .reduce(
                  (s, r) => s + result.params.pumpFlow * 0.15 * r.electricityPrice,
                  0
                ),
            },
            {
              label: "当前排程",
              cost: result.summary.totalCost,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3 text-center"
            >
              <div className="text-[10px] text-slate-500 mb-1">{item.label}</div>
              <div className="text-lg font-bold font-mono text-amber-400">
                ¥{item.cost.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
