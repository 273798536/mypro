import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import ChartTooltip from "./ChartTooltip";
import { shardDistribution } from "@/data/selectors";
import type { Batch } from "@/data/types";

export default function ShardDistChart({ batch }: { batch: Batch }) {
  const data = shardDistribution(batch);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={4} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,145,190,0.1)" vertical={false} />
        <XAxis dataKey="db" tick={{ fill: "#5b6478", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: "#5b6478", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={28} />
        <ChartTooltip />
        <Bar dataKey="routes" name="路由条数" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={26} stroke="rgba(56,189,248,0.4)" strokeWidth={1} />
        <Bar dataKey="issues" name="问题条数" radius={[4, 4, 0, 0]} maxBarSize={26} stroke="rgba(251,113,133,0.4)" strokeWidth={1}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.issues > 0 ? "#fb7185" : "rgba(125,145,190,0.18)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
