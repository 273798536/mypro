import { useEffect } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts"
import { useOceanStore } from "@/store/useOceanStore"
import { AlertTriangle } from "lucide-react"

export default function TidalChart() {
  const { tidalRecords, qualityIssues } = useOceanStore()

  const data = tidalRecords
    .filter((r) => r.tideLevel !== null)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((r) => ({
      time: r.timestamp.slice(11, 16),
      tideLevel: r.tideLevel!,
      id: r.id,
      hasIssue: qualityIssues.some(
        (i) => i.recordId === r.id && i.status !== "resolved"
      ),
    }))

  const nullRecordTimes = tidalRecords
    .filter((r) => r.tideLevel === null)
    .map((r) => r.timestamp.slice(11, 16))

  const issueDots = data.filter((d) => d.hasIssue)

  useEffect(() => {}, [tidalRecords, qualityIssues])

  return (
    <div className="bg-ocean-deep rounded-xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-serif text-base">潮汐曲线</h3>
        {nullRecordTimes.length > 0 && (
          <div className="flex items-center gap-2 text-ocean-coral text-xs">
            <AlertTriangle size={14} />
            <span>空值时段: {nullRecordTimes.join("、")}</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="time"
            stroke="rgba(255,255,255,0.5)"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
            unit="m"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0A2342",
              border: "1px solid rgba(46,196,182,0.3)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "13px",
            }}
            formatter={(value: number) => [`${value}m`, "潮位"]}
          />
          <Line
            type="monotone"
            dataKey="tideLevel"
            stroke="#2EC4B6"
            strokeWidth={2.5}
            dot={{ fill: "#2EC4B6", r: 4 }}
            activeDot={{ r: 6, fill: "#2EC4B6", stroke: "#fff", strokeWidth: 2 }}
          />
          {issueDots.map((dot) => (
            <ReferenceDot
              key={dot.id}
              x={dot.time}
              y={dot.tideLevel}
              r={6}
              fill="#FF6B35"
              stroke="#FF6B35"
              className="animate-pulse-coral"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
