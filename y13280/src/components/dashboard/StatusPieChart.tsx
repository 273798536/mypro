import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import { useStatusCounts } from "@/hooks/useFilter";
import { useAppStore } from "@/store/useAppStore";
import { STATUS_LABEL, STATUS_COLOR, MergeStatus } from "@/types";
import { useState } from "react";
import clsx from "clsx";

const ORDER: MergeStatus[] = ["merged", "pending", "doubtful", "risk"];

export function StatusPieChart() {
  const counts = useStatusCounts();
  const setFilter = useAppStore((s) => s.setFilter);
  const navigate = useNavigate();
  const [hover, setHover] = useState<MergeStatus | null>(null);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const data = ORDER.map((k) => ({
    key: k,
    name: STATUS_LABEL[k],
    value: counts[k],
    color: STATUS_COLOR[k],
  }));

  const handleClick = (key: MergeStatus) => {
    setFilter({ statuses: [key] });
    navigate("/merge");
  };

  return (
    <div className="card-base p-5 animate-fade-up">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-semibold">归并状态分布</h3>
          <p className="text-xs text-neutral-500 mt-0.5">点击扇区直接跳转筛选</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-civic-700">{total}</div>
          <div className="text-xs text-neutral-500">点位总数</div>
        </div>
      </div>

      <div className="relative h-60">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              dataKey="value"
              onMouseEnter={(_, i) => setHover(data[i].key as MergeStatus)}
              onMouseLeave={() => setHover(null)}
              onClick={(_, i) => handleClick(data[i].key as MergeStatus)}
              style={{ cursor: "pointer" }}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.color}
                  stroke={hover === d.key ? "#000" : "#fff"}
                  strokeWidth={hover === d.key ? 2 : 2}
                  opacity={hover && hover !== d.key ? 0.4 : 1}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [
                `${v}条 · ${Math.round((v / total) * 100)}%`,
                name,
              ]}
              contentStyle={{
                borderRadius: "4px",
                border: "1px solid #E7E5E4",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-xs text-neutral-500">已归并占比</div>
            <div className="font-mono text-xl font-bold text-evidence-600">
              {Math.round((counts.merged / total) * 100)}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-neutral-100">
        {data.map((d) => (
          <button
            key={d.key}
            onClick={() => handleClick(d.key)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-civic text-left transition-all text-sm",
              hover === d.key
                ? "bg-neutral-100 shadow-sm"
                : "hover:bg-neutral-50"
            )}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-neutral-700 flex-1 truncate">{d.name}</span>
            <span className="font-mono font-semibold text-neutral-900">
              {d.value}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
