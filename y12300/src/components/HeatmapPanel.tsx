import { AlertTriangle } from 'lucide-react';
import { floors, halls, visitorRecords, dataSources } from '@/data/museum-data';
import { useMuseumStore } from '@/store/museum-store';

function getHeatColor(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped < 0.5) {
    const t = clamped / 0.5;
    const r = Math.round(33 + t * (255 - 33));
    const g = Math.round(150 + t * (235 - 150));
    const b = Math.round(243 + t * (59 - 243));
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (clamped - 0.5) / 0.5;
    const r = Math.round(255 + t * (255 - 255));
    const g = Math.round(235 + t * (87 - 235));
    const b = Math.round(59 + t * (34 - 59));
    return `rgb(${r},${g},${b})`;
  }
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function HeatmapPanel() {
  const selectedFloor = useMuseumStore((s) => s.selectedFloor);
  const selectedTimeRange = useMuseumStore((s) => s.selectedTimeRange);
  const setSelectedTimeRange = useMuseumStore((s) => s.setSelectedTimeRange);
  const heatmapOpacity = useMuseumStore((s) => s.heatmapOpacity);
  const setHeatmapOpacity = useMuseumStore((s) => s.setHeatmapOpacity);
  const setSelectedHall = useMuseumStore((s) => s.setSelectedHall);
  const validationIssues = useMuseumStore((s) => s.validationIssues);

  const floor = floors.find((f) => f.id === selectedFloor);
  const floorHalls = halls.filter((h) => h.floorId === selectedFloor);

  const filteredRecords = visitorRecords.filter(
    (r) =>
      floorHalls.some((h) => h.id === r.hallId) &&
      r.timestamp >= selectedTimeRange[0] &&
      r.timestamp <= selectedTimeRange[1]
  );

  const hallCounts: Record<string, number> = {};
  for (const hall of floorHalls) {
    hallCounts[hall.id] = filteredRecords
      .filter((r) => r.hallId === hall.id)
      .reduce((sum, r) => sum + r.count, 0);
  }

  const GRID_W = 280;
  const GRID_H = 200;
  const allX = floorHalls.map((h) => h.geometry.x);
  const allZ = floorHalls.map((h) => h.geometry.z);
  const allRight = floorHalls.map((h) => h.geometry.x + h.geometry.width);
  const allBottom = floorHalls.map((h) => h.geometry.z + h.geometry.depth);
  const minX = Math.min(...allX, -10);
  const minZ = Math.min(...allZ, -6);
  const maxX = Math.max(...allRight, 10);
  const maxZ = Math.max(...allBottom, 6);
  const scaleX = GRID_W / (maxX - minX);
  const scaleZ = GRID_H / (maxZ - minZ);

  const floorSources = dataSources.filter((ds) =>
    filteredRecords.some((r) => r.source === ds.systemName)
  );

  const floorIssues = validationIssues.filter((issue) =>
    issue.affectedHalls.some((hid) => floorHalls.some((h) => h.id === hid))
  );

  const centerTime = (selectedTimeRange[0] + selectedTimeRange[1]) / 2;

  return (
    <div className="p-3 space-y-3 text-xs text-white/80">
      <div className="text-sm font-semibold text-white">
        楼层热力分布 <span className="text-white/50 font-normal">{floor?.name ?? ''}</span>
      </div>

      <div
        className="relative bg-white/5 rounded border border-white/10"
        style={{ width: GRID_W, height: GRID_H }}
      >
        {floorHalls.map((hall) => {
          const ratio = hallCounts[hall.id] / hall.capacity;
          const left = (hall.geometry.x - minX) * scaleX;
          const top = (hall.geometry.z - minZ) * scaleZ;
          const w = hall.geometry.width * scaleX;
          const h = hall.geometry.depth * scaleZ;
          return (
            <div
              key={hall.id}
              role="button"
              tabIndex={0}
              aria-label={`${hall.name}: ${hallCounts[hall.id]}/${hall.capacity}`}
              title={`${hall.name}: ${hallCounts[hall.id]}/${hall.capacity}`}
              className="absolute rounded cursor-pointer hover:brightness-125 transition-all flex items-center justify-center text-[9px] text-white/70 font-medium"
              style={{
                left,
                top,
                width: w,
                height: h,
                backgroundColor: getHeatColor(ratio),
                opacity: heatmapOpacity,
              }}
              onClick={() => setSelectedHall(hall.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedHall(hall.id); }}
            >
              {w > 40 ? hall.name : ''}
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <div className="h-3 rounded" style={{ background: 'linear-gradient(to right, #2196F3, #FFEB3B, #FF5722)' }} />
        <div className="flex justify-between text-[10px] text-white/40">
          <span>低密度</span>
          <span>高密度</span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between"><span>热力透明度</span><span>{heatmapOpacity.toFixed(1)}</span></div>
        <input
          type="range" min={0} max={1} step={0.1}
          value={heatmapOpacity}
          onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
          className="w-full accent-[#00E676] h-1"
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between"><span>时间范围</span><span>{formatTime(selectedTimeRange[0])} - {formatTime(selectedTimeRange[1])}</span></div>
        <input
          type="range" min={9 * 3600} max={17 * 3600} step={1800}
          value={centerTime}
          onChange={(e) => {
            const c = Number(e.target.value);
            setSelectedTimeRange([c - 3600, c + 3600]);
          }}
          className="w-full accent-[#00E676] h-1"
        />
      </div>

      <div className="space-y-1 text-white/40">
        <div className="text-white/60">数据来源</div>
        {floorSources.map((ds) => (
          <div key={ds.id}>{ds.systemName} ({ds.version})</div>
        ))}
      </div>

      {floorIssues.length > 0 && (
        <div className="space-y-1">
          <div className="text-white/60">校验警告</div>
          {floorIssues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-start gap-1 p-1.5 bg-white/5 rounded cursor-pointer hover:bg-white/10"
              onClick={() => {
                const hallId = issue.affectedHalls[0];
                if (hallId) setSelectedHall(hallId);
              }}
            >
              <AlertTriangle className={`w-3 h-3 shrink-0 mt-0.5 ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
              <span className={`text-[10px] px-1 rounded shrink-0 ${issue.severity === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {issue.severity === 'error' ? '错误' : '警告'}
              </span>
              <span className="text-[10px] text-white/50 truncate">{issue.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
