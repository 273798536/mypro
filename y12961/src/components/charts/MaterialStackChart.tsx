import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import ChartTooltip from "./ChartTooltip";
import { materialStack } from "@/data/selectors";
import type { Batch } from "@/data/types";

export default function MaterialStackChart({ batch }: { batch: Batch }) {
  const data = materialStack(batch);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,145,190,0.1)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#5b6478", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: "#5b6478", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={28} />
        <ChartTooltip />
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
          iconType="circle"
          iconSize={7}
        />
        <Bar dataKey="pass" name="通过" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} maxBarSize={42} stroke="rgba(52,211,153,0.3)" strokeWidth={1} />
        <Bar dataKey="warn" name="告警" stackId="a" fill="#fbbf24" maxBarSize={42} stroke="rgba(251,191,36,0.3)" strokeWidth={1} />
        <Bar dataKey="fail" name="阻断" stackId="a" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={42} stroke="rgba(251,113,133,0.3)" strokeWidth={1} />
      </BarChart>
    </ResponsiveContainer>
  );
}
