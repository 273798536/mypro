import { useStore } from "@/store/useStore";
import { WORKING_CONDITION_GROUPS } from "@/utils/engine";
import { TrendingUp, BarChart3, Info } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useState } from "react";
import type { WorkingConditionGroup } from "@/types";

const GROUP_COLORS: Record<string, string> = {
  load_low: "#22c55e",
  load_mid: "#06b6d4",
  load_high: "#f59e0b",
  time_day: "#8b5cf6",
  time_night: "#6366f1",
  temp_low: "#3b82f6",
  temp_normal: "#14b8a6",
  temp_high: "#ef4444",
};

export default function Trends() {
  const { trendComparison, isCalculated } = useStore();
  const [selectedGroups, setSelectedGroups] = useState<string[]>(["load_low", "load_mid", "load_high"]);

  if (!isCalculated || !trendComparison) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="card text-center py-16">
          <TrendingUp size={40} className="mx-auto mb-4" style={{ color: "var(--color-text-muted)" }} />
          <p style={{ color: "var(--color-text-muted)" }}>请先在工作台启动核算</p>
        </div>
      </div>
    );
  }

  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const visibleGroups = trendComparison.groups.filter((g) =>
    selectedGroups.includes(g.groupId)
  );

  const maxLen = Math.max(...visibleGroups.map((g) => g.data.length), 0);
  const chartData = Array.from({ length: maxLen }, (_, i) => {
    const point: Record<string, string | number> = { time: visibleGroups[0]?.data[i]?.time || `${i}` };
    for (const g of visibleGroups) {
      point[`${g.groupId}_loss`] = g.data[i]?.lossKW ?? 0;
      point[`${g.groupId}_temp`] = g.data[i]?.tempC ?? 0;
    }
    return point;
  });

  const groupTypeMap: Record<string, WorkingConditionGroup["type"]> = {};
  for (const g of WORKING_CONDITION_GROUPS) {
    groupTypeMap[g.id] = g.type;
  }

  const groupedOptions: { type: string; label: string; groups: typeof WORKING_CONDITION_GROUPS }[] = [
    { type: "load_rate", label: "按负载率", groups: WORKING_CONDITION_GROUPS.filter((g) => g.type === "load_rate") },
    { type: "time_period", label: "按时间段", groups: WORKING_CONDITION_GROUPS.filter((g) => g.type === "time_period") },
    { type: "temp_range", label: "按温度段", groups: WORKING_CONDITION_GROUPS.filter((g) => g.type === "temp_range") },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          趋势对比
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          多工况分组损耗趋势对比，异常解释随分组联动
        </p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} style={{ color: "var(--color-amber)" }} />
          <span className="text-sm font-medium">选择对比分组</span>
        </div>
        <div className="space-y-3">
          {groupedOptions.map((category) => (
            <div key={category.type}>
              <p className="text-xs mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                {category.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {category.groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                      selectedGroups.includes(g.id)
                        ? "border-transparent"
                        : "border-[var(--color-border)] bg-[var(--color-bg-primary)]"
                    }`}
                    style={
                      selectedGroups.includes(g.id)
                        ? { backgroundColor: `${GROUP_COLORS[g.id]}20`, color: GROUP_COLORS[g.id], borderColor: `${GROUP_COLORS[g.id]}40` }
                        : { color: "var(--color-text-secondary)" }
                    }
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} style={{ color: "var(--color-cyan)" }} />
          <span className="text-sm font-medium">损耗趋势对比</span>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="time"
                tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
                tickLine={{ stroke: "var(--color-border)" }}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <YAxis
                yAxisId="loss"
                tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
                tickLine={{ stroke: "var(--color-border)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                label={{ value: "kW", angle: -90, position: "insideLeft", fill: "var(--color-text-muted)", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "var(--color-text-primary)" }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", color: "var(--color-text-secondary)" }}
              />
              {visibleGroups.map((g) => (
                <Line
                  key={g.groupId}
                  yAxisId="loss"
                  type="monotone"
                  dataKey={`${g.groupId}_loss`}
                  name={g.label}
                  stroke={GROUP_COLORS[g.groupId] || "#06b6d4"}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} style={{ color: "var(--color-amber)" }} />
          <span className="text-sm font-medium">异常解释（随分组联动）</span>
        </div>
        <div className="space-y-2">
          {trendComparison.anomalyExplanations
            .filter((e) => selectedGroups.includes(e.groupId))
            .map((explanation) => {
              const group = WORKING_CONDITION_GROUPS.find((g) => g.id === explanation.groupId);
              return (
                <div
                  key={explanation.groupId}
                  className="flex items-start gap-3 bg-[var(--color-bg-primary)] rounded-lg p-3"
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: GROUP_COLORS[explanation.groupId] || "#06b6d4" }}
                  />
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                      {group?.label || explanation.groupId}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                      {explanation.text}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
