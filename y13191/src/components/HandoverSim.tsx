import React, { useState, useMemo, useEffect } from 'react';
import { Handshake, Search, FileText, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { getIssueTypeLabel } from '../utils/qualityCheck';

const HandoverSim: React.FC = () => {
  const {
    rawLogs,
    resultsA,
    qualityIssues,
    overrideAnalysis,
    currentReport,
    fieldMappingResult,
    generateAnalysisReport,
    isAnalyzing,
  } = useAnalysisStore();

  const [selectedLineNumber, setSelectedLineNumber] = useState<number | null>(null);
  const [step, setStep] = useState<'select' | 'verify'>('select');

  useEffect(() => {
    if (
      rawLogs.length > 0 &&
      resultsA.length > 0 &&
      fieldMappingResult &&
      !currentReport &&
      !isAnalyzing
    ) {
      generateAnalysisReport();
    }
  }, [rawLogs, resultsA, fieldMappingResult, currentReport, isAnalyzing, generateAnalysisReport]);

  const logMap = useMemo(() => {
    const map = new Map<number, typeof rawLogs[0]>();
    rawLogs.forEach((log) => {
      map.set(log.rawLineNumber, log);
    });
    return map;
  }, [rawLogs]);

  const resultMap = useMemo(() => {
    const map = new Map(resultsA.map((r) => [r.logId, r]));
    return map;
  }, [resultsA]);

  const issueMap = useMemo(() => {
    const map = new Map<string, typeof qualityIssues>();
    qualityIssues.forEach((issue) => {
      const existing = map.get(issue.logId) || [];
      existing.push(issue);
      map.set(issue.logId, existing);
    });
    return map;
  }, [qualityIssues]);

  const overrideMap = useMemo(() => {
    const map = new Map(overrideAnalysis.map((o) => [o.logId, o]));
    return map;
  }, [overrideAnalysis]);

  const reportLines = useMemo(() => {
    if (!currentReport) return [];
    const lines = currentReport.markdownContent.split('\n');
    return lines.map((line, index) => ({ lineNumber: index + 1, content: line }));
  }, [currentReport]);

  const linesWithReferences = useMemo(() => {
    return reportLines.filter((line) => {
      const hasLineRef = /行号\s+(\d+)/.test(line.content);
      const hasDeviceRef = /BAT-\d+/.test(line.content);
      return hasLineRef || hasDeviceRef;
    });
  }, [reportLines]);

  const verifyLine = (lineNumber: number) => {
    setSelectedLineNumber(lineNumber);
    setStep('verify');
  };

  const selectedLog = selectedLineNumber ? logMap.get(selectedLineNumber) : null;
  const selectedResult = selectedLog ? resultMap.get(selectedLog.id) : null;
  const selectedIssues = selectedLog ? issueMap.get(selectedLog.id) : null;
  const selectedOverride = selectedLog ? overrideMap.get(selectedLog.id) : null;

  const findReportLine = (lineNum: number) => {
    return reportLines.find((l) => l.lineNumber === lineNum);
  };

  if (rawLogs.length === 0 || !currentReport) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Handshake className="w-5 h-5 text-blue-900" />
          交接模拟
        </h2>
        <p className="text-gray-500 text-center py-8">
          请先上传数据并生成分析报告后再进行交接模拟
        </p>
      </div>
      );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Handshake className="w-5 h-5 text-blue-900" />
        交接模拟验证
      </h2>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-sm">
        <p className="text-sm text-blue-700">
          <strong>使用说明：</strong>
          本功能模拟实验老师小林按普通交接方式验证"电池内阻阈值预警"分析结果。
          从下方报告中选择一条有引用的条目，系统会自动定位到原始传感器日志记录，
          验证处理结果是否可追溯。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          报告条目（选择要验证的行）
        </h3>
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-sm text-gray-600">
            共 {linesWithReferences.length} 条可追溯条目
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium w-20">
                    报告行
                  </th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">
                    内容
                  </th>
                  <th className="px-3 py-2 text-center text-gray-600 font-medium w-20">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {linesWithReferences.map((line) => {
                  const match = line.content.match(/行号\s+(\d+)/);
                  const logLineNum = match ? parseInt(match[1]) : null;
                  const isSelected = selectedLineNumber === logLineNum;
                  return (
                    <tr
                      key={line.lineNumber}
                      className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => logLineNum && verifyLine(logLineNum)}
                    >
                      <td className="px-3 py-2 text-gray-500">
                        L{line.lineNumber}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-md truncate">
                        {line.content.replace(/\|/g, ' ').trim()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {logLineNum && (
                          <button className="text-blue-600 hover:text-blue-800 text-xs">
                            验证 →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

        <div>
          <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            原始日志追溯
          </h3>
          {selectedLog && selectedResult ? (
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              原始行号: {selectedLog.rawLineNumber}
            </span>
            <span className="text-xs text-gray-500">
              {selectedLog.deviceId}
            </span>
              </div>

              <div className="p-4 space-y-4">
                <div className="p-3 bg-gray-50 rounded-sm">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    📄 原始日志记录
                  </h4>
                  <div className="font-mono text-xs space-y-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-500">字段名：</span>
                        <span className="text-gray-700">
                          "{selectedLog.deviceIdField}"
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">设备编号：</span>
                        <span className="text-gray-800 font-medium">
                          {selectedLog.deviceId}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">原始字段：</span>
                        <span className="text-gray-700">
                          "{selectedLog.resistanceField}"
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">原始内阻：</span>
                        <span className="text-gray-800 font-medium">
                          {selectedLog.resistance !== null
                            ? `${selectedLog.resistance}${selectedLog.resistanceUnit}`
                            : '缺失'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">原始字段：</span>
                        <span className="text-gray-700">
                          "{selectedLog.temperatureField}"
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">测量温度：</span>
                        <span className="text-gray-800 font-medium">
                          {selectedLog.temperature !== null
                            ? `${selectedLog.temperature}°C`
                            : '缺失'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">采集时间：</span>
                        <span className="text-gray-800">
                          {selectedLog.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-sm">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">
                    🔍 计算过程摘要
                  </h4>
                  <div className="font-mono text-xs space-y-1">
                    {selectedResult.calculationSteps.map((step, idx) => (
                      <div key={step.stepId} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-gray-600">
                            {step.description}: {step.formula}
                          </div>
                          {step.conversion && (
                            <div className="text-gray-500">{step.conversion}</div>
                          )}
                          <div className="text-gray-700">
                            {step.inputValue}
                            {step.inputUnit} → {step.outputValue}
                            {step.outputUnit}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-sm ${
                    selectedResult.isWarning
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-green-50 border border-green-200'
                  }`}
                >
                  <h4
                    className={`text-sm font-medium mb-1 ${
                      selectedResult.isWarning
                        ? 'text-red-700'
                        : 'text-green-700'
                    }`}
                  >
                    {selectedResult.isWarning ? '🔴 处理结果：预警' : '🟢 处理结果：正常'}
                  </h4>
                  <div className="font-mono text-xs">
                    <span className="text-gray-600">判定依据：</span>
                    <span
                      className={`font-bold ${
                        selectedResult.isWarning
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {selectedResult.measuredValue.toFixed(4)}
                      {selectedResult.measuredUnit}{' '}
                      {selectedResult.isWarning ? '>' : '≤'}{' '}
                      {selectedResult.thresholdValue}
                      {selectedResult.thresholdUnit}
                    </span>
                  </div>
                </div>

                {selectedIssues && selectedIssues.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm">
                    <h4 className="text-sm font-medium text-amber-700 mb-2">
                      ⚠️ 数据质量问题
                    </h4>
                    <ul className="text-xs text-amber-600 space-y-1">
                      {selectedIssues.map((issue) => (
                        <li key={issue.issueId}>
                          • [{getIssueTypeLabel(issue.issueType)}]{' '}
                          {issue.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedOverride && selectedOverride.manualRemark && (
                  <div
                  className={`p-3 rounded-sm border ${
                    selectedOverride.isConsistent
                      ? 'bg-green-50 border-green-200'
                      : 'bg-purple-50 border-purple-200'
                  }`}
                >
                  <h4
                    className={`text-sm font-medium mb-2 flex items-center gap-2 ${
                      selectedOverride.isConsistent
                        ? 'text-green-700'
                        : 'text-purple-700'
                      }`}
                  >
                    ✏️ 人工备注信息
                    {selectedOverride.isConsistent ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </h4>
                  <div className="text-xs space-y-1">
                      <div>
                        <span className="text-gray-600">人工备注：</span>
                        <span className="text-gray-800">
                          "{selectedOverride.manualRemark}"
                        </span>
                      </div>
                      {selectedOverride.operator && (
                        <div>
                          <span className="text-gray-600">改判人：</span>
                          <span className="text-gray-800">
                            {selectedOverride.operator}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">改判判定：</span>
                        <span
                          className={`font-medium ${
                            selectedOverride.manualJudgement === 'warning'
                              ? 'text-red-600'
                              : 'text-green-600'
                            }`}
                        >
                          {selectedOverride.manualJudgement === 'warning'
                            ? '🔴 预警'
                            : '🟢 正常'}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-gray-200 mt-1">
                        <span className="text-gray-600">影响分析：</span>
                        <span className="text-gray-700">
                          {selectedOverride.impactDescription}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-sm">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    📝 原始数据对象
                  </h4>
                  <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                    {JSON.stringify(selectedLog.rawData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-sm p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                点击左侧报告条目查看原始日志追溯
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {fieldMappingResult && (
              <span>
                字段映射："{fieldMappingResult.mapping.deviceId}"→设备编号 | "{fieldMappingResult.mapping.resistance}"→内阻
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>所有数据均可追溯至原始传感器日志</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandoverSim;
