import React, { useMemo } from 'react';
import { Settings, RefreshCw, Copy, ArrowRight } from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { compareResults } from '../utils/thresholdCalc';
import { ThresholdParams } from '../types';

const ParamCompare: React.FC = () => {
  const {
    rawLogs,
    resultsA,
    resultsB,
    thresholdParamsA,
    thresholdParamsB,
    setThresholdParamsA,
    setThresholdParamsB,
    runAnalysis,
    isAnalyzing,
  } = useAnalysisStore();

  const comparison = useMemo(() => {
    if (resultsA.length === 0 || resultsB.length === 0) return [];
    return compareResults(resultsA, resultsB);
  }, [resultsA, resultsB]);

  const differences = comparison.filter((c) => c.isDifferent);
  const qualityIssueLogIds = useMemo(
    () => new Set(resultsA.filter((r) => r.hasQualityIssue).map((r) => r.logId)),
    [resultsA]
  );

  const warningCountA = resultsA.filter((r) => r.isWarning && !r.hasQualityIssue).length;
  const warningCountB = resultsB.filter((r) => r.isWarning && !r.hasQualityIssue).length;

  const handleParamChange = (
    paramSet: 'A' | 'B',
    field: keyof ThresholdParams,
    value: string | number | boolean
  ) => {
    const setter = paramSet === 'A' ? setThresholdParamsA : setThresholdParamsB;
    setter({ [field]: value } as Partial<ThresholdParams>);
  };

  if (rawLogs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-blue-900" />
        阈值参数配置与对照
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="border border-gray-200 rounded-sm p-4 bg-blue-50/30">
          <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600"></span>
            参数组 A：{thresholdParamsA.name}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">参数组名称</label>
                <input
                  type="text"
                  value={thresholdParamsA.name}
                  onChange={(e) => handleParamChange('A', 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">预警阈值</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={thresholdParamsA.warningThreshold}
                    onChange={(e) =>
                      handleParamChange('A', 'warningThreshold', parseFloat(e.target.value) || 0)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={thresholdParamsA.thresholdUnit}
                    onChange={(e) =>
                      handleParamChange('A', 'thresholdUnit', e.target.value as any)
                    }
                    className="px-2 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="mΩ">mΩ</option>
                    <option value="Ω">Ω</option>
                    <option value="kΩ">kΩ</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={thresholdParamsA.temperatureCompensation}
                  onChange={(e) =>
                    handleParamChange('A', 'temperatureCompensation', e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">启用温度补偿</span>
              </label>
            </div>
            {thresholdParamsA.temperatureCompensation && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">基准温度 (°C)</label>
                  <input
                    type="number"
                    value={thresholdParamsA.baseTemperature}
                    onChange={(e) =>
                      handleParamChange('A', 'baseTemperature', parseFloat(e.target.value) || 25)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">温度系数 (/°C)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={thresholdParamsA.temperatureCoefficient}
                    onChange={(e) =>
                      handleParamChange(
                        'A',
                        'temperatureCoefficient',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-sm p-4 bg-green-50/30">
          <h3 className="font-medium text-green-900 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-600"></span>
            参数组 B：{thresholdParamsB.name}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">参数组名称</label>
                <input
                  type="text"
                  value={thresholdParamsB.name}
                  onChange={(e) => handleParamChange('B', 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">预警阈值</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={thresholdParamsB.warningThreshold}
                    onChange={(e) =>
                      handleParamChange('B', 'warningThreshold', parseFloat(e.target.value) || 0)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-green-500"
                  />
                  <select
                    value={thresholdParamsB.thresholdUnit}
                    onChange={(e) =>
                      handleParamChange('B', 'thresholdUnit', e.target.value as any)
                    }
                    className="px-2 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-green-500"
                  >
                    <option value="mΩ">mΩ</option>
                    <option value="Ω">Ω</option>
                    <option value="kΩ">kΩ</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={thresholdParamsB.temperatureCompensation}
                  onChange={(e) =>
                    handleParamChange('B', 'temperatureCompensation', e.target.checked)
                  }
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">启用温度补偿</span>
              </label>
            </div>
            {thresholdParamsB.temperatureCompensation && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">基准温度 (°C)</label>
                  <input
                    type="number"
                    value={thresholdParamsB.baseTemperature}
                    onChange={(e) =>
                      handleParamChange('B', 'baseTemperature', parseFloat(e.target.value) || 25)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">温度系数 (/°C)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={thresholdParamsB.temperatureCoefficient}
                    onChange={(e) =>
                      handleParamChange(
                        'B',
                        'temperatureCoefficient',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-6">
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing || rawLogs.length === 0}
          className="flex items-center gap-2 px-6 py-2 bg-blue-900 hover:bg-blue-800 disabled:bg-gray-300 text-white rounded-sm transition-colors"
        >
          {isAnalyzing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isAnalyzing ? '分析中...' : '重新计算'}
        </button>
      </div>

      {resultsA.length > 0 && resultsB.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm text-center">
              <div className="text-2xl font-bold text-blue-600">{warningCountA}</div>
              <div className="text-xs text-blue-500">
                {thresholdParamsA.name} 预警数
              </div>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-sm text-center">
              <div className="text-2xl font-bold text-green-600">{warningCountB}</div>
              <div className="text-xs text-green-500">
                {thresholdParamsB.name} 预警数
              </div>
            </div>
            <div
              className={`p-4 border rounded-sm text-center ${
                differences.length > 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  differences.length > 0 ? 'text-red-600' : 'text-gray-600'
                }`}
              >
                {differences.length}
              </div>
              <div
                className={`text-xs ${
                  differences.length > 0 ? 'text-red-500' : 'text-gray-500'
                }`}
              >
                判定差异数
              </div>
            </div>
          </div>

          {differences.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Copy className="w-4 h-4 text-gray-500" />
                判定差异记录
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600 font-medium w-16">
                        行号
                      </th>
                      <th className="px-3 py-2 text-left text-gray-600 font-medium">
                        设备编号
                      </th>
                      <th className="px-3 py-2 text-center text-gray-600 font-medium">
                        {thresholdParamsA.name}
                      </th>
                      <th className="px-3 py-2 text-center text-gray-600 font-medium">
                        变化
                      </th>
                      <th className="px-3 py-2 text-center text-gray-600 font-medium">
                        {thresholdParamsB.name}
                      </th>
                      <th className="px-3 py-2 text-left text-gray-600 font-medium">
                        测量值
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {differences.map((diff) => {
                      const hasIssue = qualityIssueLogIds.has(diff.logId);
                      return (
                        <tr
                          key={diff.logId}
                          className={`border-t border-gray-100 ${
                            hasIssue ? 'bg-gray-100 text-gray-400' : 'bg-yellow-50'
                          }`}
                        >
                          <td className="px-3 py-2">{diff.rawLineNumber}</td>
                          <td className="px-3 py-2 font-medium">{diff.deviceId}</td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                                diff.resultA.isWarning
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {diff.resultA.isWarning ? '🔴 预警' : '🟢 正常'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <ArrowRight className="w-4 h-4 text-amber-500 inline" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                                diff.resultB.isWarning
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {diff.resultB.isWarning ? '🔴 预警' : '🟢 正常'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {diff.resultA.measuredValue.toFixed(4)}
                            {diff.resultA.measuredUnit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {differences.length === 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-sm text-center">
              <p className="text-green-700">两组参数判定结果完全一致</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ParamCompare;
