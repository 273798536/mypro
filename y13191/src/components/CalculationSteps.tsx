import React, { useMemo } from 'react';
import { Calculator, X } from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';

const CalculationSteps: React.FC = () => {
  const { selectedLogId, setSelectedLogId, resultsA, rawLogs, thresholdParamsA } = useAnalysisStore();

  const selectedResult = useMemo(() => {
    return resultsA.find((r) => r.logId === selectedLogId);
  }, [resultsA, selectedLogId]);

  const selectedLog = useMemo(() => {
    return rawLogs.find((l) => l.id === selectedLogId);
  }, [rawLogs, selectedLogId]);

  if (!selectedLogId || !selectedResult || !selectedLog) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-900" />
          计算过程
        </h2>
        <p className="text-gray-500 text-center py-8">
          点击表格中的 👁️ 按钮查看单条记录的详细计算过程
        </p>
      </div>
    );
  }

  const formatNum = (num: number) => num.toFixed(4);

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-900" />
          计算过程
          <span className="text-sm font-normal text-gray-500">
            （行号 {selectedLog.rawLineNumber}，{selectedLog.deviceId}）
          </span>
        </h2>
        <button
          onClick={() => setSelectedLogId(null)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-2">阈值参数（{thresholdParamsA.name}）</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">预警阈值：</span>
            <span className="font-mono text-gray-800">
              {thresholdParamsA.warningThreshold}{thresholdParamsA.thresholdUnit}
            </span>
          </div>
          <div>
            <span className="text-gray-500">温度补偿：</span>
            <span className="text-gray-800">
              {thresholdParamsA.temperatureCompensation ? '启用' : '禁用'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">基准温度：</span>
            <span className="font-mono text-gray-800">{thresholdParamsA.baseTemperature}°C</span>
          </div>
          <div>
            <span className="text-gray-500">温度系数：</span>
            <span className="font-mono text-gray-800">{thresholdParamsA.temperatureCoefficient}/°C</span>
          </div>
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-sm">
        <h3 className="text-sm font-medium text-blue-800 mb-2">原始数据</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
          <div>
            <span className="text-blue-600">原始内阻：</span>
            <span className="text-blue-900">
              {selectedLog.resistance !== null
                ? `${selectedLog.resistance}${selectedLog.resistanceUnit}`
                : '缺失'}
            </span>
          </div>
          <div>
            <span className="text-blue-600">测量温度：</span>
            <span className="text-blue-900">
              {selectedLog.temperature !== null ? `${selectedLog.temperature}°C` : '缺失'}
            </span>
          </div>
          <div>
            <span className="text-blue-600">采集时间：</span>
            <span className="text-blue-900">{selectedLog.timestamp}</span>
          </div>
          <div>
            <span className="text-blue-600">来源字段：</span>
            <span className="text-blue-900">"{selectedLog.resistanceField}"</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {selectedResult.calculationSteps.map((step, index) => (
          <div
            key={step.stepId}
            className={`p-4 border rounded-sm ${
              index === selectedResult.calculationSteps.length - 1
                ? selectedResult.isWarning
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  index === selectedResult.calculationSteps.length - 1
                    ? selectedResult.isWarning
                      ? 'bg-red-500 text-white'
                      : 'bg-green-500 text-white'
                    : 'bg-blue-900 text-white'
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-1">{step.description}</h4>
                <div className="font-mono text-sm bg-gray-50 p-2 rounded mb-2">
                  <span className="text-gray-700">{step.formula}</span>
                </div>
                {step.conversion && (
                  <div className="text-xs text-gray-600 font-mono mb-2">
                    <span className="text-gray-500">计算过程：</span>
                    {step.conversion}
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-gray-500">输入：</span>
                  <span className="font-mono text-gray-800">
                    {formatNum(step.inputValue)}{step.inputUnit}
                  </span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="text-gray-500">输出：</span>
                  <span
                    className={`font-mono font-bold ${
                      index === selectedResult.calculationSteps.length - 1
                        ? selectedResult.isWarning
                          ? 'text-red-600'
                          : 'text-green-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {formatNum(step.outputValue)}{step.outputUnit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-600">最终判定：</span>
            <span
              className={`ml-2 font-bold ${
                selectedResult.isWarning ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {selectedResult.isWarning ? '🔴 预警' : '🟢 正常'}
            </span>
          </div>
          <div className="text-sm text-gray-500 font-mono">
            {formatNum(selectedResult.measuredValue)}
            {selectedResult.measuredUnit}{' '}
            {selectedResult.isWarning ? '>' : '≤'}{' '}
            {formatNum(selectedResult.thresholdValue)}
            {selectedResult.thresholdUnit}
          </div>
        </div>
      </div>

      {selectedResult.hasQualityIssue && (
        <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-sm text-sm text-gray-600">
          ⚠️ 该记录存在数据质量问题，计算结果仅供参考，不计入有效统计
        </div>
      )}
    </div>
  );
};

export default CalculationSteps;
