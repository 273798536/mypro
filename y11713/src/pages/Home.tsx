import { Zap, Github } from 'lucide-react';
import { ParameterInput } from '@/components/ParameterInput';
import { ChartDisplay } from '@/components/ChartDisplay';
import { AlertPanel } from '@/components/AlertPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { ReportPanel } from '@/components/ReportPanel';
import { useRLCStore } from '@/store/useRLCStore';
import { useEffect } from 'react';

export default function Home() {
  const { detectAnomalies } = useRLCStore();

  useEffect(() => {
    detectAnomalies();
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">电路暂态响应分析器</h1>
                <p className="text-xs text-slate-400">RLC Circuit Transient Analyzer</p>
              </div>
            </div>
            <a
              href="#"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <ParameterInput />
            <HistoryPanel />
          </div>

          <div className="lg:col-span-8 space-y-6">
            <AlertPanel />
            <ChartDisplay />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReportPanel />
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-cyan-400" />
                  使用说明
                </h2>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <p>输入电阻、电感、电容参数，选择合适的单位</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <p>选择输入波形类型（阶跃、脉冲、正弦）</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <p>如有需要，启用并设置初始条件</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                    <p>查看异常检测提示，确认或修正参数</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold">5</span>
                    <p>点击"开始计算"查看暂态响应曲线</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-700/50">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">阻尼类型说明</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                      <span className="text-slate-400">无阻尼 (ζ=0)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      <span className="text-slate-400">欠阻尼 (0{'<'}ζ{'<'}1)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <span className="text-slate-400">临界阻尼 (ζ=1)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      <span className="text-slate-400">过阻尼 (ζ{'>'}1)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-700/50 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          <p>RLC 电路暂态响应分析工具 · 基于四阶龙格-库塔法数值求解</p>
        </div>
      </footer>
    </div>
  );
}
