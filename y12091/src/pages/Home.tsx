import { useEffect, useRef } from 'react';
import { LeftPanel } from '../components/panels/LeftPanel';
import { RightPanel } from '../components/panels/RightPanel';
import { RiverbedViewer } from '../components/3d/RiverbedViewer';
import { Timeline } from '../components/controls/Timeline';
import { useAppStore } from '../store/useAppStore';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const {
    issues,
    viewMode,
    isCalculating,
    calculationResult,
    time,
  } = useAppStore();

  const [showWelcome, setShowWelcome] = useState(true);
  const [showIssueAlert, setShowIssueAlert] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeIssues = issues.filter(i => !i.ignored);
  const highSeverityIssues = activeIssues.filter(i => i.severity === 'high');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={containerRef} className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <header className="h-12 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
              <path d="M2 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2v2c-2 0-2 2-4 2s-2-2-4-2-2 2-4 2-2-2-4-2-2 2-4 2v-2zm0-8c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2v2c-2 0-2 2-4 2s-2-2-4-2-2 2-4 2-2-2-4-2-2 2-4 2V7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm leading-tight">河道泥沙冲淤模型</h1>
            <p className="text-slate-400 text-xs leading-tight">River Sediment Erosion & Deposition Model</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {calculationResult && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-slate-400">冲刷</span>
                <span className="text-white font-mono">
                  {(calculationResult.erosionVolume / 10000).toFixed(2)}万m³
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-slate-400">淤积</span>
                <span className="text-white font-mono">
                  {(calculationResult.depositionVolume / 10000).toFixed(2)}万m³
                </span>
              </div>
              <div className="w-px h-4 bg-slate-600" />
              <div className="text-slate-400">
                净变化:
                <span className={`font-mono ml-1 ${
                  calculationResult.erosionVolume > calculationResult.depositionVolume
                    ? 'text-red-400'
                    : 'text-green-400'
                }`}>
                  {((calculationResult.depositionVolume - calculationResult.erosionVolume) / 10000).toFixed(2)}万m³
                </span>
              </div>
            </div>
          )}

          <div className={`flex items-center gap-2 px-2 py-1 rounded ${
            time.isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/50 text-slate-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${time.isPlaying ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs font-medium">{time.isPlaying ? '播放中' : '已暂停'}</span>
          </div>

          {isCalculating && (
            <div className="flex items-center gap-2 text-sky-400 text-xs">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-sky-500 border-t-transparent" />
              计算中...
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative overflow-hidden p-3">
            {viewMode === '3d' && <RiverbedViewer showDiff={false} />}
            {viewMode === 'compare' && <RiverbedViewer showDiff={true} />}
            {viewMode === 'chart' && (
              <div className="w-full h-full bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <Info size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">请在右侧面板查看数据图表</p>
                </div>
              </div>
            )}

            {showWelcome && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur-sm border border-sky-500/50 rounded-lg px-6 py-4 shadow-2xl z-20 max-w-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Info className="text-sky-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">欢迎使用河道泥沙冲淤模型</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        调整左侧参数或拖动底部时间轴，3D河床和数据图表会同步更新。
                        检测到的数据质量问题已在左侧面板列出，可一键修正。
                        修改流量数据后记得保存方案进行对比。
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="text-slate-400 hover:text-white transition-colors shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {showIssueAlert && highSeverityIssues.length > 0 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-900/90 backdrop-blur-sm border border-amber-500/50 rounded-lg px-5 py-3 shadow-2xl z-20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-400" size={20} />
                  <div>
                    <span className="text-amber-200 text-sm">
                      检测到 <span className="font-bold text-amber-400">{highSeverityIssues.length}</span> 个高优先级数据问题，
                      建议在左侧「数据质量检测」中查看并修正
                    </span>
                  </div>
                  <button
                    onClick={() => setShowIssueAlert(false)}
                    className="text-amber-400 hover:text-amber-200 transition-colors ml-2"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <Timeline />
        </main>

        <RightPanel />
      </div>
    </div>
  );
}