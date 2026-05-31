import type { CalculationResult } from '@/types';
import { FREQUENCY_BANDS } from '@/types';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ResultCardProps {
  result: CalculationResult;
  roadNoiseName: string;
  barrierName: string;
  residentPointName: string;
  hasMissingData: boolean;
}

export const ResultCard = ({
  result,
  roadNoiseName,
  barrierName,
  residentPointName,
  hasMissingData,
}: ResultCardProps) => {
  return (
    <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-6 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">评估结果</h3>
          <p className="text-xs text-primary-400">
            {roadNoiseName} → {barrierName} → {residentPointName}
          </p>
        </div>
        {hasMissingData ? (
          <AlertCircle className="text-accent-orange" size={24} />
        ) : (
          <CheckCircle className="text-accent-green" size={24} />
        )}
      </div>

      <div className="bg-primary-800/50 rounded-lg p-6 mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold font-mono text-white">
            {result.totalAttenuation}
          </span>
          <span className="text-2xl text-accent-orange font-mono">{result.unit}</span>
        </div>
        <p className="text-sm text-primary-300 mt-2">总声衰减量 (A计权)</p>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <Info size={14} className="text-accent-blue" />
          适用范围
        </h4>
        <p
          className={`text-sm p-3 rounded-lg ${
            hasMissingData
              ? 'bg-accent-orange/10 text-accent-orange border border-accent-orange/30'
              : 'bg-primary-800/30 text-primary-300 border border-primary-700'
          }`}
        >
          {result.applicableScope}
        </p>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-white mb-2">分频段插入损失 [dB]</h4>
        <div className="grid grid-cols-4 gap-2">
          {FREQUENCY_BANDS.map((band) => {
            const il = result.insertionLoss[band];
            return (
              <div
                key={band}
                className={`text-center p-2 rounded-lg ${
                  il === null
                    ? 'bg-accent-red/10 border border-accent-red/30'
                    : 'bg-primary-800/50'
                }`}
              >
                <div className="text-xs text-primary-400 mb-1">{band}Hz</div>
                <div
                  className={`font-mono font-semibold ${
                    il === null ? 'text-accent-red' : 'text-white'
                  }`}
                >
                  {il === null ? '—' : il.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-white mb-2">降噪后声级 [dB]</h4>
        <div className="grid grid-cols-4 gap-2">
          {FREQUENCY_BANDS.map((band) => {
            const rl = result.reducedLevel[band];
            return (
              <div
                key={band}
                className={`text-center p-2 rounded-lg ${
                  rl === null
                    ? 'bg-accent-red/10 border border-accent-red/30'
                    : 'bg-primary-800/50'
                }`}
              >
                <div className="text-xs text-primary-400 mb-1">{band}Hz</div>
                <div
                  className={`font-mono font-semibold ${
                    rl === null ? 'text-accent-red' : rl > 70 ? 'text-accent-red' : rl > 60 ? 'text-accent-orange' : 'text-accent-green'
                  }`}
                >
                  {rl === null ? '—' : rl.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-primary-700">
        <p className="text-xs text-primary-500">{result.calculationMethod}</p>
      </div>
    </div>
  );
};
