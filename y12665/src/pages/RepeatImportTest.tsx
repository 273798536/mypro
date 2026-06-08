import { useState } from 'react';
import { useExerciseStore } from '@/store/useExerciseStore';
import { AlertTriangle, FilePlus, Play, CheckCircle, XCircle, ChevronRight, BarChart3 } from 'lucide-react';
import type { ImportResult } from '../../shared/types';

type Step = 0 | 1 | 2 | 3 | 4;

interface TestReport {
  firstImport: ImportResult;
  secondImport: ImportResult;
  duplicateDetectionWorks: boolean;
  message: string;
}

export default function RepeatImportTest() {
  const { runRepeatImportTest, loading } = useExerciseStore();
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [report, setReport] = useState<TestReport | null>(null);
  const [mockData, setMockData] = useState<Array<{ name: string; sourceRowNumber: number }> | null>(null);

  const steps = [
    { id: 1, title: '准备测试数据', desc: '生成模拟的练习记录数据' },
    { id: 2, title: '第一次导入', desc: '将测试数据导入数据库' },
    { id: 3, title: '第二次导入', desc: '再次导入相同数据，触发重复检测' },
    { id: 4, title: '查看测试报告', desc: '检查重复条目检测结果' },
  ];

  const handleStep1 = () => {
    setMockData([
      { name: 'Test Exercise A', sourceRowNumber: 101 },
      { name: 'Test Exercise B', sourceRowNumber: 102 },
    ]);
    setCurrentStep(1);
  };

  const handleStep2 = () => {
    setCurrentStep(2);
  };

  const handleStep3 = () => {
    setCurrentStep(3);
  };

  const handleRunTest = async () => {
    const result = await runRepeatImportTest();
    if (result) {
      setReport(result);
      setCurrentStep(4);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setReport(null);
    setMockData(null);
  };

  const ImportResultCard = ({
    title,
    result,
    isSecond,
  }: {
    title: string;
    result: ImportResult;
    isSecond: boolean;
  }) => (
    <div className="bg-deep-space-700 rounded-xl p-5 border border-deep-space-600">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-lg">{title}</h4>
        {isSecond && (
          <span className="text-xs bg-amber-warn/20 text-amber-warn px-2 py-1 rounded">
            期望检测重复
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-deep-space-800 rounded-lg p-3">
          <div className="text-xs text-deep-space-400 mb-1">总数</div>
          <div className="text-2xl font-bold text-white font-mono">{result.total}</div>
        </div>
        <div className="bg-deep-space-800 rounded-lg p-3">
          <div className="text-xs text-deep-space-400 mb-1">新增</div>
          <div className="text-2xl font-bold text-green-pass font-mono">{result.inserted}</div>
        </div>
        <div className="bg-deep-space-800 rounded-lg p-3">
          <div className="text-xs text-deep-space-400 mb-1">更新</div>
          <div className="text-2xl font-bold text-ice-blue font-mono">{result.updated}</div>
        </div>
        <div className="bg-deep-space-800 rounded-lg p-3">
          <div className="text-xs text-deep-space-400 mb-1">跳过</div>
          <div
            className={`text-2xl font-bold font-mono ${
              isSecond && result.skipped > 0 ? 'text-amber-warn' : 'text-deep-space-300'
            }`}
          >
            {result.skipped}
          </div>
        </div>
      </div>
      {isSecond && result.duplicates.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-deep-space-300 mb-2">检测到的重复条目：</div>
          <div className="space-y-2">
            {result.duplicates.map((dup, idx) => (
              <div
                key={idx}
                className="bg-red-reject/10 border border-red-reject/30 rounded-lg p-3 flex items-center gap-3"
              >
                <AlertTriangle className="text-red-reject shrink-0" size={18} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">
                    {dup.incomingData.name || `行 ${dup.rowIndex}`}
                  </div>
                  <div className="text-xs text-deep-space-300">
                    源行号: {dup.rowIndex} | 已有 ID: {dup.existingId.slice(0, 8)}...
                  </div>
                </div>
                <span className="text-xs bg-red-reject/20 text-red-reject px-2 py-1 rounded shrink-0">
                  重复
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-deep-space-900 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 p-4 bg-red-reject/10 border-2 border-red-reject/50 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-red-reject shrink-0 mt-0.5" size={24} />
          <div>
            <h2 className="text-lg font-bold text-red-reject">测试环境</h2>
            <p className="text-sm text-red-reject/80">
              本页面用于测试重复数据导入检测功能。执行操作将向数据库写入测试数据，请在测试环境中使用。
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">重复导入测试</h1>
          <p className="text-deep-space-300 mt-2">
            验证系统能否正确识别和处理重复导入的练习记录数据
          </p>
        </div>

        <div className="bg-deep-space-800 border border-deep-space-600 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold mb-6">测试步骤</h3>
          <div className="relative">
            <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-deep-space-600" />
            <div className="space-y-4">
              {steps.map((step, idx) => {
                const isDone = currentStep > step.id;
                const isActive = currentStep === step.id;
                const isPending = currentStep < step.id;
                return (
                  <div key={step.id} className="relative flex items-start gap-4 pl-0">
                    <div
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 border-2 ${
                        isDone
                          ? 'bg-green-pass border-green-pass text-deep-space-900'
                          : isActive
                          ? 'bg-ice-blue border-ice-blue text-deep-space-900 shadow-glow-ice'
                          : 'bg-deep-space-700 border-deep-space-500 text-deep-space-400'
                      }`}
                    >
                      {isDone ? <CheckCircle size={18} /> : step.id}
                    </div>
                    <div className="flex-1 pt-1">
                      <div
                        className={`font-medium ${
                          isActive ? 'text-ice-blue' : isDone ? 'text-white' : 'text-deep-space-400'
                        }`}
                      >
                        {step.title}
                      </div>
                      <div className="text-sm text-deep-space-300">{step.desc}</div>
                    </div>
                    <ChevronRight
                      size={18}
                      className={`pt-1 ${isPending ? 'text-deep-space-600' : 'text-deep-space-400'}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {currentStep === 0 && (
            <div className="bg-deep-space-800 border border-deep-space-600 rounded-xl p-8 text-center">
              <FilePlus className="mx-auto text-ice-blue mb-4" size={48} />
              <h3 className="text-xl font-semibold mb-2">准备开始测试</h3>
              <p className="text-deep-space-300 mb-6">
                点击下方按钮生成模拟数据并开始重复导入测试流程
              </p>
              <button
                onClick={handleStep1}
                className="px-6 py-3 bg-ice-blue text-deep-space-900 rounded-lg hover:bg-ice-blue-hover transition-colors font-medium"
              >
                生成模拟数据
              </button>
            </div>
          )}

          {currentStep >= 1 && mockData && (
            <div className="bg-deep-space-800 border border-deep-space-600 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-pass text-deep-space-900 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                模拟数据
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {mockData.map((item, idx) => (
                  <div key={idx} className="bg-deep-space-700 rounded-lg p-4">
                    <div className="text-white font-medium">{item.name}</div>
                    <div className="text-sm text-deep-space-300 mt-1">
                      源行号: <span className="font-mono">{item.sourceRowNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
              {currentStep === 1 && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleStep2}
                    className="flex items-center gap-2 px-6 py-3 bg-ice-blue text-deep-space-900 rounded-lg hover:bg-ice-blue-hover transition-colors font-medium"
                  >
                    <Play size={18} />
                    执行第一次导入
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep >= 2 && (
            <div className="bg-deep-space-800 border border-deep-space-600 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-pass text-deep-space-900 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                第一次导入完成
              </h3>
              <p className="text-deep-space-300 mb-2">
                模拟数据已首次导入数据库。现在再次导入相同数据，验证重复检测功能。
              </p>
              {currentStep === 2 && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleStep3}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-warn text-deep-space-900 rounded-lg hover:bg-amber-warn/90 transition-colors font-medium"
                  >
                    <Play size={18} />
                    执行第二次导入
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="bg-deep-space-800 border border-deep-space-600 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-ice-blue text-deep-space-900 flex items-center justify-center text-sm font-bold">
                  3
                </span>
                准备执行测试
              </h3>
              <p className="text-deep-space-300 mb-4">
                即将执行完整的重复导入测试流程（包含第一次和第二次导入），并生成测试报告。
              </p>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleRunTest}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-ice-blue text-deep-space-900 rounded-lg hover:bg-ice-blue-hover transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-deep-space-900/30 border-t-deep-space-900 rounded-full animate-spin" />
                      测试执行中...
                    </>
                  ) : (
                    <>
                      <BarChart3 size={18} />
                      查看测试报告
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && report && (
            <div className="space-y-6">
              <div
                className={`border-2 rounded-xl p-6 ${
                  report.duplicateDetectionWorks
                    ? 'bg-green-pass/10 border-green-pass/50'
                    : 'bg-red-reject/10 border-red-reject/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      report.duplicateDetectionWorks ? 'bg-green-pass/20' : 'bg-red-reject/20'
                    }`}
                  >
                    {report.duplicateDetectionWorks ? (
                      <CheckCircle className="text-green-pass" size={32} />
                    ) : (
                      <XCircle className="text-red-reject" size={32} />
                    )}
                  </div>
                  <div>
                    <h3
                      className={`text-2xl font-bold ${
                        report.duplicateDetectionWorks ? 'text-green-pass' : 'text-red-reject'
                      }`}
                    >
                      {report.duplicateDetectionWorks ? '测试通过' : '测试失败'}
                    </h3>
                    <p
                      className={`mt-1 ${
                        report.duplicateDetectionWorks ? 'text-green-pass/80' : 'text-red-reject/80'
                      }`}
                    >
                      {report.message}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <ImportResultCard title="第一次导入" result={report.firstImport} isSecond={false} />
                <ImportResultCard title="第二次导入" result={report.secondImport} isSecond={true} />
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 bg-deep-space-700 border border-deep-space-500 rounded-lg hover:bg-deep-space-600 transition-colors"
                >
                  重新测试
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
