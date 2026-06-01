import { Play, Pause, Square, ChevronRight } from 'lucide-react';
import { routes, halls, stairways } from '@/data/museum-data';
import { useMuseumStore } from '@/store/museum-store';

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  main: { label: '主路线', cls: 'bg-green-500/20 text-green-400' },
  secondary: { label: '次路线', cls: 'bg-blue-500/20 text-blue-400' },
  emergency: { label: '应急', cls: 'bg-red-500/20 text-red-400' },
};

function resolveName(id: string): string {
  const hall = halls.find((h) => h.id === id);
  if (hall) return hall.name;
  const stair = stairways.find((s) => s.id === id);
  if (stair) return stair.name;
  return id;
}

export default function RoutePanel() {
  const playingRouteId = useMuseumStore((s) => s.playingRouteId);
  const setPlayingRouteId = useMuseumStore((s) => s.setPlayingRouteId);
  const routePlaybackSpeed = useMuseumStore((s) => s.routePlaybackSpeed);
  const setRoutePlaybackSpeed = useMuseumStore((s) => s.setRoutePlaybackSpeed);
  const routePlaybackProgress = useMuseumStore((s) => s.routePlaybackProgress);
  const setRoutePlaybackProgress = useMuseumStore((s) => s.setRoutePlaybackProgress);
  const validationIssues = useMuseumStore((s) => s.validationIssues);

  const playingRoute = routes.find((r) => r.id === playingRouteId);
  const speeds = [0.5, 1, 2];

  const segmentIssues = (routeId: string) =>
    validationIssues.filter(
      (v) => v.type === 'route_breakpoint' && v.affectedRoutes.includes(routeId)
    );

  return (
    <div className="p-3 space-y-3 text-xs text-white/80">
      <div className="text-sm font-semibold text-white">客流路线播放</div>

      <div className="space-y-1.5">
        {routes.map((route) => {
          const isPlaying = playingRouteId === route.id;
          const badge = TYPE_BADGE[route.type];
          return (
            <div
              key={route.id}
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                isPlaying ? 'bg-[#00E676]/10 border border-[#00E676]/30' : 'bg-white/5 border border-transparent hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setPlayingRouteId(isPlaying ? null : route.id)}
                  className="shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-[#00E676]" />
                  ) : (
                    <Play className="w-4 h-4 text-white/60" />
                  )}
                </button>
                <span className="truncate">{route.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {playingRoute && (
        <div className="space-y-2 p-2 bg-white/5 rounded">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00E676] rounded-full transition-all"
                style={{ width: `${routePlaybackProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-white/40 w-8 text-right">{Math.round(routePlaybackProgress)}%</span>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setPlayingRouteId(playingRouteId ? null : null)}
              className="p-1 hover:bg-white/10 rounded"
            >
              {playingRouteId ? <Pause className="w-4 h-4 text-white/70" /> : <Play className="w-4 h-4 text-white/70" />}
            </button>
            <div className="flex items-center gap-1">
              {speeds.map((sp) => (
                <button
                  key={sp}
                  onClick={() => setRoutePlaybackSpeed(sp)}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    routePlaybackSpeed === sp
                      ? 'bg-[#00E676]/20 text-[#00E676]'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {sp}x
                </button>
              ))}
            </div>
            <button
              onClick={() => { setPlayingRouteId(null); setRoutePlaybackProgress(0); }}
              className="p-1 hover:bg-white/10 rounded"
            >
              <Square className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>
        </div>
      )}

      {playingRoute && (
        <div className="space-y-1">
          <div className="text-white/60 text-[10px]">路线段</div>
          {playingRoute.segments
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((seg) => {
              const hasIssue = segmentIssues(playingRoute.id).some(
                (v) => v.relatedObjectId === seg.id
              );
              return (
                <div key={seg.id} className="flex items-center gap-1 py-0.5 text-[11px] text-white/60 relative">
                  {hasIssue && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="断点异常" />
                  )}
                  <span>{resolveName(seg.fromId)}</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  <span>{resolveName(seg.toId)}</span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
