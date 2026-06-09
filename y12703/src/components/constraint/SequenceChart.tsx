import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
} from "recharts";
import type { SequenceProblem } from "@/types";
import { formatNumber } from "@/utils/sequence";

interface Props {
  problem: SequenceProblem;
}

export default function SequenceChart({ problem }: Props) {
  const { computedValues, historicalAnswers, correctedValues, outlierIndices } = problem;
  const displayValues = correctedValues ?? computedValues;
  const data = displayValues.map((v, i) => ({
    idx: i + 1,
    label: `a${i + 1}`,
    computed: computedValues[i],
    historical: historicalAnswers[i],
    corrected: correctedValues?.[i],
    isOutlier: outlierIndices.includes(i),
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-serif font-semibold text-ink-800">
            数列变化趋势图
          </h4>
          <p className="text-xs text-ink-500 mt-0.5">
            红点标记为外推越界项，共 {outlierIndices.length} 处
          </p>
        </div>
        {problem.isExtrapolationOutlier && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-alert-soft text-alert border border-alert/20">
            <span className="w-1.5 h-1.5 rounded-full bg-alert animate-pulse-dot" />
            检测到外推越界
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e4eaf2" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#6287ae" }}
              stroke="#c5d3e4"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6287ae" }}
              stroke="#c5d3e4"
              tickFormatter={(v) => formatNumber(v, 0)}
              width={55}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid #e4eaf2",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(30,58,95,0.08)",
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  computed: "计算值",
                  historical: "历史答案",
                  corrected: "修正值",
                };
                return [formatNumber(value), labels[name] ?? name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(v) =>
                ({ computed: "计算值", historical: "历史答案", corrected: "修正值" }[v] ?? v)
              }
            />
            <Line
              type="monotone"
              dataKey="computed"
              stroke="#6287ae"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#6287ae" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="historical"
              stroke="#2f9e44"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={{ r: 3, fill: "#2f9e44" }}
            />
            {correctedValues && (
              <Line
                type="monotone"
                dataKey="corrected"
                stroke="#1e3a5f"
                strokeWidth={2}
                dot={{ r: 3, fill: "#1e3a5f" }}
              />
            )}
            {outlierIndices.map((i) => (
              <ReferenceDot
                key={i}
                x={data[i]?.label}
                y={computedValues[i]}
                r={8}
                fill="#e03131"
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
