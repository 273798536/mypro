import { NebulaScene } from '../components/nebula/NebulaScene';
import { ControlPanel } from '../components/control/ControlPanel';
import { InfoPanel } from '../components/info/InfoPanel';
import { Timeline } from '../components/timeline/Timeline';
import { ResultCategories } from '../components/results/ResultCategories';
import { TopBar } from '../components/TopBar';
import { useDataStore } from '../store/dataStore';

export default function Home() {
  const firstRunResult = useDataStore(s => s.firstRunResult);
  const isLoading = useDataStore(s => s.isLoading);
  
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0A0E1A]">
      <NebulaScene className="w-full h-full" />
      
      <TopBar />
      <ControlPanel />
      <InfoPanel />
      
      {firstRunResult && (
        <>
          <Timeline />
          <ResultCategories />
        </>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-300 text-sm">正在分析数据...</p>
          </div>
        </div>
      )}
      
      {!firstRunResult && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-md px-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">
              投资组合风险星云
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              将收益、波动和回撤三维可视化，帮助您清晰识别投资组合中的风险分布。
              点击左侧「生成样本数据」开始体验。
            </p>
            <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                低风险
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                中风险
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                高风险
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
