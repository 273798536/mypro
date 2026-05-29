import { useNoiseStore } from "@/store/useNoiseStore";
import { SOURCE_TYPE_COLORS, NOISE_STANDARD, getNoiseLevel } from "@/types";

export default function AttributionCard() {
  const selectedBuildingId = useNoiseStore((s) => s.selectedBuildingId);
  const selectedFloor = useNoiseStore((s) => s.selectedFloor);
  const buildings = useNoiseStore((s) => s.buildings);
  const floorNoiseMap = useNoiseStore((s) => s.floorNoiseMap);

  if (!selectedBuildingId || selectedFloor === null) return null;

  const building = buildings.find((b) => b.id === selectedBuildingId);
  if (!building) return null;

  const floorNoises = floorNoiseMap.get(selectedBuildingId) ?? [];
  const floorData = floorNoises.find((f) => f.floor === selectedFloor);
  if (!floorData) return null;

  const { label, color } = getNoiseLevel(floorData.totalLevel);
  const isExceeding = floorData.totalLevel >= NOISE_STANDARD;

  return (
    <div className="absolute bottom-4 right-4 z-10 w-80 rounded-xl border border-gray-700 bg-gray-900/95 p-4 text-white shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">
            {building.name} · {selectedFloor}F
          </h3>
          <span className="font-mono text-sm font-bold" style={{ color }}>
            {floorData.totalLevel} dB
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: isExceeding ? `${color}33` : "#4caf5033",
            color,
          }}
        >
          {isExceeding ? "超标" : "达标"}
        </span>
      </div>

      <p className="mb-2 text-xs text-gray-400">为什么这层吵</p>

      <div className="flex flex-col gap-2.5">
        {floorData.contributions.map((c) => {
          const srcColor = SOURCE_TYPE_COLORS[c.sourceType];
          return (
            <div key={c.sourceId} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: srcColor }}
                  />
                  <span className="text-xs text-gray-300">{c.sourceName}</span>
                </div>
                <span className="font-mono text-xs" style={{ color: srcColor }}>
                  {c.level} dB
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${c.percentage}%`,
                    backgroundColor: srcColor,
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-500">
                {c.attenuationNote}
              </p>
            </div>
          );
        })}
      </div>

      {floorData.occlusionNote && (
        <div className="mt-3 rounded-md border border-gray-700 bg-gray-800/50 px-2.5 py-1.5 text-xs text-gray-400">
          {floorData.occlusionNote}
        </div>
      )}
    </div>
  );
}
