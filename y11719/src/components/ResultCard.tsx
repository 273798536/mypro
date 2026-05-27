import { Calculator, TrendingUp, Target, Award } from 'lucide-react';
import { useExperimentStore } from '../store/useExperimentStore';

export function ResultCard() {
  const { result } = useExperimentStore();

  if (!result) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-semibold text-slate-100">计算结果</h3>
        </div>
        <div className="text-center py-8 text-slate-400">
          <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>输入有效数据后将自动计算</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-semibold text-slate-100">计算结果</h3>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span className="text-lg font-bold text-amber-400">{result.score}/100</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ResultItem
          icon={Target}
          label="转动惯量"
          value={`${result.momentOfInertia.toExponential(4)}`}
          unit="kg·m²"
          highlight
        />
        <ResultItem
          icon={TrendingUp}
          label="角加速度"
          value={`${result.angularAcceleration.toFixed(4)}`}
          unit="rad/s²"
        />
        <ResultItem
          label="未修正值"
          value={`${result.momentOfInertiaUncorrected.toExponential(4)}`}
          unit="kg·m²"
          muted
        />
        <ResultItem
          label="摩擦转矩"
          value={`${result.frictionTorque.toExponential(4)}`}
          unit="N·m"
          muted
        />
        {result.theoreticalValue !== undefined && (
          <ResultItem
            label="理论值"
            value={`${result.theoreticalValue.toExponential(4)}`}
            unit="kg·m²"
            muted
          />
        )}
        {result.percentageError !== undefined && (
          <ResultItem
            label="相对误差"
            value={`${result.percentageError.toFixed(2)}`}
            unit="%"
            error={result.percentageError > 10}
          />
        )}
      </div>

      {result.scoreDetails.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-300 mb-2">评分明细</h4>
          <div className="space-y-2">
            {result.scoreDetails.map((detail, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{detail.category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 transition-all"
                      style={{ width: `${(detail.score / detail.maxScore) * 100}%` }}
                    />
                  </div>
                  <span className="text-slate-300 w-12 text-right">
                    {detail.score}/{detail.maxScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ResultItemProps {
  icon?: typeof Target;
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
  muted?: boolean;
  error?: boolean;
}

function ResultItem({ icon: Icon, label, value, unit, highlight, muted, error }: ResultItemProps) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-teal-900/30 border border-teal-700' : 'bg-slate-700/50'}`}>
      <div className="flex items-center gap-1 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${highlight ? 'text-teal-400' : 'text-slate-400'}`} />}
        <span className={`text-xs ${muted ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`font-mono text-lg font-bold ${
            error ? 'text-red-400' : highlight ? 'text-teal-300' : muted ? 'text-slate-400' : 'text-slate-200'
          }`}
        >
          {value}
        </span>
        <span className={`text-xs ${muted ? 'text-slate-500' : 'text-slate-400'}`}>{unit}</span>
      </div>
    </div>
  );
}
