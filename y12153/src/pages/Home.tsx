import { useEffect } from 'react';
import ParameterInput from '@/components/ParameterInput';
import ResultDisplay from '@/components/ResultDisplay';
import AnomalyPanel from '@/components/AnomalyPanel';
import TraceabilityPanel from '@/components/TraceabilityPanel';
import { useCalculationStore } from '@/store/calculationStore';
import type { CalculateRequest } from '@shared/types';

export default function Home() {
  const {
    isCalculating,
    currentResult,
    calculationError,
    calculate,
    clearResult,
    loadHistory,
  } = useCalculationStore();

  useEffect(() => {
    loadHistory(5);
  }, [loadHistory]);

  const handleCalculate = (request: CalculateRequest) => {
    calculate(request);
  };

  const handleReset = () => {
    clearResult();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2
            className="text-4xl font-bold text-slate-800 mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            船舶横摇舒适度评估系统
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            基于 ISO 2631 标准的专业级横摇舒适度量化分析工具，
            支持多源数据溯源、异常检测和历史记录管理
          </p>
        </div>

        {calculationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
            {calculationError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <ParameterInput
                onCalculate={handleCalculate}
                isCalculating={isCalculating}
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {currentResult ? (
              <>
                <ResultDisplay result={currentResult} onReset={handleReset} />
                <AnomalyPanel anomalies={currentResult.anomalies} />
                <TraceabilityPanel traceability={currentResult.traceability} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-dashed border-slate-300 p-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center mb-6">
                  <svg
                    className="w-12 h-12 text-[#0A2463]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3
                  className="text-2xl font-bold text-slate-800 mb-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  等待分析
                </h3>
                <p className="text-slate-500 text-center max-w-md">
                  在左侧输入船舶参数、波浪条件、航行信息和舱室位置，
                  点击"开始计算"按钮获取横摇舒适度评估结果
                </p>
                <div className="mt-8 grid grid-cols-3 gap-6 w-full max-w-md">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#0A2463]">ISO</div>
                    <div className="text-xs text-slate-500 mt-1">2631 标准</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#0A2463]">10</div>
                    <div className="text-xs text-slate-500 mt-1">级评分制</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#0A2463]">3</div>
                    <div className="text-xs text-slate-500 mt-1">项异常检测</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
