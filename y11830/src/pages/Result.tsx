import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, AlertTriangle, RotateCcw, History } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import RadarChart from '@/components/RadarChart';

const severityStyles: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-green-500/20 text-green-400',
};

const severityLabels: Record<string, string> = {
  high: '严重',
  medium: '中等',
  low: '轻微',
};

function ScoreCard({ label, score, weight, delay }: { label: string; score: number; weight: number; delay: string }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-5 animate-fade-in" style={{ animationDelay: delay }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-300 text-sm">{label}</span>
        <span className="bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded-full">{weight}%</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-white font-bold text-lg w-10 text-right">{score}</span>
      </div>
    </div>
  );
}

export default function Result() {
  const navigate = useNavigate();
  const { score, diagnoses, results } = useGameStore();

  useEffect(() => {
    if (!score) navigate('/');
  }, [score, navigate]);

  if (!score) return null;

  const passed = score.passed;
  const lastResult = results[results.length - 1];
  const upstreamRisk = lastResult?.upstreamRisk ?? 0;
  const downstreamRisk = lastResult?.downstreamRisk ?? 0;
  const warningDelayRisk = lastResult?.warningDelayRisk ?? 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white px-4 py-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-8 animate-fade-in">
        <h1 className="font-serif-sc text-2xl text-white">调度结算</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
          >
            <RotateCcw size={14} />
            重开
          </button>
          <button
            onClick={() => navigate('/replay')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
          >
            <History size={14} />
            复盘
          </button>
        </div>
      </header>

      <section
        className={`rounded-2xl p-8 text-center mb-6 animate-fade-in ${passed ? 'bg-green-900/30 border border-green-700/40' : 'bg-red-900/30 border border-red-700/40'}`}
        style={{ animationDelay: '100ms' }}
      >
        <div className="flex justify-center mb-3">
          {passed ? <Trophy size={40} className="text-green-400" /> : <AlertTriangle size={40} className="text-red-400" />}
        </div>
        <p className={`text-lg font-bold mb-2 ${passed ? 'text-green-400' : 'text-red-400'}`}>
          {passed ? '调度合格' : '调度不合格'}
        </p>
        <p className="text-6xl font-bold animate-score-reveal">{score.totalScore}</p>
      </section>

      <section className="grid grid-cols-3 gap-3 mb-6">
        <ScoreCard label="闸门调度分" score={score.gateScore} weight={40} delay="200ms" />
        <ScoreCard label="预警时效分" score={score.warningScore} weight={30} delay="300ms" />
        <ScoreCard label="下游安全分" score={score.downstreamSafetyScore} weight={30} delay="400ms" />
      </section>

      <section
        className="bg-slate-800 rounded-2xl p-6 mb-6 animate-fade-in flex flex-col items-center"
        style={{ animationDelay: '500ms' }}
      >
        <h2 className="text-slate-300 text-sm mb-4">风险雷达</h2>
        <RadarChart upstreamRisk={upstreamRisk} downstreamRisk={downstreamRisk} warningDelayRisk={warningDelayRisk} size={220} />
      </section>

      {diagnoses.length > 0 ? (
        <section className="animate-fade-in" style={{ animationDelay: '600ms' }}>
          <h2 className="flex items-center gap-2 text-slate-300 text-sm mb-3">
            <AlertTriangle size={16} className="text-amber-400" />
            问题诊断
          </h2>
          <div className="space-y-2">
            {diagnoses.map((d, i) => (
              <div key={i} className="bg-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${severityStyles[d.severity]}`}>
                    {severityLabels[d.severity]}
                  </span>
                  <span className="text-slate-500 text-xs">第{d.round}回合</span>
                </div>
                <p className="text-white font-bold text-sm mb-1">{d.issue}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{d.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        passed && (
          <section className="animate-fade-in" style={{ animationDelay: '600ms' }}>
            <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-5 text-center">
              <p className="text-green-400 text-sm">调度方案合理，上下游安全得到保障</p>
            </div>
          </section>
        )
      )}
    </div>
  );
}
