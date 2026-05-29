import { CheckCircle2, XCircle, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { ErrorType } from '@/types';
import { ERROR_TYPE_LABELS } from '@/types';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
  isCorrect: boolean;
  scoreChange: number;
  details: string | null;
  errorType: ErrorType | null;
  onNext: () => void;
  isLastCard: boolean;
}

export function FeedbackModal({
  isCorrect,
  scoreChange,
  details,
  errorType,
  onNext,
  isLastCard,
}: FeedbackModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <div
        className={cn(
          'w-full max-w-3xl rounded-2xl border backdrop-blur-xl shadow-2xl pointer-events-auto animate-slide-up',
          isCorrect
            ? 'bg-gradient-to-br from-emerald-900/90 to-green-900/90 border-emerald-500/40'
            : 'bg-gradient-to-br from-red-900/90 to-rose-900/90 border-red-500/40'
        )}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0',
              isCorrect ? 'bg-emerald-500/30' : 'bg-red-500/30'
            )}>
              {isCorrect ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce-slow" />
              ) : (
                <XCircle className="w-8 h-8 text-red-400 animate-shake" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className={cn(
                  'text-xl font-bold',
                  isCorrect ? 'text-emerald-300' : 'text-red-300'
                )}>
                  {isCorrect ? '✓ 决策正确！' : '✗ 决策失误'}
                </h3>
                <div className={cn(
                  'flex items-center gap-1 px-3 py-1 rounded-full font-mono font-bold',
                  isCorrect
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'
                )}>
                  {isCorrect ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{isCorrect ? '+' : ''}{scoreChange} 分</span>
                </div>
              </div>

              {errorType && (
                <div className="inline-block px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-sm mb-3">
                  错误类型：{ERROR_TYPE_LABELS[errorType]}
                </div>
              )}

              {details && (
                <p className={cn(
                  'text-sm leading-relaxed',
                  isCorrect ? 'text-emerald-200/90' : 'text-red-200/90'
                )}>
                  {details}
                </p>
              )}

              {isCorrect && (
                <p className="text-sm text-emerald-200/80 mt-2">
                  干得漂亮！继续保持这种判断力。
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onNext}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 active:scale-95',
                isCorrect
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                  : 'bg-red-500 hover:bg-red-400 text-white'
              )}
            >
              {isLastCard ? '查看最终成绩' : '下一条会话'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
