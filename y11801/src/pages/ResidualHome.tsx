import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator } from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
import { ResultColumn } from '../components/ResultColumn';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { calculationService } from '../services';
import type { GetResultsFilters, CalculationResult, ResultStatus } from 'shared/types';

export default function ResidualHome() {
  const [filters, setFilters] = useState<GetResultsFilters>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['calculationResults', filters],
    queryFn: () => calculationService.getResults(filters),
    refetchInterval: 30000,
  });

  const results = Array.isArray(data?.data?.data) ? data.data.data : [];

  const groupedResults: Record<ResultStatus, CalculationResult[]> = {
    ready: [],
    need_confirm: [],
    cannot_calculate: [],
  };

  if (Array.isArray(results)) {
    results.forEach((result) => {
      if (result?.status) {
        groupedResults[result.status].push(result);
      }
    });
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 font-medium">加载失败</p>
          <p className="text-slate-500 text-sm mt-1">请稍后重试</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-blue-900 text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Calculator className="h-7 w-7" />
          <div>
            <h1 className="text-xl font-bold">残值试算主页</h1>
            <p className="text-blue-200 text-sm">实时监控残值试算结果，高效处理业务</p>
          </div>
        </div>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} />

      <div className="p-6">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-slate-600">正在加载数据...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(['ready', 'need_confirm', 'cannot_calculate'] as ResultStatus[]).map((status, index) => (
              <div
                key={status}
                className="opacity-0 animate-[fadeInUp_0.5s_ease-out_forwards]"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <ResultColumn
                  status={status}
                  results={groupedResults[status]}
                  isLoading={isLoading}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
