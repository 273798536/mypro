import { BuoyRecord, BuoyField, FIELD_LABELS, FIELD_UNITS } from "@/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatTimestamp } from "@/utils/correctionLogger";

interface Props {
  records: BuoyRecord[];
  field: BuoyField;
  threshold?: number;
}

export default function TrendChart({ records, field, threshold }: Props) {
  const chartData = [...records]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((r) => {
      const val = r[field];
      return {
        id: r.id,
        time: formatTimestamp(r.timestamp).slice(5),
        value: val,
        quality: r.quality,
        triggered:
          val !== null && threshold !== undefined ? val > threshold : false,
      };
    })
    .filter((d) => d.value !== null);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-ocean-50">
            {FIELD_LABELS[field]} 趋势
          </h3>
          <p className="text-xs text-ocean-400 mt-1">
            单位：{FIELD_UNITS[field]}
            {threshold !== undefined && (
              <span className="ml-3">
                参考阈值：
                <span className="text-quality-recollect font-mono">{threshold}</span>{" "}
                {FIELD_UNITS[field]}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-ocean-300">
            <span className="w-3 h-3 rounded bg-ocean-500/60" />
            正常值
          </span>
          <span className="flex items-center gap-1.5 text-quality-recollect">
            <span className="w-3 h-3 rounded-full border-2 border-quality-recollect" />
            超阈值
          </span>
        </div>
      </div>

      <div className="h-64">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-ocean-400/60">
            该字段暂无可展示数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00B4D8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,180,216,0.12)" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#80CAE6", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(0,180,216,0.2)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#80CAE6", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(0,180,216,0.2)" }}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(7, 26, 46, 0.95)",
                  border: "1px solid rgba(0, 180, 216, 0.3)",
                  borderRadius: "8px",
                  color: "#E6F4FA",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#00B4D8", fontWeight: 500 }}
                formatter={(value: number) => [`${value} ${FIELD_UNITS[field]}`, FIELD_LABELS[field]]}
              />
              {threshold !== undefined && (
                <ReferenceLine
                  y={threshold}
                  stroke="#EF4444"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#00B4D8"
                strokeWidth={2}
                fill="url(#colorValue)"
                dot={(props: { cx?: number; cy?: number; payload?: { triggered?: boolean } }) => {
                  const { cx, cy, payload } = props;
                  if (payload.triggered) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="rgba(239,68,68,0.2)"
                        stroke="#EF4444"
                        strokeWidth={2}
                      />
                    );
                  }
                  return null;
                }}
                activeDot={{ r: 5, fill: "#00B4D8", stroke: "#E6F4FA", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
