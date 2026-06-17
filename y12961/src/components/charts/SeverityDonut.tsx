import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import ChartTooltip from "./ChartTooltip";
import { severityDonut } from "@/data/selectors";
import type { Batch } from "@/data/types";

export default function SeverityDonut({ batch }: { batch: Batch }) {
  const data = severityDonut(batch);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={3}
            stroke="#0b0d12"
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <ChartTooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-3xl font-semibold text-zinc-50">{total}</span>
        <span className="font-mono text-[10px] text-ink-500">路由总数</span>
      </div>
    </div>
  );
}
