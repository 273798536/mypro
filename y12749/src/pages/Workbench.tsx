import { useBatchStore } from '@/store/useBatchStore';
import StatusBar from '@/components/StatusBar';
import ParamsPanel from '@/components/ParamsPanel';
import ProblemList from '@/components/ProblemList';
import ScoreRecords from '@/components/ScoreRecords';
import EmptySetPanel from '@/components/EmptySetPanel';
import DifficultyDistribution from '@/components/DifficultyDistribution';
import ConclusionCard from '@/components/ConclusionCard';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';

export default function Workbench() {
  const { batch } = useBatchStore();
  const navigate = useNavigate();
  const quickConclusions = batch.conclusions.filter((c) =>
    ['overall_balance', 'duplicate_control', 'empty_set'].includes(c.key),
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <StatusBar />
      <main className="px-8 py-6">
        <div className="grid grid-cols-12 gap-5">
          <aside className="col-span-3 space-y-5">
            <ParamsPanel />
            <DifficultyDistribution />
          </aside>

          <section className="col-span-6 space-y-5">
            <ProblemList />
            <ScoreRecords />
          </section>

          <aside className="col-span-3 space-y-5">
            <EmptySetPanel />

            <section className="card-base p-4 animate-fade-up" style={{ animationDelay: '240ms' }}>
              <header className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-base font-semibold text-navy-700">即时结论</h2>
                <button
                  onClick={() => navigate('/review')}
                  className="inline-flex items-center gap-1 text-xs text-navy-500 hover:text-navy-700 transition-colors"
                >
                  查看全部
                  <ArrowRight size={12} />
                </button>
              </header>
              <div className="space-y-2">
                {quickConclusions.map((c, i) => (
                  <ConclusionCard key={c.id} conclusion={c} index={i} />
                ))}
              </div>
            </section>

            <div className="no-print space-y-2">
              <button onClick={() => navigate('/review')} className="btn-primary w-full justify-center">
                进入复核结论页
                <ArrowRight size={14} />
              </button>
              <button onClick={() => navigate('/export')} className="btn-secondary w-full justify-center">
                <FileText size={14} />
                预览并导出报告
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
