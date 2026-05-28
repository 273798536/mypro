import { useMemo, useState } from 'react';
import { useInterpolatorStore } from '../store/useInterpolatorStore';
import { X, Download, FileText, Table, BarChart3 } from 'lucide-react';
import { generateReportData, downloadReport, exportDataToCsv } from '../utils/export';
import { getAnomalyTypeLabel, getAnomalySeverityLabel } from '../engine/anomalyDetector';

export default function ReportModal() {
  const {
    showReportModal,
    setShowReportModal,
    config,
    calculationResult,
    history,
  } = useInterpolatorStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'history'>('overview');

  const reportData = useMemo(() => {
    if (!calculationResult) return null;
    return generateReportData(config, calculationResult.anomalies, history);
  }, [config, calculationResult, history]);

  if (!showReportModal || !reportData || !calculationResult) return null;

  const handleDownload = (format: 'md' | 'json') => {
    downloadReport(reportData, format);
  };

  const handleExportCsv = () => {
    exportDataToCsv(calculationResult.originalPoints, calculationResult.interpolatedPoints);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-primary-950 border border-primary-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-primary-800">
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-100 flex items-center gap-2">
              <FileText size={20} />
              插值分析报告
            </h2>
            <p className="text-sm text-primary-500 mt-0.5">
              生成时间: {new Date(reportData.generatedAt).toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-primary-900/50 rounded-lg p-1">
              <button
                onClick={() => handleDownload('md')}
                className="px-3 py-1.5 text-xs bg-primary-800/50 hover:bg-primary-700/50 text-primary-200 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Download size={12} />
                Markdown
              </button>
              <button
                onClick={() => handleDownload('json')}
                className="px-3 py-1.5 text-xs bg-primary-800/50 hover:bg-primary-700/50 text-primary-200 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Download size={12} />
                JSON
              </button>
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 text-xs bg-primary-800/50 hover:bg-primary-700/50 text-primary-200 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Table size={12} />
                数据CSV
              </button>
            </div>
            <button
              onClick={() => setShowReportModal(false)}
              className="p-2 text-primary-500 hover:text-primary-300 hover:bg-primary-800/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-primary-900/50 border-b border-primary-800 mx-4 mt-4 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 text-sm rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-primary-600 text-white'
                : 'text-primary-400 hover:text-primary-200 hover:bg-primary-800/50'
            }`}
          >
            <BarChart3 size={14} />
            统计概览
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2 text-sm rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'details'
                ? 'bg-primary-600 text-white'
                : 'text-primary-400 hover:text-primary-200 hover:bg-primary-800/50'
            }`}
          >
            <FileText size={14} />
            异常详情
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-sm rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-primary-600 text-white'
                : 'text-primary-400 hover:text-primary-200 hover:bg-primary-800/50'
            }`}
          >
            <Table size={14} />
            操作痕迹
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-primary-400 mb-3">插值配置</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-primary-900/50 rounded-lg">
                    <p className="text-xs text-primary-500">函数表达式</p>
                    <p className="text-sm text-primary-200 font-mono mt-1">{config.functionExpression}</p>
                  </div>
                  <div className="p-3 bg-primary-900/50 rounded-lg">
                    <p className="text-xs text-primary-500">插值阶数</p>
                    <p className="text-lg font-bold text-primary-200 mt-1">{config.order} 阶</p>
                  </div>
                  <div className="p-3 bg-primary-900/50 rounded-lg">
                    <p className="text-xs text-primary-500">插值点数</p>
                    <p className="text-lg font-bold text-primary-200 mt-1">{config.pointCount} 个</p>
                  </div>
                  <div className="p-3 bg-primary-900/50 rounded-lg">
                    <p className="text-xs text-primary-500">采样范围</p>
                    <p className="text-sm text-primary-200 font-mono mt-1">[{config.sampleStart}, {config.sampleEnd}]</p>
                  </div>
                  <div className="p-3 bg-primary-900/50 rounded-lg">
                    <p className="text-xs text-primary-500">插值方法</p>
                    <p className="text-sm text-primary-200 mt-1">
                      {config.method === 'lagrange' ? '拉格朗日插值' : '牛顿插值'}
                    </p>
                  </div>
                  <div className="p-3 bg-primary-900/50 rounded-lg">
                    <p className="text-xs text-primary-500">数据来源</p>
                    <p className="text-sm text-primary-200 mt-1 truncate">{config.source || '未记录'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-primary-400 mb-3">计算指标</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-primary-900/50 rounded-lg">
                    <p className="text-xs text-primary-500">最大误差</p>
                    <p className="text-lg font-bold text-primary-200 font-mono mt-1">
                      {calculationResult.maxError.toExponential(3)}
                    </p>
                  </div>
                  <div className="p-3 bg-primary-900/50 rounded-lg">
                    <p className="text-xs text-primary-500">平均误差</p>
                    <p className="text-lg font-bold text-primary-200 font-mono mt-1">
                      {calculationResult.avgError.toExponential(3)}
                    </p>
                  </div>
                  <div className="p-3 bg-primary-900/50 rounded-lg">
                    <p className="text-xs text-primary-500">振荡强度</p>
                    <p className="text-lg font-bold text-primary-200 mt-1">
                      {calculationResult.oscillationIntensity.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-primary-900/50 rounded-lg">
                    <p className="text-xs text-primary-500">正常点比例</p>
                    <p className="text-lg font-bold text-accent-success mt-1">
                      {reportData.statistics.totalPoints > 0
                        ? ((reportData.statistics.normalCount / reportData.statistics.totalPoints) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-primary-400 mb-3">异常分类统计</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-accent-error/10 border border-accent-error/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-accent-error">未处理</p>
                      <p className="text-2xl font-bold text-accent-error">
                        {reportData.statistics.unresolvedCount}
                      </p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-primary-400">重复点</span>
                        <span className="text-primary-200">{reportData.statistics.byType.duplicate.unresolved}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary-400">区间外推</span>
                        <span className="text-primary-200">{reportData.statistics.byType.extrapolation.unresolved}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary-400">边缘振荡</span>
                        <span className="text-primary-200">{reportData.statistics.byType.oscillation.unresolved}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-accent-success/10 border border-accent-success/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-accent-success">已修正</p>
                      <p className="text-2xl font-bold text-accent-success">
                        {reportData.statistics.resolvedCount}
                      </p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-primary-400">重复点</span>
                        <span className="text-primary-200">{reportData.statistics.byType.duplicate.resolved}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary-400">区间外推</span>
                        <span className="text-primary-200">{reportData.statistics.byType.extrapolation.resolved}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary-400">边缘振荡</span>
                        <span className="text-primary-200">{reportData.statistics.byType.oscillation.resolved}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-accent-warning/10 border border-accent-warning/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-accent-warning">需人工确认</p>
                      <p className="text-2xl font-bold text-accent-warning">
                        {reportData.statistics.needReviewCount}
                      </p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-primary-400">重复点</span>
                        <span className="text-primary-200">{reportData.statistics.byType.duplicate.needReview}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary-400">区间外推</span>
                        <span className="text-primary-200">{reportData.statistics.byType.extrapolation.needReview}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary-400">边缘振荡</span>
                        <span className="text-primary-200">{reportData.statistics.byType.oscillation.needReview}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              {reportData.anomalies.length === 0 ? (
                <div className="text-center py-12 text-primary-500">
                  <p>没有检测到异常数据</p>
                </div>
              ) : (
                reportData.anomalies.map((anomaly, index) => (
                  <div
                    key={anomaly.id}
                    className={`p-4 rounded-xl border ${
                      anomaly.resolved
                        ? 'bg-primary-900/30 border-primary-800'
                        : anomaly.severity === 'error'
                        ? 'bg-accent-error/5 border-accent-error/30'
                        : 'bg-accent-warning/5 border-accent-warning/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-primary-200">
                            {index + 1}. {getAnomalyTypeLabel(anomaly.type)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            anomaly.resolved
                              ? 'bg-accent-success/20 text-accent-success'
                              : anomaly.severity === 'error'
                              ? 'bg-accent-error/20 text-accent-error'
                              : 'bg-accent-warning/20 text-accent-warning'
                          }`}>
                            {anomaly.resolved ? '已修正' : getAnomalySeverityLabel(anomaly.severity)}
                          </span>
                        </div>
                        <p className="text-sm text-primary-300">{anomaly.message}</p>
                        <p className="text-xs text-primary-500 mt-2">
                          影响范围: {anomaly.affectedIndices.length} 个点
                        </p>
                        {anomaly.resolutionNote && (
                          <div className="mt-2 p-2 bg-primary-800/30 rounded-lg">
                            <p className="text-xs text-primary-500">修正说明:</p>
                            <p className="text-sm text-primary-300">{anomaly.resolutionNote}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-primary-600 whitespace-nowrap">
                        {new Date(anomaly.timestamp).toLocaleTimeString('zh-CN')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {reportData.history.length === 0 ? (
                <div className="text-center py-12 text-primary-500">
                  <p>暂无操作记录</p>
                </div>
              ) : (
                reportData.history.slice().reverse().map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-primary-900/30 rounded-lg border border-primary-800/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-primary-200 font-medium">{entry.action}</p>
                        {entry.userNote && (
                          <p className="text-xs text-primary-400 mt-1">{entry.userNote}</p>
                        )}
                        {Object.keys(entry.diff).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(entry.diff).map(([key, value]) => (
                              <span
                                key={key}
                                className="text-xs px-1.5 py-0.5 rounded bg-primary-800/50 text-primary-400 font-mono"
                              >
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-primary-600 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleTimeString('zh-CN')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
