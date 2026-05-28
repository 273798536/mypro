import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';
import { ResultCard } from './ResultCard';
import Empty from './Empty';
import type { CalculationResult, ResultStatus } from 'shared/types';
import { RESULT_STATUS_CONFIG } from 'shared/constants';

interface ResultColumnProps {
  status: ResultStatus;
  results: CalculationResult[];
  isLoading: boolean;
}

const iconMap = {
  ready: CheckCircle,
  need_confirm: AlertTriangle,
  cannot_calculate: XCircle,
};

export function ResultColumn({ status, results, isLoading }: ResultColumnProps) {
  const config = RESULT_STATUS_CONFIG[status];
  const Icon = iconMap[status];

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-4 py-3 rounded-t-lg border-b-2"
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.color,
        }}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" style={{ color: config.color }} />
          <span className="font-semibold" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
        <div
          className="px-3 py-1 rounded-full font-bold text-lg"
          style={{ backgroundColor: config.color, color: 'white' }}
        >
          <AnimatedNumber value={results.length} decimals={0} />
        </div>
      </div>

      <div className="flex-1 bg-slate-50 p-4 rounded-b-lg overflow-y-auto space-y-4 min-h-[500px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-3 border-slate-300 border-t-blue-900 rounded-full" />
          </div>
        ) : results.length === 0 ? (
          <Empty />
        ) : (
          results.map((result, index) => (
            <div
              key={result.id}
              className={cn(
                'opacity-0 animate-[fadeInUp_0.4s_ease-out_forwards]'
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <ResultCard result={result} status={status} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
