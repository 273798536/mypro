import { useAppStore } from '../store/useAppStore';
import { SampleList } from '../components/SampleList';
import { ErrorBreakdown } from '../components/ErrorBreakdown';
import { ParamCompare } from '../components/ParamCompare';
import { HistoryTimeline } from '../components/HistoryTimeline';
import { GapSection } from '../components/GapSection';
import { BoundaryDetailModal } from '../components/BoundaryDetailModal';
import { AlertTriangle, Clock, User } from 'lucide-react';

export function AnalysisPage() {
  const {
    selectedSampleId,
    samples,
    currentResult,
    compareMode,
    compareResult,
    actions: { toggleBoundaryDetail }
  } = useAppStore();

  const selectedSample = samples.find(s => s.id === selectedSampleId);
  const isBoundary = selectedSample?.type === 'boundary';

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-100 overflow-hidden">
      <div className="w-72 flex-shrink-0">
        <SampleList />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/30 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">电池内阻误差归因</h1>
              <p className="text-xs text-slate-500">现场样本分析 · 参数版本可追溯</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date().toLocaleDateString('zh-CN')}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">阿岑 / 排班同事</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {selectedSample && (
              <div className={`p-4 rounded-xl border transition-all duration-300 ${
                isBoundary
                  ? 'bg-orange-500/5 border-orange-500/30'
                  : 'bg-slate-800/30 border-slate-700/50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-700">
                    <img
                      src={selectedSample.photoUrl}
                      alt={selectedSample.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-100">
                        {selectedSample.name}
                      </h2>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium text-white ${
                        selectedSample.type === 'boundary' ? 'bg-orange-500' :
                        selectedSample.type === 'gap' ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}>
                        {selectedSample.type === 'boundary' ? '边界样本' :
                         selectedSample.type === 'gap' ? '采样缺口' : '正常样本'}
                      </span>
                      {isBoundary && (
                        <button
                          onClick={toggleBoundaryDetail}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-300
                            border border-orange-500/40 hover:bg-orange-500/30 transition-colors
                            flex items-center gap-1.5"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          查看影响分析
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <InfoItem label="实测内阻" value={`${selectedSample.internalResistance.toFixed(3)} mΩ`} />
                      <InfoItem label="环境温度" value={`${selectedSample.temperature}°C`} />
                      <InfoItem label="荷电状态" value={`${selectedSample.soc}%`} />
                      <InfoItem label="测试时间" value={selectedSample.testTime} />
                    </div>

                    {selectedSample.notes && (
                      <p className="text-xs text-slate-400 mt-2 italic">
                        现场备注：{selectedSample.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className={`grid gap-6 ${compareMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {currentResult && (
                <ErrorBreakdown
                  result={currentResult}
                  label={compareMode ? '当前参数组' : '误差归因分析'}
                  highlight={!compareMode}
                />
              )}

              {compareMode && compareResult && (
                <ErrorBreakdown
                  result={compareResult}
                  label="对照参数组"
                  highlight={false}
                />
              )}
            </div>

            <GapSection />

            <div className="grid grid-cols-2 gap-6">
              <ParamCompare />
              <HistoryTimeline />
            </div>
          </div>
        </main>
      </div>

      <BoundaryDetailModal />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm font-mono text-slate-200">{value}</div>
    </div>
  );
}
