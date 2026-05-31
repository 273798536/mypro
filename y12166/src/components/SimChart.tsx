import { useSimStore } from "../store/simStore";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ELECTRICITY_COLORS } from "../data/constants";

export default function SimChart() {
  const result = useSimStore((s) => s.result);
  if (!result) return null;

  const data = result.hourlyResults.map((r) => ({
    hour: `${String(r.hour).padStart(2, "0")}:00`,
    chlorineLevel: r.chlorineLevel,
    pumpRunning: r.pumpRunning ? 1 : 0,
    electricityType: r.electricityType,
    electricityPrice: r.electricityPrice,
    visitorCount: r.visitorCount,
  }));

  const threshold = result.params.chlorineThreshold;

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">
          24h 仿真时序图
        </h3>
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
            余氯
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-amber-500/50 inline-block rounded-sm" />
            泵运行
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-400/60 inline-block border-t border-dashed border-red-400" />
            阈值
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="hour"
            tick={{ fill: "#64748b", fontSize: 10 }}
            interval={2}
          />
          <YAxis
            yAxisId="chlorine"
            tick={{ fill: "#64748b", fontSize: 10 }}
            domain={[0, "auto"]}
            label={{
              value: "mg/L",
              angle: -90,
              position: "insideLeft",
              fill: "#64748b",
              fontSize: 10,
            }}
          />
          <YAxis
            yAxisId="pump"
            orientation="right"
            tick={{ fill: "#64748b", fontSize: 10 }}
            domain={[0, 1.2]}
            hide
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: "11px",
              color: "#e2e8f0",
            }}
            formatter={(value: number, name: string) => {
              if (name === "chlorineLevel")
                return [`${value.toFixed(3)} mg/L`, "余氯"];
              if (name === "pumpRunning")
                return [value === 1 ? "运行" : "停止", "泵状态"];
              return [value, name];
            }}
          />
          <ReferenceLine
            yAxisId="chlorine"
            y={threshold}
            stroke="#f87171"
            strokeDasharray="6 3"
            strokeWidth={1}
            label={{
              value: `阈值 ${threshold}`,
              fill: "#f87171",
              fontSize: 10,
              position: "right",
            }}
          />
          <Bar
            yAxisId="pump"
            dataKey="pumpRunning"
            barSize={14}
            radius={[2, 2, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  ELECTRICITY_COLORS[entry.electricityType]
                    ? `${ELECTRICITY_COLORS[entry.electricityType]}40`
                    : "#868e9640"
                }
              />
            ))}
          </Bar>
          <Line
            yAxisId="chlorine"
            type="monotone"
            dataKey="chlorineLevel"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={(props: Record<string, unknown>) => {
              const { cx, cy, payload } = props as {
                cx: number;
                cy: number;
                payload: { chlorineLevel: number };
              };
              if (payload.chlorineLevel < threshold) {
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="#f87171"
                    stroke="#f87171"
                  />
                );
              }
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={2}
                  fill="#22d3ee"
                  stroke="#22d3ee"
                />
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
