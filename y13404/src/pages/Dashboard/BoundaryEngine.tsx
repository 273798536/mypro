import React, { useState } from 'react';
import { Zap, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { handleEmptySet, handleZeroValue, handleExtrapolation, processAllBoundaries, getBoundaryTypeLabel, getBoundaryTypeColor } from '@/utils/boundaryEngine';
import { cn } from '@/lib/utils';

interface TestData {
  name: string;
  data: any[];
  value: number;
  threshold: number;
  context: string;
}

const testCases: TestData[] = [
  {
    name: '空集合测试',
    data: [],
    value: 0,
    threshold: 10,
    context: '路径#A23 weight字段',
  },
  {
    name: '零值测试',
    data: [1, 2, 3],
    value: 0,
    threshold: 10,
    context: '凌晨3:00路径计数',
  },
  {
    name: '外推越界测试',
    data: [1, 2, 3, 4, 5],
    value: 187.5,
    threshold: 100,
    context: '路径#C42延迟值',
  },
  {
    name: '正常数据测试',
    data: [1, 2, 3, 4, 5],
    value: 85,
    threshold: 100,
    context: '正常路径数据',
  },
];

const BoundaryEngine: React.FC = () => {
  const [activeTest, setActiveTest] = useState<number>(0);
  const [testResults, setTestResults] = useState<Record<number, any[]>>({});

  const runTest = (index: number) => {
    const testCase = testCases[index];
    const results = processAllBoundaries(
      testCase.data,
      testCase.value,
      testCase.threshold,
      testCase.context
    );
    setTestResults((prev) => ({ ...prev, [index]: results }));
    setActiveTest(index);
  };

  const runAllTests = () => {
    const allResults: Record<number, any[]> = {};
    testCases.forEach((testCase, index) => {
      allResults[index] = processAllBoundaries(
        testCase.data,
        testCase.value,
        testCase.threshold,
        testCase.context
      );
    });
    setTestResults(allResults);
  };

  const currentResults = testResults[activeTest] || [];
  const currentTest = testCases[activeTest];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">边界处理引擎</h3>
              <p className="text-xs text-slate-500">空集合、零值、外推越界自动识别</p>
            </div>
          </div>
          <button
            onClick={runAllTests}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200"
          >
            运行全部测试
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {testCases.map((testCase, index) => (
              <div
                key={index}
                onClick={() => runTest(index)}
                className={cn(
                  'p-4 rounded-lg border cursor-pointer transition-all duration-200',
                  activeTest === index
                    ? 'border-purple-300 bg-purple-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-800 text-sm">{testCase.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{testCase.context}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      数据量: {testCase.data.length} | 值: {testCase.value}
                    </span>
                    {testResults[index] && (
                      testResults[index].some((r: any) => r.isBoundary) ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400">引擎运行中</span>
            </div>

            {currentResults.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">测试用例：</span>
                  <span className="text-white font-medium">{currentTest.name}</span>
                </div>

                <div className="space-y-3">
                  {currentResults.map((result, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center gap-2">
                        {result.isBoundary ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        )}
                        <span className="text-xs text-slate-300">
                          {index === 0 ? '空集合检查' : index === 1 ? '零值检查' : '外推越界检查'}
                        </span>
                      </div>

                      {result.isBoundary && result.type && (
                        <div className="ml-6 p-3 bg-slate-700/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: getBoundaryTypeColor(result.type) + '30', color: getBoundaryTypeColor(result.type) }}
                            >
                              {getBoundaryTypeLabel(result.type)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{result.explanation}</p>
                          {result.valueBefore !== null && result.valueAfter !== null && (
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <span className="text-slate-400">变化前:</span>
                              <span className="text-red-400 line-through">{result.valueBefore}</span>
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-400">变化后:</span>
                              <span className="text-emerald-400">{result.valueAfter}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {!result.isBoundary && (
                        <p className="ml-6 text-xs text-slate-400">{result.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <Zap className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">点击左侧测试用例运行边界检查</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">边界值处理说明</p>
              <p className="text-xs text-amber-600 mt-1">
                空集合和零值不会被当作普通输入处理，会触发特殊分支逻辑。外推越界会保留变化前后的值，便于后续重跑时参照。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoundaryEngine;
