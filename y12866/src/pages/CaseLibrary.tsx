import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Droplets, Clock, AlertTriangle } from 'lucide-react';
import { getBoundaryCases } from '@/utils/mockData';
import AnimatedStagger from '@/components/common/AnimatedStagger';

export default function CaseLibrary() {
  const navigate = useNavigate();
  const cases = getBoundaryCases();
  const salinityCases = cases.filter(c => c.category === 'salinity');
  const timezoneCases = cases.filter(c => c.category === 'timezone');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-ocean-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-1 text-ocean-200 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              工作台
            </button>
            <span className="text-ocean-400">|</span>
            <h1 className="text-lg font-serif font-bold">边界案例库</h1>
          </div>
          <p className="text-xs text-ocean-200 mt-1">每个案例都真实改变了判定结果 · 盐度单位混用与潮位时区错误的典型场景</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        <AnimatedStagger delay={0}>
          <section>
            <h2 className="text-sm font-semibold text-ocean-800 mb-4 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-aqua-500" />
              盐度单位混用
              <span className="text-[10px] text-slate-400 font-normal">（{salinityCases.length} 个案例，每个都改变判定结果）</span>
            </h2>
            <div className="space-y-4">
              {salinityCases.map((c, i) => (
                <CaseCard key={c.id} case_={c} delay={i * 100} />
              ))}
            </div>
          </section>
        </AnimatedStagger>

        <AnimatedStagger delay={200}>
          <section>
            <h2 className="text-sm font-semibold text-ocean-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              潮位时区错误
              <span className="text-[10px] text-slate-400 font-normal">（{timezoneCases.length} 个案例，像平时材料里会混进来的小麻烦）</span>
            </h2>
            <div className="space-y-4">
              {timezoneCases.map((c, i) => (
                <CaseCard key={c.id} case_={c} delay={i * 100} />
              ))}
            </div>
          </section>
        </AnimatedStagger>
      </main>
    </div>
  );
}

function CaseCard({ case_, delay }: { case_: ReturnType<typeof getBoundaryCases>[0]; delay: number }) {
  return (
    <div className={`stagger-item card-risk ${case_.severity === 'critical' ? 'card-risk-high' : 'card-risk-medium'} rounded-lg overflow-hidden`} style={{ animationDelay: `${delay}ms` }}>
      <div className="p-4 pl-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-800">{case_.title}</h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {case_.impactsResult && (
              <span className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                <AlertTriangle className="w-3 h-3" />
                改变结果
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded ${case_.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
              {case_.severity === 'critical' ? '严重' : '警告'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-3 leading-relaxed">{case_.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-red-50/50 border border-red-100 rounded-lg p-3">
            <div className="text-[10px] text-red-500 font-medium mb-1">原始数据</div>
            <div className="text-xs font-mono text-red-700">{case_.originalData}</div>
          </div>
          <div className="bg-green-50/50 border border-green-100 rounded-lg p-3">
            <div className="text-[10px] text-green-600 font-medium mb-1">修正后</div>
            <div className="text-xs font-mono text-green-700">{case_.correctedData}</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-red-500 font-medium">修正前结果：</span>
              <span className="text-red-700">{case_.beforeResult}</span>
            </div>
            <div>
              <span className="text-[10px] text-green-600 font-medium">修正后结果：</span>
              <span className="text-green-700">{case_.afterResult}</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 italic leading-relaxed">
          💬 {case_.realWorldNote}
        </div>
      </div>
    </div>
  );
}
