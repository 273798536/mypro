import { ChevronLeft, ChevronRight, Gauge } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { BOUNDARY_SCENES } from '@/utils/boundaryScenes';
import { cn } from '@/lib/utils';

export default function TimelinePlayer() {
  const currentFrame = useGameStore((s) => s.currentFrame);
  const totalFrames = useGameStore((s) => s.totalFrames);
  const playSpeed = useGameStore((s) => s.playSpeed);
  const frames = useGameStore((s) => s.frames);
  const status = useGameStore((s) => s.status);
  const setCurrentFrame = useGameStore((s) => s.setCurrentFrame);
  const setPlaySpeed = useGameStore((s) => s.setPlaySpeed);
  const detectedSyncIssues = useGameStore((s) => s.detectedSyncIssues);

  const speeds = [0.5, 1, 2, 4];
  const frame = frames[currentFrame];
  const syncOffsetMs = frame?.syncOffsetMs ?? 0;

  return (
    <div className="glass-panel clip-chamfer p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="hud-text text-xs text-cyber-cyan/80 flex items-center gap-1.5">
          <Gauge className="w-3 h-3" />
          时间轴 / TIMELINE
        </div>
        <div className="flex items-center gap-1">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setPlaySpeed(s)}
              className={cn(
                'text-[10px] font-mono px-1.5 py-0.5 clip-chamfer transition-all',
                playSpeed === s
                  ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/50'
                  : 'text-cyan-300/50 hover:text-cyber-cyan/80 border border-transparent'
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-10 flex items-center">
        <div className="absolute inset-x-0 h-2 bg-space-dark/80 rounded-sm border border-cyber-cyan/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyber-cyan/40 via-cyber-cyan/70 to-cyber-cyan/90 transition-all duration-200"
            style={{ width: `${(currentFrame / Math.max(1, totalFrames - 1)) * 100}%` }}
          />
          {BOUNDARY_SCENES.map((scene) => {
            const pos = scene.triggerFrame / Math.max(1, totalFrames - 1);
            const detected = detectedSyncIssues.includes(scene.id);
            return (
              <div
                key={scene.id}
                className={cn(
                  'absolute top-0 bottom-0 w-0.5 transition-colors',
                  detected ? 'bg-alert-orange' : 'bg-warn-yellow/60'
                )}
                style={{ left: `${pos * 100}%` }}
                title={`${scene.name} 帧${scene.triggerFrame}`}
              />
            );
          })}
        </div>

        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentFrame}
          onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
          disabled={status === 'idle' || status === 'finished'}
          className="absolute inset-x-0 w-full opacity-0 cursor-pointer"
          style={{ height: '40px' }}
        />

        <div
          className="absolute w-4 h-6 bg-cyber-cyan clip-chamfer shadow-[0_0_12px_rgba(0,229,255,0.6)] transition-all duration-150 pointer-events-none"
          style={{
            left: `calc(${(currentFrame / Math.max(1, totalFrames - 1)) * 100}% - 8px)`,
          }}
        />
      </div>

      <div className="flex justify-between text-[9px] font-mono text-cyan-300/50">
        <span>0</span>
        <span>{Math.floor((totalFrames - 1) / 4)}</span>
        <span>{Math.floor((totalFrames - 1) / 2)}</span>
        <span>{Math.floor((totalFrames - 1) * 0.75)}</span>
        <span>{totalFrames - 1}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-cyan-300/60">帧状态:</span>
          <span className={cn(
            'px-1.5 py-0.5 rounded',
            frame?.syncStatus === 'synced' && 'text-success-green bg-success-green/15 border border-success-green/30',
            frame?.syncStatus === 'delayed' && 'text-warn-yellow bg-warn-yellow/15 border border-warn-yellow/30',
            frame?.syncStatus === 'skipped' && 'text-alert-orange bg-alert-orange/15 border border-alert-orange/30',
            frame?.syncStatus === 'offset' && 'text-alert-orange bg-alert-orange/15 border border-alert-orange/30'
          )}>
            {frame?.syncStatus === 'synced' && '同步正常'}
            {frame?.syncStatus === 'delayed' && `延迟 ${syncOffsetMs}ms`}
            {frame?.syncStatus === 'skipped' && '跳帧!'}
            {frame?.syncStatus === 'offset' && `偏移 ${syncOffsetMs}ms`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}
            disabled={status === 'idle'}
            className="p-1 text-cyber-cyan/70 hover:text-cyber-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-cyber-cyan tabular-nums px-2">
            {currentFrame.toString().padStart(3, '0')}
          </span>
          <button
            onClick={() => setCurrentFrame(Math.min(totalFrames - 1, currentFrame + 1))}
            disabled={status === 'idle'}
            className="p-1 text-cyber-cyan/70 hover:text-cyber-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {BOUNDARY_SCENES.map((s) => (
          <div
            key={s.id}
            className={cn(
              'text-[9px] font-mono px-1.5 py-0.5 rounded clip-chamfer',
              detectedSyncIssues.includes(s.id)
                ? 'bg-alert-orange/15 text-alert-orange border border-alert-orange/40'
                : 'bg-cyan-300/5 text-cyan-300/40 border border-cyan-300/10'
            )}
          >
            帧{s.triggerFrame}·{s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
