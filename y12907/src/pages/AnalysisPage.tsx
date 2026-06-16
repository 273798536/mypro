import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  RefreshCw,
  Table,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Download
} from 'lucide-react';
import dayjs from 'dayjs';

import { useAppStore } from '../store/useAppStore';
import { DistributionChart } from '../components/charts/DistributionChart';
import { RuleMatchHeatmap } from '../components/charts/RuleMatchHeatmap';
import {
  Sample,
  sourceTypeLabels,
  anomalyTypeLabels,
  severityLabels,
  handlingStatusLabels
} from '../types';
import { getRuleById } from '../data/securityRules';
import { attributionAnalyzer } from '../services/attributionAnalyzer';
import { validateConsistency } from '../services/processingRecord';

// 归因分析页
export const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    samples,
    currentRecordId,
    analysisResult,
    runAnalysis,
    reproduceAnalysis,
    setSelectedSample,
    ui
  } = useAppStore();

  const [highlightSourceType, setHighlightSourceType] = useState<string | null>(null);
  const [highlightAnomalyType, setHighlightAnomalyType] = useState<string | null>(null);
  const [highlightRuleId, setHighlightRuleId] = useState<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [showConsistencyCheck, setShowConsistencyCheck] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState<{ valid: boolean; issues: string[] } | null>(null);

  // 筛选后的样本列表
  const filteredSamples = useMemo(() => {
    let result = [...samples];

    if (highlightSourceType) {
      result = result.filter(s => s.sourceType === highlightSourceType);
    }

    if (highlightAnomalyType) {
      result = result.filter(s => s.anomalies.some(a => a.type === highlightAnomalyType));
    }

    if (highlightRuleId) {
      result = result.filter(s => s.matchedRules.includes(highlightRuleId));
    }

    return result;
  }, [samples, highlightSourceType, highlightAnomalyType, highlightRuleId]);

  // 选中的样本
  const selectedSample = useMemo(() => {
    return samples.find(s => s.sampleId === selectedSampleId) || null;
  }, [samples, selectedSampleId]);

  // 文字说明
  const summaryText = useMemo(() => {
    if (!analysisResult) return '';
    return attributionAnalyzer.generateSummary(analysisResult, samples);
  }, [analysisResult, samples]);

  // 处理运行分析
  const handleRunAnalysis = async () => {
    await runAnalysis();
    checkConsistency();
  };

  // 一致性检查
  const checkConsistency = useCallback(() => {
    if (!currentRecordId) return;
    const result = validateConsistency(currentRecordId);
    setConsistencyResult(result);
    setShowConsistencyCheck(true);
  }, [currentRecordId]);

  // 复现分析
  const handleReproduce = async () => {
    if (!analysisResult) return;
    await reproduceAnalysis(analysisResult.reproducibility.runId);
  };

  // 图表点击事件
  const handleChartClick = (type: string, key: string) => {
    if (type === 'source') {
      setHighlightSourceType(key === highlightSourceType ? null : key);
      setHighlightAnomalyType(null);
    } else {
      setHighlightAnomalyType(key === highlightAnomalyType ? null : key);
      setHighlightSourceType(null);
    }
  };

  // 复制运行ID
  const copyRunId = async () => {
    if (!analysisResult) return;
    await navigator.clipboard.writeText(analysisResult.reproducibility.runId);
  };

  // 渲染样本表格行
  const renderSampleRow = (sample: Sample) => {
    const isSelected = selectedSampleId === sample.sampleId;
    const hasAnomaly = sample.anomalies.length > 0;
    const hasConflict = analysisResult?.labelConflicts.some(c => c.sampleId === sample.sampleId);

    return (
      <tr
        key={sample.sampleId}
        onClick={() => {
          setSelectedSampleId(isSelected ? null : sample.sampleId);
          setSelectedSample(isSelected ? null : sample.sampleId);
        }}
        className={`table-row-alt cursor-pointer transition-colors ${
          isSelected ? 'highlight-row' : ''
        } ${hasConflict ? 'conflict-highlight' : ''}`}
      >
        <td className="px-4 py-3 font-mono-data text-xs text-navy-900">
          {sample.sampleId}
        </td>
        <td className="px-4 py-3 text-sm max-w-xs truncate" title={sample.content}>
          {sample.content}
        </td>
        <td className="px-4 py-3">
          <span className={`badge ${
            sample.sourceType === 'old_table' ? 'bg-navy-100 text-navy-800' :
            sample.sourceType === 'supplement' ? 'bg-emerald-100 text-emerald-800' :
            sample.sourceType === 'missing_unit' ? 'bg-amber-100 text-amber-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {sourceTypeLabels[sample.sourceType]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {sample.unit || <span className="text-amber-600">（未填）</span>}
        </td>
        <td className="px-4 py-3 text-sm">
          <span className={`font-medium ${
            sample.securityLabel === '拒答' || sample.securityLabel === '高风险'
              ? 'text-coral-600'
              : sample.securityLabel === '敏感'
              ? 'text-amber-600'
              : 'text-emerald-600'
          }`}>
            {sample.securityLabel}
          </span>
        </td>
        <td className="px-4 py-3">
          {hasAnomaly ? (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-600 font-medium">
                {sample.anomalies.length}
              </span>
            </div>
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {sample.matchedRules.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {sample.matchedRules.slice(0, 2).map(ruleId => (
                <span key={ruleId} className="text-xs bg-navy-50 text-navy-600 px-1.5 py-0.5 rounded">
                  {ruleId}
                </span>
              ))}
              {sample.matchedRules.length > 2 && (
                <span className="text-xs text-gray-400">+{sample.matchedRules.length - 2}</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">无</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">
          {dayjs(sample.createdAt).format('MM-DD HH:mm')}
        </td>
      </tr>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif-cn text-2xl font-bold text-navy-900 mb-1">
            归因分析
          </h1>
          <p className="text-gray-600 text-sm">
            安全规则匹配、异常检测、标签冲突分析
          </p>
        </div>

        <div className="flex items-center gap-3">
          {analysisResult && (
            <>
              <button
                onClick={handleReproduce}
                className="btn btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                复现分析
              </button>
              <button
                onClick={() => navigate('/export')}
                className="btn btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出报告
              </button>
            </>
          )}
        </div>
      </div>

      {/* 无数据状态 */}
      {samples.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Table className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="font-serif-cn text-xl font-semibold text-gray-700 mb-2">
              暂无数据
            </h3>
            <p className="text-gray-500 mb-6">
              请先导入数据或加载样例数据
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              前往加载数据
            </button>
          </div>
        </div>
      )}

      {samples.length > 0 && (
        <>
          {/* 可复现信息栏 */}
          {analysisResult && (
            <div className="card p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm text-gray-600">运行ID:</span>
                    <code className="font-mono-data text-sm text-navy-900 bg-gray-100 px-2 py-1 rounded">
                      {analysisResult.reproducibility.runId}
                    </code>
                    <button
                      onClick={copyRunId}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="复制运行ID"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    分析时间: {dayjs(analysisResult.reproducibility.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                  </div>
                  <div className="text-sm text-gray-500">
                    随机种子: {analysisResult.reproducibility.seed}
                  </div>
                </div>
                <button
                  onClick={checkConsistency}
                  className={`btn btn-sm flex items-center gap-2 ${
                    showConsistencyCheck && consistencyResult
                      ? consistencyResult.valid
                        ? 'btn-success'
                        : 'btn-danger'
                      : 'btn-secondary'
                  }`}
                >
                  {showConsistencyCheck && consistencyResult ? (
                    consistencyResult.valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        三者对齐验证通过
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        存在不一致
                      </>
                    )
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      验证三者对齐
                    </>
                  )}
                </button>
              </div>

              {showConsistencyCheck && consistencyResult && !consistencyResult.valid && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium mb-2">发现以下问题：</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {consistencyResult.issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showConsistencyCheck && consistencyResult && consistencyResult.valid && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-700">
                    ✓ 图表、表格、文字说明数据一致，三者对齐验证通过
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 未分析状态 */}
          {!analysisResult && (
            <div className="card p-8 mb-6 text-center">
              <Play className="w-12 h-12 text-navy-400 mx-auto mb-4" />
              <h3 className="font-serif-cn text-xl font-semibold text-navy-900 mb-2">
                数据已加载，点击运行分析
              </h3>
              <p className="text-gray-600 mb-6 max-w-xl mx-auto">
                系统将执行安全规则匹配、异常检测和标签冲突分析。所有计算基于统一处理记录，
                确保分布统计和版本追踪使用同一批数据。
              </p>
              <button
                onClick={handleRunAnalysis}
                disabled={ui.isLoading}
                className="btn btn-primary btn-lg flex items-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5" />
                {ui.isLoading ? '分析中...' : '运行归因分析'}
              </button>
            </div>
          )}

          {/* 分析结果：三者对齐视图 */}
          {analysisResult && (
            <div className="flex-1 flex flex-col gap-6">
              {/* 上半区：双图表 */}
              <div className="grid grid-cols-2 gap-6">
                {/* 分布图 */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif-cn text-lg font-semibold text-navy-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-navy-600" />
                      分布统计
                    </h3>
                    {(highlightSourceType || highlightAnomalyType) && (
                      <button
                        onClick={() => {
                          setHighlightSourceType(null);
                          setHighlightAnomalyType(null);
                        }}
                        className="text-xs text-amber-600 hover:text-amber-700"
                      >
                        清除筛选
                      </button>
                    )}
                  </div>
                  <DistributionChart
                    analysisResult={analysisResult}
                    onDataPointClick={handleChartClick}
                    highlightKey={highlightSourceType || highlightAnomalyType}
                  />
                </div>

                {/* 规则匹配热力图 */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif-cn text-lg font-semibold text-navy-900 flex items-center gap-2">
                      <Table className="w-5 h-5 text-navy-600" />
                      安全规则匹配
                    </h3>
                    {highlightRuleId && (
                      <button
                        onClick={() => setHighlightRuleId(null)}
                        className="text-xs text-amber-600 hover:text-amber-700"
                      >
                        清除筛选
                      </button>
                    )}
                  </div>
                  <RuleMatchHeatmap
                    analysisResult={analysisResult}
                    onRuleClick={(ruleId) => setHighlightRuleId(ruleId === highlightRuleId ? null : ruleId)}
                    highlightRuleId={highlightRuleId}
                  />
                </div>
              </div>

              {/* 下半区：数据表格 + 右侧文字说明 */}
              <div className="flex-1 flex gap-6 min-h-0">
                {/* 数据表格 */}
                <div className="flex-1 card flex flex-col min-h-0">
                  <div className="card-header flex items-center justify-between">
                    <h3 className="font-serif-cn text-lg font-semibold text-navy-900">
                      样本明细
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({filteredSamples.length} 条
                        {(highlightSourceType || highlightAnomalyType || highlightRuleId) && ' 已筛选'}
                        )
                      </span>
                    </h3>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            样本ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            内容
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            来源类型
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            单位
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            安全标签
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            异常
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            匹配规则
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            创建时间
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredSamples.slice(0, 50).map(renderSampleRow)}
                      </tbody>
                    </table>
                    {filteredSamples.length > 50 && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        仅显示前 50 条，共 {filteredSamples.length} 条
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧面板 */}
                <div className="w-96 flex flex-col gap-4">
                  {/* 文字说明 */}
                  <div className="card p-4 paper-sheet">
                    <h4 className="font-serif-cn text-sm font-semibold text-navy-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      分析摘要
                    </h4>
                    <div className="text-xs leading-relaxed whitespace-pre-wrap font-mono-data text-gray-700">
                      {summaryText}
                    </div>
                  </div>

                  {/* 选中样本详情 */}
                  {selectedSample && (
                    <div className="card p-4 flex-1 overflow-auto">
                      <h4 className="font-serif-cn text-sm font-semibold text-navy-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        样本详情
                        <span className="ml-auto text-xs font-normal text-gray-500 font-mono-data">
                          {selectedSample.sampleId}
                        </span>
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">样本内容</label>
                          <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded">
                            {selectedSample.content}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">来源类型</label>
                            <span className={`badge ${
                              selectedSample.sourceType === 'old_table' ? 'bg-navy-100 text-navy-800' :
                              selectedSample.sourceType === 'supplement' ? 'bg-emerald-100 text-emerald-800' :
                              selectedSample.sourceType === 'missing_unit' ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {sourceTypeLabels[selectedSample.sourceType]}
                            </span>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">单位</label>
                            <p className="text-gray-800">
                              {selectedSample.unit || <span className="text-amber-600">未填写</span>}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">标注标签</label>
                            <p className="text-gray-800">{selectedSample.annotationLabel}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">安全标签</label>
                            <p className={`font-medium ${
                              selectedSample.securityLabel === '拒答' ? 'text-coral-600' :
                              selectedSample.securityLabel === '敏感' ? 'text-amber-600' :
                              'text-emerald-600'
                            }`}>
                              {selectedSample.securityLabel}
                            </p>
                          </div>
                        </div>

                        {selectedSample.sourceRemark && (
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">备注</label>
                            <p className="text-sm text-gray-700 bg-amber-50 p-2 rounded border border-amber-100">
                              {selectedSample.sourceRemark}
                            </p>
                          </div>
                        )}

                        {/* 异常列表 */}
                        {selectedSample.anomalies.length > 0 && (
                          <div>
                            <label className="text-xs text-gray-500 block mb-2">异常信息</label>
                            <div className="space-y-2">
                              {selectedSample.anomalies.map((anomaly) => {
                                const rule = anomaly.relatedRuleId ? getRuleById(anomaly.relatedRuleId) : null;
                                return (
                                  <div
                                    key={anomaly.anomalyId}
                                    className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className={`badge ${
                                        anomaly.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                        anomaly.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                        anomaly.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {anomalyTypeLabels[anomaly.type]} · {severityLabels[anomaly.severity]}
                                      </span>
                                      <span className={`text-xs ${
                                        anomaly.handlingStatus === 'resolved' ? 'text-emerald-600' :
                                        anomaly.handlingStatus === 'pending' ? 'text-amber-600' :
                                        'text-gray-500'
                                      }`}>
                                        {handlingStatusLabels[anomaly.handlingStatus]}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-700 whitespace-pre-wrap">
                                      {anomaly.naturalDescription}
                                    </p>
                                    {rule && (
                                      <div className="mt-2 pt-2 border-t border-amber-200">
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">关联规则：</span>
                                          {rule.ruleId} - {rule.ruleName}
                                        </p>
                                        {anomaly.handlingOpinion && (
                                          <p className="text-xs text-gray-600 mt-1">
                                            <span className="font-medium">处理建议：</span>
                                            {anomaly.handlingOpinion}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    <button
                                      onClick={() => navigate(`/anomaly/${anomaly.anomalyId}`)}
                                      className="mt-2 w-full text-xs text-navy-600 hover:text-navy-800 flex items-center justify-center gap-1"
                                    >
                                      追溯异常原因
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 匹配规则 */}
                        {selectedSample.matchedRules.length > 0 && (
                          <div>
                            <label className="text-xs text-gray-500 block mb-2">匹配的安全规则</label>
                            <div className="space-y-2">
                              {selectedSample.matchedRules.map(ruleId => {
                                const rule = getRuleById(ruleId);
                                return rule ? (
                                  <div key={ruleId} className="p-2 bg-navy-50 rounded text-sm">
                                    <p className="font-medium text-navy-900">
                                      {rule.ruleId} - {rule.ruleName}
                                    </p>
                                    <p className="text-xs text-gray-600">{rule.ruleDescription}</p>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 未选中样本时显示操作提示 */}
                  {!selectedSample && (
                    <div className="card p-6 text-center text-gray-500">
                      <Table className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">点击表格中的样本行查看详情</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
