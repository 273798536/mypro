import { useMemo } from 'react';
import {
  XCircle,
  ArrowRight,
  RotateCcw,
  Eye,
  Home,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import type { FailureEvent } from '../../engine/types';
import { FAILURE_TYPE_LABELS, FAILURE_TYPE_DESCRIPTIONS } from '../../engine/types';
import { getRuleReference } from '../../engine/rules';

interface FailureModalProps {
  failure: FailureEvent;
  onRestart: () => void;
  onReview: () => void;
  onHome: () => void;
}

export default function FailureModal({
  failure,
  onRestart,
  onReview,
  onHome,
}: FailureModalProps) {
  const failureIcon = useMemo(() => {
    switch (failure.type) {
      case 'price_jump':
        return <AlertTriangle size={48} className="text-defi-warning" />;
      case 'gas_insufficient':
        return <XCircle size={48} className="text-defi-danger" />;
      case 'repeated_liquidation':
        return <XCircle size={48} className="text-defi-danger" />;
    }
  }, [failure.type]);

  const bgColor =
    failure.type === 'price_jump'
      ? 'from-defi-warning/20 to-transparent'
      : 'from-defi-danger/20 to-transparent';

  const borderColor =
    failure.type === 'price_jump' ? 'border-defi-warning' : 'border-defi-danger';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className={`bg-defi-card border-2 ${borderColor} rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto scrollbar-thin animate-slide-up`}
      >
        <div className={`bg-gradient-to-b ${bgColor} p-8 rounded-t-2xl`}>
          <div className="flex items-center gap-4 mb-4">
            <div className="animate-shake">{failureIcon}</div>
            <div>
              <h2 className="text-2xl font-bold text-defi-text mb-1">
                清算失败
              </h2>
              <div
                className={`text-lg font-medium ${
                  failure.type === 'price_jump'
                    ? 'text-defi-warning'
                    : 'text-defi-danger'
                }`}
              >
                {FAILURE_TYPE_LABELS[failure.type]}
              </div>
            </div>
          </div>
          <p className="text-defi-text-muted">
            {FAILURE_TYPE_DESCRIPTIONS[failure.type]}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="card bg-defi-bg-light">
            <h3 className="text-sm font-medium text-defi-text-muted mb-3 flex items-center gap-2">
              <BookOpen size={16} />
              影响链路分析
            </h3>
            <div className="space-y-3">
              {failure.impactChain.map((link, idx) => (
                <div key={link.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0
                          ? 'bg-defi-warning text-defi-bg'
                          : idx === failure.impactChain.length - 1
                          ? 'bg-defi-danger text-white'
                          : 'bg-defi-border text-defi-text'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    {idx < failure.impactChain.length - 1 && (
                      <div className="w-0.5 h-full bg-defi-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="font-medium text-defi-text mb-1">
                      {link.description}
                    </div>
                    <div className="text-sm text-defi-text-muted mb-1">
                      <span className="text-defi-purple">{link.affectedMetric}</span>
                      <ArrowRight size={12} className="inline mx-1" />
                      <span className="font-mono text-defi-accent">
                        {link.change}
                      </span>
                    </div>
                    <div className="text-xs text-defi-text-muted/70 bg-defi-bg/50 px-2 py-1 rounded">
                      {getRuleReference(link.ruleReference)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card border-defi-warning/30">
            <h3 className="text-sm font-medium text-defi-warning mb-2">
              影响的结果
            </h3>
            <div className="flex flex-wrap gap-2">
              {failure.affectedResults.map((result, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-defi-warning/10 text-defi-warning rounded-full text-xs"
                >
                  {result}
                </span>
              ))}
            </div>
          </div>

          <div className="card border-defi-accent/30">
            <h3 className="text-sm font-medium text-defi-accent mb-2">
              规则解释
            </h3>
            <p className="text-sm text-defi-text">{failure.explanation}</p>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-defi-border">
            <button
              onClick={onRestart}
              className="flex-1 flex items-center justify-center gap-2 btn-primary"
            >
              <RotateCcw size={18} />
              重新开始
            </button>
            <button
              onClick={onReview}
              className="flex-1 flex items-center justify-center gap-2 btn-secondary"
            >
              <Eye size={18} />
              查看复盘
            </button>
            <button
              onClick={onHome}
              className="flex items-center justify-center gap-2 btn-secondary"
            >
              <Home size={18} />
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
