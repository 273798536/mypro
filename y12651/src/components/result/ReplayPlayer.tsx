import { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, AlertTriangle, MessageCircle } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import HudCard from '@/components/ui/HudCard';
import { BOUNDARY_SCENES } from '@/utils/boundaryScenes';
import { cn } from '@/lib/utils';

export default function ReplayPlayer() {
  const frames = useGameStore((s) => s.frames);
  const auditLogs = useGameStore((s) => s.auditLogs);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (playing) {
      timerRef.current = window.setInterval(() => {
        setFrame((f) => {
          if (f >= frames.length - 1) {
            setPlaying(false);
            return f;
          }
          return f + 1;
        });
      }, 500 / speed);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, speed, frames.length]);

  const currentScene = BOUNDARY_SCENES.find((s) => s.triggerFrame === frame);
  const frameLogs = auditLogs.filter((l) => {
    if (!frames[frame]) return false;
    const ts = frames[frame].timestamp;
    return Math.abs(l.timestamp - ts) < 3000;
  });

  const currentFrameData = frames[frame];

  return (
    <HudCard title="时间轴复盘 · REPLAY" accent="cyan">
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2">
          <div className="bg-space-deep/80 rounded border border-cyber-cyan/15 aspect-[4/3] relative overflow-hidden">
            <svg viewBox="-4 -3 8 6" className="w-full h-full">
              <defs>
                <pattern id="grid" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
                  <path d="M 0.5 0 L 0 0 0 0.5" fill="none" stroke="rgba(0,229,255,0.06)" strokeWidth="0.02" />
                </pattern>
              </defs>
              <rect x="-4" y="-3" width="8" height="6" fill="url(#grid)" />

              {currentFrameData?.points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={-p.z}
                  r={p.isOutlier ? 0.07 : 0.035}
                  fill={p.isOutlier ? '#ffd93d' : `rgba(0, 229, 255, ${0.4 + p.intensity * 0.5})`}
                />
              ))}

              <rect
                x={-2.5}
                y={-2.5}
                width="5"
                height="5"
                fill="none"
                stroke="rgba(0,229,255,0.4)"
                strokeWidth="0.04"
                strokeDasharray="0.2 0.15"
              />
            </svg>

            <div className="absolute top-2 left-2 hud-text text-[10px] text-cyber-cyan/80 bg-space-dark/70 px-2 py-0.5 rounded">
              FRAME {frame.toString().padStart(3, '0')}
            </div>
            <div className="absolute top-2 right-2 text-[9px] font-mono text-cyan-300/60 bg-space-dark/70 px-2 py-0.5 rounded">
              {currentFrameData?.syncStatus === 'synced' && <span className="text-success-green">同步正常</span>}
              {currentFrameData?.syncStatus === 'delayed' && <span className="text-warn-yellow">延迟 {currentFrameData?.syncOffsetMs}ms</span>}
              {currentFrameData?.syncStatus === 'skipped' && <span className="text-alert-orange">跳帧!</span>}
              {currentFrameData?.syncStatus === 'offset' && <span className="text-alert-orange">偏移 {currentFrameData?.syncOffsetMs}ms</span>}
            </div>
            <div className="absolute bottom-2 left-2 text-[9px] font-mono text-cyan-300/60 bg-space-dark/70 px-2 py-0.5 rounded">
              {currentFrameData?.points.length || 0} 点
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setFrame(Math.max(0, frame - 1))}
              className="cyber-btn text-[10px] py-1 px-2 flex items-center gap-1"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              onClick={() => setPlaying(!playing)}
              className="cyber-btn cyber-btn-primary text-[10px] py-1 px-3 flex items-center gap-1"
            >
              {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {playing ? '暂停' : '播放'}
            </button>
            <button
              onClick={() => setFrame(Math.min(frames.length - 1, frame + 1))}
              className="cyber-btn text-[10px] py-1 px-2 flex items-center gap-1"
            >
              <SkipForward className="w-3 h-3" />
            </button>
            <div className="flex-1 mx-2">
              <input
                type="range"
                min={0}
                max={frames.length - 1}
                value={frame}
                onChange={(e) => setFrame(parseInt(e.target.value))}
                className="cyber-slider w-full"
              />
            </div>
            <div className="flex gap-0.5">
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    'text-[9px] font-mono px-1.5 py-0.5 clip-chamfer',
                    speed === s ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40' : 'text-cyan-300/50 border border-transparent hover:text-cyber-cyan/80'
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 relative h-5">
            <div className="absolute inset-x-0 top-2 h-1.5 bg-space-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyber-cyan/40 to-cyber-cyan"
                style={{ width: `${(frame / Math.max(1, frames.length - 1)) * 100}%` }}
              />
            </div>
            {BOUNDARY_SCENES.map((s) => (
              <div
                key={s.id}
                className="absolute top-0 w-2 h-5 flex flex-col items-center group"
                style={{ left: `${(s.triggerFrame / Math.max(1, frames.length - 1)) * 100}%`, transform: 'translateX(-50%)' }}
              >
                <AlertTriangle className={cn(
                  'w-3 h-3',
                  frame >= s.triggerFrame ? 'text-alert-orange' : 'text-warn-yellow/50'
                )} />
                <div className="hidden group-hover:block absolute top-5 w-48 bg-space-dark border border-alert-orange/30 rounded p-2 text-[9px] font-mono z-10">
                  <div className="text-alert-orange font-bold">{s.name}</div>
                  <div className="text-cyan-300/70 mt-0.5">{s.description.slice(0, 60)}...</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-3 space-y-2">
          {currentScene && (
            <div className="bg-alert-orange/8 border border-alert-orange/30 rounded p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-alert-orange mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-alert-orange font-mono">
                    关键节点 · {currentScene.name}
                  </div>
                  <div className="text-[10px] text-cyan-300/75 mt-0.5 leading-relaxed">
                    {currentScene.description}
                  </div>
                  <div className="text-[10px] text-warn-yellow/90 mt-1 font-mono">
                    建议修正参数: {Object.entries(currentScene.expectedFix).map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(2) : v}`).join(', ')}
                  </div>
                  <div className="text-[10px] text-success-green/85 mt-0.5 italic">
                    ⚡ {currentScene.consequence}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-mono text-cyan-300/60 mb-1.5 flex items-center gap-1.5">
              <MessageCircle className="w-2.5 h-2.5" />
              当前帧附近操作记录
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-cyber pr-1">
              {frameLogs.length === 0 ? (
                <div className="text-[10px] text-cyan-300/40 italic py-2">此帧附近无操作记录</div>
              ) : (
                frameLogs.map((l) => (
                  <div key={l.id} className="text-[10px] font-mono bg-space-dark/60 rounded px-2 py-1.5 border border-cyber-cyan/10">
                    <div className="flex items-center justify-between">
                      <span className="text-cyber-cyan font-semibold">
                        {l.operator} · {l.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-cyan-300/40">
                        {new Date(l.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
                      </span>
                    </div>
                    <div className="text-cyan-300/70 italic mt-0.5">"{l.reason}"</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </HudCard>
  );
}
