import { Play, Pause } from "lucide-react";
import { useNoiseStore } from "@/store/useNoiseStore";
import { SOURCE_TYPE_COLORS } from "@/types";
import type { NoiseSourceType } from "@/types";

export default function TimelineController() {
  const currentHour = useNoiseStore((s) => s.currentHour);
  const isPlaying = useNoiseStore((s) => s.isPlaying);
  const setCurrentHour = useNoiseStore((s) => s.setCurrentHour);
  const togglePlayback = useNoiseStore((s) => s.togglePlayback);
  const timeCoverage = useNoiseStore((s) => s.timeCoverage);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="w-full bg-gray-900/90 px-4 py-3 text-white">
      <div className="mb-2 flex items-center gap-3">
        <button
          onClick={togglePlayback}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white transition-colors hover:bg-orange-600"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <span className="font-mono text-lg font-bold" style={{ color: "#ff6b35" }}>
          {String(currentHour).padStart(2, "0")}:00
        </span>
        <input
          type="range"
          min={0}
          max={23}
          value={currentHour}
          onChange={(e) => setCurrentHour(Number(e.target.value))}
          className="slider h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-700"
          style={{
            background: `linear-gradient(to right, #ff6b35 0%, #ff6b35 ${(currentHour / 23) * 100}%, #374151 ${(currentHour / 23) * 100}%, #374151 100%)`,
          }}
        />
      </div>

      <div className="relative">
        <div className="flex">
          {hours.map((h) => {
            const coverage = timeCoverage[h];
            const isCurrent = h === currentHour;
            return (
              <div
                key={h}
                className="relative flex flex-1 flex-col items-center"
                onClick={() => setCurrentHour(h)}
              >
                <div
                  className="absolute -top-1 h-5 w-0.5 rounded-full"
                  style={{
                    backgroundColor: isCurrent ? "#ff6b35" : "transparent",
                  }}
                />
                <span
                  className={`mt-5 text-[10px] ${
                    isCurrent ? "font-bold text-orange-400" : "text-gray-500"
                  }`}
                >
                  {h}
                </span>
                <div
                  className={`mt-1 flex h-6 w-full items-center justify-center gap-0.5 rounded-sm border ${
                    coverage?.hasData
                      ? "border-gray-700 bg-gray-800"
                      : "border-dashed border-gray-600 bg-transparent"
                  }`}
                >
                  {coverage?.hasData ? (
                    coverage.sourceTypes.map((st) => (
                      <span
                        key={st}
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: SOURCE_TYPE_COLORS[st as NoiseSourceType] }}
                      />
                    ))
                  ) : (
                    <span className="text-[8px] text-gray-600">无数据</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
