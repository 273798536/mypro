import ControlBar from '@/components/console/ControlBar';
import TimelinePlayer from '@/components/console/TimelinePlayer';
import ParamPanel from '@/components/console/ParamPanel';
import OutlierPanel from '@/components/console/OutlierPanel';
import PointCloudScene from '@/components/scene3d/PointCloudScene';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useGameStore } from '@/store/useGameStore';
import { Play } from 'lucide-react';

export default function ConsolePage() {
  useGameEngine();
  const status = useGameStore((s) => s.status);
  const startGame = useGameStore((s) => s.startGame);

  return (
    <div className="w-full h-full flex flex-col bg-space-deep overflow-hidden">
      <ControlBar />

      {status === 'idle' ? (
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 grid-bg" />
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyber-cyan/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-alert-orange/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative text-center max-w-xl px-8">
            <div className="hud-text text-xs text-cyber-cyan/50 tracking-[0.4em] mb-4">
              POINT CLOUD SECTION ANALYSIS · TRAINING MODE
            </div>
            <h1 className="hud-text text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan via-cyan-300 to-cyber-cyan mb-4">
              立体几何截面课堂
            </h1>
            <p className="text-[13px] text-cyan-300/70 font-mono leading-relaxed mb-8">
              本局将加载 <span className="text-warn-yellow">30 帧</span> 含真实坏数据的点云序列，
              包含 <span className="text-alert-orange">3 个时间轴不同步边界场景</span>。
              <br />
              完成截面参数调节、离群点标记与复核、时间轴校准后结算判定。
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8 text-left">
              {[
                { t: '帧 10', d: '切片延迟错位', c: 'text-warn-yellow' },
                { t: '帧 18', d: '跳帧导致误判', c: 'text-alert-orange' },
                { t: '帧 25', d: '双源数据偏移', c: 'text-alert-orange' },
              ].map((x) => (
                <div key={x.t} className="glass-panel clip-chamfer p-3 border border-cyber-cyan/15">
                  <div className={`hud-text text-[11px] font-bold ${x.c} mb-1`}>{x.t}</div>
                  <div className="text-[10px] text-cyan-300/65 font-mono">{x.d}</div>
                  <div className="text-[9px] text-success-green/70 mt-1 italic">会改变判定结果</div>
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              className="cyber-btn cyber-btn-primary text-base py-3 px-8 flex items-center gap-2 mx-auto animate-pulse-glow"
            >
              <Play className="w-5 h-5" />
              开始一局训练
            </button>

            <div className="mt-6 text-[10px] text-cyan-300/40 font-mono">
              左键旋转视口 · 点击点选中 · 再点标记离群 · 切换角色进行复核
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex gap-3 p-3">
          <div className="w-72 flex-shrink-0 min-h-0">
            <ParamPanel />
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex-1 min-h-0 glass-panel clip-chamfer overflow-hidden border border-cyber-cyan/20">
              <PointCloudScene />
            </div>
            <TimelinePlayer />
          </div>

          <div className="w-72 flex-shrink-0 min-h-0">
            <OutlierPanel />
          </div>
        </div>
      )}
    </div>
  );
}
