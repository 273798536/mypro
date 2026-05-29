import NoiseScene from "@/components/scene/NoiseScene";
import SourceFilter from "@/components/panels/SourceFilter";
import FloorPanel from "@/components/panels/FloorPanel";
import TimelineController from "@/components/panels/TimelineController";
import AttributionCard from "@/components/panels/AttributionCard";
import ChartPanel from "@/components/panels/ChartPanel";
import { useNoiseStore } from "@/store/useNoiseStore";
import { Link } from "react-router-dom";
import { Upload, Volume2, Building2 } from "lucide-react";

export default function MapPage() {
  const currentHour = useNoiseStore((s) => s.currentHour);
  const timeCoverage = useNoiseStore((s) => s.timeCoverage);
  const selectedBuildingId = useNoiseStore((s) => s.selectedBuildingId);
  const selectBuilding = useNoiseStore((s) => s.selectBuilding);
  const floorNoiseMap = useNoiseStore((s) => s.floorNoiseMap);
  const selectedFloor = useNoiseStore((s) => s.selectedFloor);
  const buildings = useNoiseStore((s) => s.buildings);
  const enabledTypes = useNoiseStore((s) => s.enabledTypes);

  const coverage = timeCoverage[currentHour];
  const noDataAtHour = coverage && !coverage.hasData;

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0d1117] text-white">
      <header className="flex items-center justify-between border-b border-gray-800 bg-gray-900/90 px-4 py-2">
        <div className="flex items-center gap-3">
          <Volume2 className="h-5 w-5 text-orange-500" />
          <h1 className="text-base font-bold tracking-wide">城市噪声立体地图</h1>
          <span className="rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-400">
            环保监测
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4 text-gray-400" />
            <select
              value={selectedBuildingId || ""}
              onChange={(e) => selectBuilding(e.target.value || null)}
              className="rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-white outline-none focus:border-orange-500"
            >
              <option value="">选择楼栋</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <SourceFilter />
          <Link
            to="/import"
            className="flex items-center gap-1.5 rounded-lg bg-gray-700/60 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-600"
          >
            <Upload className="h-4 w-4" />
            导入管理
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <NoiseScene />

          {noDataAtHour && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
              <div className="rounded-xl border border-gray-600 bg-gray-900/95 px-6 py-4 text-center shadow-2xl">
                <p className="text-lg font-bold text-orange-400">当前时段无数据</p>
                <p className="mt-1 text-sm text-gray-400">
                  {String(currentHour).padStart(2, "0")}:00 无已导入的声源数据，请切换时段或导入数据
                </p>
              </div>
            </div>
          )}

          <AttributionCard />
        </div>

        <div className="flex flex-col border-l border-gray-800">
          <FloorPanel />
          <ChartPanel />
        </div>
      </div>

      <TimelineController />
    </div>
  );
}
