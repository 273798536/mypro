import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MiniTrendProps {
  data: { t: string; v: number }[];
  color: string;
  height?: number;
}

export function MiniTrend({ data, color, height = 40 }: MiniTrendProps) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`mini-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "#0A1628",
              border: "1px solid #1E3A5C",
              borderRadius: 6,
              fontSize: 11,
              color: "#d1e2f5",
            }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#mini-${color.slice(1)})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function makeTrend(base: number, variance: number, len = 12, seed = 1) {
  const arr: { t: string; v: number }[] = [];
  let v = base;
  let s = seed;
  for (let i = 0; i < len; i++) {
    s = (s * 9301 + 49297) % 233280;
    v = base + (s / 233280 - 0.5) * 2 * variance + Math.sin(i / 2) * variance * 0.3;
    arr.push({ t: `h${i + 1}`, v: Math.round(v * 10) / 10 });
  }
  return arr;
}

export { CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart };
