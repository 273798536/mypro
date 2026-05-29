import { useGameStore } from '../../store/gameStore';
import { stages } from '../../data/stages';
import { artists } from '../../data/artists';
import { minutesToTimeString } from '../../utils/timeUtils';

const GOLDEN_START = 1080;
const GOLDEN_END = 1260;

function isGolden(start: number, end: number) {
  return start < GOLDEN_END && end > GOLDEN_START;
}

function heatColor(v: number) {
  if (v < 33) return 'from-cyan-500 to-cyan-400';
  if (v < 66) return 'from-cyan-400 to-yellow-400';
  return 'from-yellow-400 to-orange-500';
}

export default function HeatPanel() {
  const heatSnapshots = useGameStore((s) => s.heatSnapshots);
  const scheduleItems = useGameStore((s) => s.scheduleItems);

  const artistMap = new Map(artists.map((a) => [a.name, a]));

  const grouped = stages.map((stage) => ({
    stage,
    snapshots: heatSnapshots
      .filter((s) => s.stageId === stage.id)
      .sort((a, b) => a.timeSlot - b.timeSlot),
  }));

  return (
    <div className="bg-[#0F1419] p-4 space-y-4">
      <h3 className="text-sm font-bold text-gray-300 tracking-wide">观众热度分布</h3>
      {grouped.map(({ stage, snapshots }) => (
        <div key={stage.id}>
          <div className="text-xs text-gray-400 mb-2">{stage.name}</div>
          {snapshots.length === 0 && (
            <div className="text-xs text-gray-600">暂无安排</div>
          )}
          <div className="space-y-2">
            {snapshots.map((snap) => {
              const artistNames = snap.artists.join('、');
              const golden = isGolden(snap.timeSlot, snap.timeSlot + 60);
              const matchedArtists = snap.artists
                .map((name) => artistMap.get(name))
                .filter(Boolean);
              const heatStars = matchedArtists.reduce((s, a) => s + (a?.heat ?? 0), 0);
              const duration = scheduleItems.find(
                (si) => si.startTime === snap.timeSlot && si.stageId === snap.stageId
              );
              const endTime = duration ? duration.endTime : snap.timeSlot + 60;

              return (
                <div key={`${snap.stageId}-${snap.timeSlot}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-24 shrink-0 font-mono">
                      {minutesToTimeString(snap.timeSlot)}-{minutesToTimeString(endTime)}
                    </span>
                    <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${heatColor(snap.heatValue)} rounded transition-all`}
                        style={{ width: `${snap.heatValue}%` }}
                      />
                    </div>
                    <span className={`text-[10px] w-8 text-right ${golden ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>
                      {snap.heatValue}
                    </span>
                    {golden && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-900/60 text-yellow-300">黄金</span>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-500 mt-0.5 ml-[104px]">
                    热度来源：{artistNames} 观众热度 ★×{heatStars}
                    {golden && '，黄金时段加成 ×1.3'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
