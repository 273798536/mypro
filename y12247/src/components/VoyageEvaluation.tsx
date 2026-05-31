import type { Violation, Cargo, BallastTank } from '@/types';

interface VoyageEvaluationProps {
  score: number;
  violations: Violation[];
  cargos: Cargo[];
  tanks: BallastTank[];
  onClose: () => void;
  onViewReport: () => void;
}

const SEVERITY_STYLE: Record<Violation['severity'], { bg: string; border: string; text: string; label: string }> = {
  warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', label: '警告' },
  danger: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', label: '危险' },
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: '严重' },
};

const RULE_LABEL: Record<Violation['rule'], { label: string; icon: string }> = {
  overload: { label: '超载下沉', icon: '⚖️' },
  gravity_shift: { label: '重心偏移', icon: '↔️' },
  ballast_omit: { label: '压载遗漏', icon: '💧' },
  draft_exceed: { label: '吃水超标', icon: '📏' },
};

function ScoreRing({ score }: { score: number }) {
  const radius = 60;
  const circumference = Math.PI * radius;
  const pct = score / 100;
  const strokeDashoffset = circumference * (1 - pct);
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';

  return (
    <div className="relative w-40 h-20 mx-auto">
      <svg viewBox="0 0 140 80" className="w-full">
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke="#334155"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className="text-3xl font-bold font-['Oswald']" style={{ color }}>{score}</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">安全评分</span>
      </div>
    </div>
  );
}

export default function VoyageEvaluation({
  score,
  violations,
  cargos,
  tanks,
  onClose,
  onViewReport,
}: VoyageEvaluationProps) {
  const loadedCount = cargos.filter(c => c.loaded).length;
  const totalWeight = cargos.filter(c => c.loaded).reduce((s, c) => s + c.weight, 0);
  const totalBallast = tanks.reduce((s, t) => s + t.current, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-bold font-['Oswald'] text-slate-100 uppercase tracking-wider text-center mb-4">
          航行评估报告
        </h2>

        <ScoreRing score={score} />

        <div className="flex justify-center gap-6 mt-4 text-sm text-slate-400">
          <div>装载 <span className="text-slate-200 font-semibold">{loadedCount}</span> 件</div>
          <div>总重 <span className="text-slate-200 font-semibold">{totalWeight}</span> 吨</div>
          <div>压载 <span className="text-slate-200 font-semibold">{totalBallast}</span> 吨</div>
        </div>

        {violations.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">违规详情</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {violations.map((v, i) => {
                const style = SEVERITY_STYLE[v.severity];
                const rule = RULE_LABEL[v.rule];
                return (
                  <div key={i} className={`rounded-lg border p-3 ${style.bg} ${style.border}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{rule.icon}</span>
                      <span className={`text-xs font-bold uppercase ${style.text}`}>{style.label}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-300">{rule.label}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{v.message}</p>
                    {v.relatedCargoIds.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {v.relatedCargoIds.map(cid => {
                          const cargo = cargos.find(c => c.id === cid);
                          return cargo ? (
                            <span key={cid} className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded">
                              {cargo.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    {v.relatedBallastOpIds.length > 0 && (
                      <div className="mt-1 text-[10px] text-amber-400/80">
                        涉及 {v.relatedBallastOpIds.length} 项压载操作
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {violations.length === 0 && (
          <div className="mt-6 text-center text-emerald-400">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm font-semibold">装载方案完美，航行安全！</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            返回调整
          </button>
          <button
            onClick={onViewReport}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            查看航行报告
          </button>
        </div>
      </div>
    </div>
  );
}
