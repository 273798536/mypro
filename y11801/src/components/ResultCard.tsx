import { Eye, RefreshCw, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';
import { calculationService } from '../services';
import type { CalculationResult, ResultStatus } from 'shared/types';
import { RESULT_STATUS_CONFIG } from 'shared/constants';

interface ResultCardProps {
  result: CalculationResult;
  status: ResultStatus;
}

export function ResultCard({ result, status }: ResultCardProps) {
  const navigate = useNavigate();
  const config = RESULT_STATUS_CONFIG[status];

  const recalculateMutation = useMutation({
    mutationFn: (id: string) =>
      calculationService.recalculate(id, {
        recordId: id,
        reason: '手动触发重算',
        operator: 'current_user',
      }),
  });

  const exportMutation = useMutation({
    mutationFn: (id: string) => calculationService.exportSingle(id),
    onSuccess: (data) => {
      const blob = data as unknown as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `result-${result.id}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const handleRecalculate = () => {
    recalculateMutation.mutate(result.id);
  };

  const handleExport = () => {
    exportMutation.mutate(result.id);
  };

  const amountClass = result.finalReceivable > 0 ? 'text-red-600' : 'text-green-600';
  const amountLabel = result.finalReceivable > 0 ? '应补' : '应退';
  const amountValue = result.finalReceivable > 0 ? result.finalReceivable : result.finalPayable;

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm',
        'hover:shadow-md transition-all duration-200 hover:-translate-y-0.5'
      )}
    >
      <div className="h-1" style={{ backgroundColor: config.color }} />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-slate-800">
              {result.vehicle.brand} {result.vehicle.model}
            </h4>
            <p className="text-sm text-slate-500">{result.vehicle.plateNumber}</p>
          </div>
          <span
            className="text-xs px-2 py-1 rounded font-medium"
            style={{ backgroundColor: config.bgColor, color: config.color }}
          >
            {config.label}
          </span>
        </div>

        <p className="text-sm text-slate-600">
          客户：<span className="font-medium text-slate-800">{result.contract.customerName}</span>
        </p>

        <div className="grid grid-cols-2 gap-2 text-sm border-t border-slate-100 pt-3">
          <div>
            <p className="text-slate-500">门店收车价</p>
            <AnimatedNumber
              value={result.storePrice}
              prefix="¥"
              className="font-semibold text-slate-800"
            />
          </div>
          <div>
            <p className="text-slate-500">贷款余额</p>
            <AnimatedNumber
              value={result.remainingBalance}
              prefix="¥"
              className="font-semibold text-slate-800"
            />
          </div>
          <div>
            <p className="text-slate-500">残值</p>
            <AnimatedNumber
              value={result.residualValue}
              prefix="¥"
              className="font-semibold text-slate-800"
            />
          </div>
          <div>
            <p className="text-slate-500">补贴</p>
            <AnimatedNumber
              value={result.subsidyDeduction}
              prefix="¥"
              className="font-semibold text-slate-800"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-sm text-slate-500">{amountLabel}金额</p>
            <AnimatedNumber
              value={amountValue}
              prefix="¥"
              className={cn('text-lg font-bold', amountClass)}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => navigate(`/detail/${result.id}`)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-blue-900 border-2 border-blue-900 rounded hover:bg-blue-50 transition-colors"
          >
            <Eye className="h-4 w-4" />
            查看详情
          </button>
          <button
            onClick={handleRecalculate}
            disabled={recalculateMutation.isPending}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-amber-600 border-2 border-amber-600 rounded hover:bg-amber-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', recalculateMutation.isPending && 'animate-spin')} />
            余额重算
          </button>
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 border-2 border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
