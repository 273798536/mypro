import { Anchor, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeclarationStore } from '@/stores/useDeclarationStore';
import DataSourceCards from '@/components/dashboard/DataSourceCards';
import RiskStatsGauge from '@/components/dashboard/RiskStatsGauge';
import DeclarationList from '@/components/dashboard/DeclarationList';
import AnimatedStagger from '@/components/common/AnimatedStagger';

export default function Dashboard() {
  const navigate = useNavigate();
  const declarations = useDeclarationStore(s => s.declarations);
  const sources = declarations[0]?.sources || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-ocean-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Anchor className="w-7 h-7 text-aqua-400" />
              <div>
                <h1 className="text-lg font-serif font-bold tracking-wide">码头压载水申报复核系统</h1>
                <p className="text-xs text-ocean-200 mt-0.5">水产养殖场长工作台</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/case-library')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ocean-700 hover:bg-ocean-600 transition-colors text-sm"
            >
              <BookOpen className="w-4 h-4" />
              边界案例库
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <AnimatedStagger delay={0}>
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-aqua-400 rounded-full" />
              资料来源
            </h2>
            <DataSourceCards sources={sources} />
          </section>
        </AnimatedStagger>

        <AnimatedStagger delay={100}>
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-ocean-800 rounded-full" />
              风险概览
            </h2>
            <RiskStatsGauge declarations={declarations} />
          </section>
        </AnimatedStagger>

        <AnimatedStagger delay={200}>
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-ocean-800 rounded-full" />
              申报列表
            </h2>
            <DeclarationList declarations={declarations} />
          </section>
        </AnimatedStagger>
      </main>
    </div>
  );
}
