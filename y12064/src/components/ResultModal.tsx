import React from 'react';
import { X, Target, AlertTriangle, Clock, Zap, Award, TrendingUp } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { GameError } from '@/types';

const ResultModal: React.FC = () => {
  const { result, reset, loadReplay } = useGameStore();

  if (!result) return null;

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'direction': return <Zap size={18} />;
      case 'energy': return <AlertTriangle size={18} />;
      case 'mass': return <Clock size={18} />;
      default: return <AlertTriangle size={18} />;
    }
  };

  const getErrorColor = (type: string) => {
    switch (type) {
      case 'direction': return 'border-yellow-500 bg-yellow-500/10 text-yellow-500';
      case 'energy': return 'border-warning-orange bg-warning-orange/10 text-warning-orange';
      case 'mass': return 'border-error-red bg-error-red/10 text-error-red';
      default: return 'border-gray-500 bg-gray-500/10 text-gray-500';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'pending': return '待确认';
      case 'warning': return '警告';
      case 'error': return '错误';
      default: return severity;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-deep-blue border border-electro-blue/30 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-deep-blue/95 backdrop-blur-sm p-5 border-b border-electro-blue/20 flex items-center justify-between">
          <h2 className="font-orbitron text-2xl text-electro-blue flex items-center gap-3">
            <Award size={28} />
            射击结果
          </h2>
          <button
            onClick={reset}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className={`p-6 rounded-xl text-center ${
            result.hit 
              ? 'bg-success-green/10 border-2 border-success-green' 
              : 'bg-error-red/10 border-2 border-error-red'
          }`}>
            <div className="flex items-center justify-center gap-3 mb-2">
              <Target className={result.hit ? 'text-success-green' : 'text-error-red'} size={32} />
              <span className={`font-orbitron text-3xl ${
                result.hit ? 'text-success-green' : 'text-error-red'
              }`}>
                {result.hit ? '命中目标!' : '未命中'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-8 mt-4">
              <div>
                <div className="text-sm text-gray-400">得分</div>
                <div className="font-orbitron text-3xl text-electro-blue">{result.score}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">偏差</div>
                <div className="font-roboto-mono text-xl text-gray-300">
                  {result.deviation === Infinity ? '—' : `${result.deviation.toFixed(1)}px`}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">最大动能</div>
                <div className="font-roboto-mono text-xl text-gray-300">{result.maxEnergy.toFixed(1)}J</div>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div>
              <h3 className="font-orbitron text-lg text-warning-orange mb-3 flex items-center gap-2">
                <AlertTriangle size={20} />
                错误分析 ({result.errors.length})
              </h3>
              <div className="space-y-3">
                {result.errors.map((error: GameError, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getErrorColor(error.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getErrorIcon(error.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-roboto-mono text-sm opacity-80">
                            [{getSeverityLabel(error.severity)}]
                          </span>
                          {error.physicsFormula && (
                            <span className="text-xs bg-black/30 px-2 py-0.5 rounded font-mono">
                              {error.physicsFormula}
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-2">{error.message}</p>
                        <p className="text-xs opacity-70 border-t border-current/20 pt-2 mt-2">
                          <TrendingUp size={12} className="inline mr-1" />
                          下一步: {error.nextStep}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => loadReplay(result)}
              className="flex-1 py-3 rounded-lg font-orbitron bg-electro-blue/20 border-2 border-electro-blue text-electro-blue hover:bg-electro-blue/30 transition-all flex items-center justify-center gap-2"
            >
              <Clock size={18} />
              查看回放
            </button>
            <button
              onClick={reset}
              className="flex-1 py-3 rounded-lg font-orbitron bg-success-green/20 border-2 border-success-green text-success-green hover:bg-success-green/30 transition-all flex items-center justify-center gap-2"
            >
              <Target size={18} />
              再来一局
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;
