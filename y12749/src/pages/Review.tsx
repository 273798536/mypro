import { useBatchStore } from '@/store/useBatchStore';
import StatusBar from '@/components/StatusBar';
import ChartAffectedBanner from '@/components/ChartAffectedBanner';
import ConclusionCard from '@/components/ConclusionCard';
import AnomalyPanel from '@/components/AnomalyPanel';
import HistoricalAnswerPanel from '@/components/HistoricalAnswerPanel';
import DifficultyDistribution from '@/components/DifficultyDistribution';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function Review() {
  const { batch } = useBatchStore();
  const navigate = useNavigate();
  const affected = batch.conclusions.filter((c) => c.affectedByMissingCharts);
  const stable = batch.conclusions.filter((c) => !c.affectedByMissingCharts);

  return (
    <div className="min-h-screen bg-slate-100">
      <StatusBar />
      <main className="px-8 py-6 max-w-6xl mx-auto space-y-5">
        <div className="no-print flex items-center justify-between">
          <button onClick={() => navigate('/')} className="btn-secondary">
            <ArrowLeft size={14} />
            返回工作台
          </button>
          <button onClick={() => navigate('/export')} className="btn-primary">
            <FileText size={14} />
            预览并导出报告
          </button>
        </div>

        <ChartAffectedBanner />

        <DifficultyDistribution />

        <section>
          <h2 className="font-serif text-lg font-semibold text-navy-800 mb-3">全部复核结论</h2>
          <div className="grid grid-cols-2 gap-4">
            {stable.map((c, i) => (
              <ConclusionCard key={c.id} conclusion={c} index={i} />
            ))}
          </div>
          {affected.length > 0 && (
            <>
              <h3 className="mt-5 mb-3 font-serif text-base font-semibold text-amber-700">
                受图表缺失影响（待图表到齐后确认）
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {affected.map((c, i) => (
                  <ConclusionCard key={c.id} conclusion={c} index={i} />
                ))}
              </div>
            </>
          )}
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold text-navy-800 mb-3">异常分级处理</h2>
          <AnomalyPanel />
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold text-navy-800 mb-3">历史答案补录</h2>
          <HistoricalAnswerPanel />
        </section>
      </main>
    </div>
  );
}
