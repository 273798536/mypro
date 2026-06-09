import { ThreeScene } from '@/components/ThreeScene';
import { Toolbar } from '@/components/common/Toolbar';
import { ExplanationBar } from '@/components/common/ExplanationBar';
import { RightPanel } from '@/components/panels/RightPanel';
import { AnomalySidebar } from '@/components/common/AnomalySidebar';
import { useSceneStore } from '@/stores/useSceneStore';

export default function MainPage() {
  const panelCollapsed = useSceneStore((s) => s.panelCollapsed);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* 顶部工具栏 */}
      <Toolbar />

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧异常列表 */}
        <AnomalySidebar />

        {/* 中央3D场景 */}
        <div className="relative flex-1">
          <ThreeScene />

          {/* 场景内浮动信息 */}
          <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
            <div className="pointer-events-auto rounded-lg border border-cyan-500/30 bg-slate-950/80 px-3 py-2 backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-wider text-cyan-400/70">
                船闸编号
              </div>
              <div className="font-mono text-sm font-bold text-cyan-300">
                SZ-Lock-001A
              </div>
            </div>
            <div className="pointer-events-auto rounded-lg border border-slate-700/50 bg-slate-950/80 px-3 py-2 backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                上下游水位差
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-lg font-bold text-amber-400">
                  9.5
                </span>
                <span className="text-[11px] text-slate-500">m</span>
              </div>
            </div>
          </div>

          {/* 操作提示 */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="rounded-full border border-slate-700/50 bg-slate-950/70 px-4 py-1.5 text-[11px] text-slate-500 backdrop-blur-md">
              🖱️ 左键拖拽旋转 · 右键平移 · 滚轮缩放 · 点击设备/异常查看详情
            </div>
          </div>

          {/* 坐标轴指示 */}
          <div className="pointer-events-none absolute bottom-4 right-4">
            <div className="rounded-lg border border-slate-700/50 bg-slate-950/70 p-2 backdrop-blur-md">
              <svg viewBox="0 0 60 60" className="h-14 w-14">
                <line x1="30" y1="30" x2="55" y2="30" stroke="#ff6b6b" strokeWidth="2" />
                <text x="56" y="33" fill="#ff6b6b" fontSize="9" fontWeight="bold">X</text>
                <line x1="30" y1="30" x2="30" y2="5" stroke="#51cf66" strokeWidth="2" />
                <text x="33" y="12" fill="#51cf66" fontSize="9" fontWeight="bold">Y</text>
                <line x1="30" y1="30" x2="10" y2="50" stroke="#339af0" strokeWidth="2" />
                <text x="5" y="55" fill="#339af0" fontSize="9" fontWeight="bold">Z</text>
                <circle cx="30" cy="30" r="3" fill="#fff" opacity="0.8" />
              </svg>
            </div>
          </div>
        </div>

        {/* 右侧功能面板 */}
        <RightPanel />
      </div>

      {/* 底部解说栏 */}
      <ExplanationBar />
    </div>
  );
}
