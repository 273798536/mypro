import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { useNoiseStore } from "@/store/useNoiseStore";
import { SOURCE_TYPE_COLORS, NOISE_STANDARD } from "@/types";
import type { NoiseSourceType } from "@/types";

export default function ChartPanel() {
  const selectedBuildingId = useNoiseStore((s) => s.selectedBuildingId);
  const selectedFloor = useNoiseStore((s) => s.selectedFloor);
  const floorNoiseMap = useNoiseStore((s) => s.floorNoiseMap);
  const currentHour = useNoiseStore((s) => s.currentHour);
  const buildings = useNoiseStore((s) => s.buildings);

  if (!selectedBuildingId || selectedFloor === null) return null;

  const floorNoises = floorNoiseMap.get(selectedBuildingId) ?? [];
  const floorData = floorNoises.find((f) => f.floor === selectedFloor);
  if (!floorData) return null;

  const barData = floorData.contributions.map((c) => ({
    name: c.sourceName,
    level: c.level,
    type: c.sourceType,
    distance: c.distance,
  }));

  const building = buildings.find((b) => b.id === selectedBuildingId);
  const buildingName = building?.name ?? "";

  return (
    <div className="border-t border-gray-700 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-400">声源贡献柱状图</h4>
        <span className="text-[10px] text-gray-600">
          当前时段 {String(currentHour).padStart(2, "0")}:00
        </span>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
          <XAxis type="number" domain={[0, 80]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <ReferenceLine x={NOISE_STANDARD} stroke="#ff6b35" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 6, fontSize: 11 }}
            itemStyle={{ color: "#e5e7eb" }}
            formatter={(value: number, name: string, props: { payload: { type: NoiseSourceType; distance: number } }) => {
              const typeName = props.payload.type === "road" ? "道路" : props.payload.type === "construction" ? "工地" : "商业街";
              return [`${value} dB（距${buildingName} ${props.payload.distance}m，${typeName}声源）`, "贡献"];
            }}
          />
          <Bar dataKey="level" radius={[0, 4, 4, 0]} barSize={14}>
            {barData.map((entry, index) => (
              <Cell
                key={index}
                fill={SOURCE_TYPE_COLORS[entry.type as NoiseSourceType]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 border border-dashed border-orange-500" />
          国标限值 {NOISE_STANDARD} dB
        </span>
        {floorData.contributions.map((c) => (
          <span key={c.sourceId}>
            {c.sourceName}贡献 {c.percentage}%，距楼栋 {c.distance}m
          </span>
        ))}
      </div>
    </div>
  );
}
