import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useNoiseStore } from "@/store/useNoiseStore";
import { SOURCE_TYPE_COLORS, NOISE_STANDARD } from "@/types";
import type { NoiseContribution } from "@/types";

function getFloorBgColor(level: number): string {
  if (level >= 70) return "bg-red-500/30";
  if (level >= 65) return "bg-orange-500/30";
  if (level >= 55) return "bg-yellow-500/30";
  return "bg-green-500/30";
}

function getFloorBorderColor(level: number): string {
  if (level >= 70) return "border-red-500";
  if (level >= 65) return "border-orange-500";
  if (level >= 55) return "border-yellow-500";
  return "border-green-500";
}

function buildPieData(contributions: NoiseContribution[]) {
  return contributions.map((c) => ({
    name: c.sourceName,
    value: c.percentage,
    type: c.sourceType,
  }));
}

export default function FloorPanel() {
  const selectedBuildingId = useNoiseStore((s) => s.selectedBuildingId);
  const selectedFloor = useNoiseStore((s) => s.selectedFloor);
  const selectFloor = useNoiseStore((s) => s.selectFloor);
  const buildings = useNoiseStore((s) => s.buildings);
  const floorNoiseMap = useNoiseStore((s) => s.floorNoiseMap);

  if (!selectedBuildingId) {
    return (
      <div className="flex h-full w-64 flex-col items-center justify-center bg-gray-900/90 px-4 text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-3 h-10 w-10 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
        </svg>
        <span className="text-sm">点击楼栋查看楼层噪声</span>
      </div>
    );
  }

  const building = buildings.find((b) => b.id === selectedBuildingId);
  if (!building) return null;

  const floorNoises = floorNoiseMap.get(selectedBuildingId) ?? [];
  const selectedFloorData = floorNoises.find((f) => f.floor === selectedFloor);
  const pieData = selectedFloorData ? buildPieData(selectedFloorData.contributions) : [];

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900/90 text-white">
      <div className="border-b border-gray-700 px-4 py-3">
        <h2 className="text-base font-semibold">{building.name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-1">
          {floorNoises.map((fn) => {
            const isSelected = fn.floor === selectedFloor;
            return (
              <button
                key={fn.floor}
                onClick={() => selectFloor(fn.floor)}
                className={`flex items-center justify-between rounded-md border-l-4 px-3 py-1.5 text-left transition-all ${
                  isSelected
                    ? `border-l-orange-500 ${getFloorBgColor(fn.totalLevel)} scale-[1.02]`
                    : `border-l-transparent ${getFloorBgColor(fn.totalLevel)} hover:border-l-gray-500`
                }`}
              >
                <span className="text-sm font-medium">{fn.floor}F</span>
                <span
                  className={`font-mono text-sm ${
                    fn.totalLevel >= NOISE_STANDARD ? "font-bold" : ""
                  }`}
                  style={{ color: fn.totalLevel >= 70 ? "#ff2d2d" : fn.totalLevel >= 65 ? "#ff6b35" : fn.totalLevel >= 55 ? "#ffc107" : "#4caf50" }}
                >
                  {fn.totalLevel} dB
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedFloorData && pieData.length > 0 && (
        <div className="border-t border-gray-700 px-3 py-3">
          <p className="mb-2 text-xs text-gray-400">噪声源贡献占比</p>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={50}
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={SOURCE_TYPE_COLORS[entry.type as keyof typeof SOURCE_TYPE_COLORS]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 6, fontSize: 12 }}
                itemStyle={{ color: "#e5e7eb" }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {selectedFloorData.contributions.map((c) => (
              <div key={c.sourceId} className="flex items-center gap-1 text-xs text-gray-400">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: SOURCE_TYPE_COLORS[c.sourceType] }}
                />
                {c.sourceName}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
