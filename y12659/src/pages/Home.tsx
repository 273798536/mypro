import { Camera, FileDown } from 'lucide-react';
import SlopeScene from '@/components/SlopeScene';
import ControlPanel from '@/components/ControlPanel';
import DetailPanel from '@/components/DetailPanel';
import RiskExplanationPanel from '@/components/RiskExplanationPanel';
import { useDemoStore } from '@/store/demoStore';
import { exportScreenshotWithWatermark, downloadDataURL, downloadReportHTML } from '@/utils/export';
import { formatTime } from '@/utils/collision';
import { TOTAL_DURATION } from '@/data/mockData';

export default function Home() {
  const session = useDemoStore();

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    const dataUrl = exportScreenshotWithWatermark(canvas as HTMLCanvasElement, {
      currentTime: session.currentTime,
      plane: session.plane,
    });
    if (dataUrl) {
      downloadDataURL(dataUrl, `边坡检测帧_${formatTime(session.currentTime).replace(/:/g, '-')}.png`);
    }
  };

  const handleQuickReport = () => {
    const fullSession = {
      ...session,
      totalDuration: TOTAL_DURATION,
      distanceHistory: session.distanceHistory,
    };
    downloadReportHTML(fullSession as any);
  };

  return (
    <div className="h-full flex flex-col bg-mine-dark text-white">
      <header className="bg-mine-panel/80 border-b border-mine-border px-4 py-2.5 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-mine-rock to-orange-600 flex items-center justify-center shadow-lg shadow-mine-rock/20">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 20l5-9 4 5 3-3 6 7z" />
              <circle cx="12" cy="5" r="2" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-base font-semibold leading-tight">矿山边坡稳定演示</h1>
            <p className="text-[11px] text-mine-muted">点云剖切 · 连续碰撞检测 · 评审会专用</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScreenshot}
            className="px-3 py-1.5 rounded-md bg-mine-card hover:bg-mine-border transition text-xs flex items-center gap-1.5 border border-mine-border"
          >
            <Camera className="w-3.5 h-3.5" />
            截图（含水印）
          </button>
          <button
            onClick={handleQuickReport}
            className="px-3 py-1.5 rounded-md bg-gradient-to-r from-mine-rock to-orange-500 hover:from-orange-500 hover:to-mine-rock transition text-xs font-semibold flex items-center gap-1.5 shadow shadow-mine-rock/20"
          >
            <FileDown className="w-3.5 h-3.5" />
            导出报告
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-72 flex-shrink-0 border-r border-mine-border min-h-0">
          <DetailPanel />
        </aside>

        <main className="flex-1 relative min-h-0 flex flex-col">
          <div className="flex-1 relative min-h-0">
            <SlopeScene />
            {session.plane.isOutOfBounds && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 animate-pulse">
                <div className="bg-red-600/95 text-white px-5 py-2.5 rounded-lg border-2 border-red-400 shadow-xl shadow-red-600/40">
                  <div className="flex items-center gap-2 font-semibold">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 9v4M12 17h.01" />
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    剖切面越界 - 已触发自动拦截
                    <span className="font-mono text-sm ml-2 opacity-90">
                      d={session.plane.minDistance.toFixed(3)}m {'<'} 阈值 1.0m
                    </span>
                  </div>
                </div>
              </div>
            )}
            {session.status === 'idle' && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-mine-dark/70 backdrop-blur-sm">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-mine-rock to-orange-600 flex items-center justify-center shadow-2xl shadow-mine-rock/30">
                    <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 20l5-9 4 5 3-3 6 7z" />
                      <circle cx="12" cy="5" r="2" />
                    </svg>
                  </div>
                  <h2 className="font-display text-2xl font-bold mb-2">矿山边坡稳定演示</h2>
                  <p className="text-mine-muted text-sm mb-6 leading-relaxed">
                    点击下方按钮开始演示。剖切面将从左至右推进，系统会实时检测与点云的距离，
                    <br />连续 3 帧越界将触发自动拦截。所有事件均可导出为评审报告。
                  </p>
                  <button
                    onClick={() => useDemoStore.getState().setStatus('playing')}
                    className="px-8 py-3 rounded-lg bg-gradient-to-r from-mine-rock to-orange-500 hover:from-orange-500 hover:to-mine-rock font-semibold shadow-lg shadow-mine-rock/30 transition flex items-center gap-2 mx-auto"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    开始演示
                  </button>
                </div>
              </div>
            )}
          </div>
          <ControlPanel />
        </main>

        <aside className="w-80 flex-shrink-0 border-l border-mine-border min-h-0">
          <RiskExplanationPanel />
        </aside>
      </div>
    </div>
  );
}
