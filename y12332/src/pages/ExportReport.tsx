import { useState, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileDown,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Database,
  BarChart3,
  Clock,
  Calendar,
  Download,
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Layers,
  Play,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { ReportOptions } from '@/types';
import {
  formatDateTime,
  formatDate,
  getAnomalyTypeLabel,
  getSeverityLabel,
  getSeverityColor,
  getDiagnosisTypeLabel,
} from '@/utils/helpers';

const ExportReport = () => {
  const {
    batches,
    currentBatchId,
    anomalies,
    diagnoses,
    currentReport,
    generateReport,
    downloadReport,
    loadMockData,
    isLoading,
    compareConfig,
    playbackConfig,
    selectedTimeRange,
  } = useAppStore();

  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    includeRawData: false,
    includeProcessedData: true,
    includeAnomalyDetails: true,
    includeDiagnosis: true,
    includeCharts: true,
    includeCompareAnalysis: true,
    includePlaybackConfig: true,
    timeRange: selectedTimeRange || undefined,
    compareConfig: compareConfig,
    playbackConfig: playbackConfig || undefined,
  });

  const toggleOption = (key: string, value: boolean) => {
    setReportOptions((prev) => {
      const updated = { ...prev, [key]: value };
      return {
        ...updated,
        compareConfig: updated.includeCompareAnalysis ? compareConfig : undefined,
        playbackConfig: updated.includePlaybackConfig ? playbackConfig || undefined : undefined,
      };
    });
  };

  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'anomalies' | 'diagnosis'>('summary');

  const currentBatch = batches.find((b) => b.batchId === currentBatchId);

  const handleGenerateReport = () => {
    const finalOptions: ReportOptions = {
      ...reportOptions,
      timeRange: selectedTimeRange || undefined,
      compareConfig: reportOptions.includeCompareAnalysis ? compareConfig : undefined,
      playbackConfig: reportOptions.includePlaybackConfig ? playbackConfig || undefined : undefined,
    };
    generateReport(finalOptions);
    setShowPreview(true);
  };

  const handleDownload = (format: 'pdf' | 'excel') => {
    downloadReport(format);
  };

  const stats = useMemo(() => {
    if (!currentReport) return null;
    return currentReport.summary;
  }, [currentReport]);

  const anomalyStats = useMemo(() => {
    if (!currentReport) return null;
    const critical = currentReport.anomalies.filter((a) => a.severity === 'critical').length;
    const high = currentReport.anomalies.filter((a) => a.severity === 'high').length;
    const medium = currentReport.anomalies.filter((a) => a.severity === 'medium').length;
    const low = currentReport.anomalies.filter((a) => a.severity === 'low').length;
    return { critical, high, medium, low };
  }, [currentReport]);

  const OptionToggle = ({
    label,
    description,
    checked,
    onChange,
    icon: Icon,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    icon: React.ElementType;
  }) => (
    <label className="flex items-start gap-4 p-4 rounded-lg bg-dark-800/30 border border-dark-700/50 hover:border-dark-600 cursor-pointer transition-all">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-5 h-5 rounded border-dark-600 bg-dark-800 text-cold-500 focus:ring-cold-500 focus:ring-offset-0"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-cold-400" />
          <span className="font-medium text-white">{label}</span>
        </div>
        <p className="text-sm text-dark-400 mt-1">{description}</p>
      </div>
    </label>
  );

  const renderPreviewSummary = () => {
    if (!currentReport || !stats) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-cold-500/10 to-transparent border border-cold-500/20">
            <div className="text-xs text-dark-400 mb-1">总采样点</div>
            <div className="text-2xl font-mono font-bold text-white">{stats.totalReadings}</div>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-alert-orange/10 to-transparent border border-alert-orange/20">
            <div className="text-xs text-dark-400 mb-1">异常总数</div>
            <div className="text-2xl font-mono font-bold text-alert-orange">{stats.totalAnomalies}</div>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-alert-red/10 to-transparent border border-alert-red/20">
            <div className="text-xs text-dark-400 mb-1">严重异常</div>
            <div className="text-2xl font-mono font-bold text-alert-red">{stats.criticalAnomalies}</div>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
            <div className="text-xs text-dark-400 mb-1">数据完整率</div>
            <div className="text-2xl font-mono font-bold text-green-400">{stats.dataCompleteness.toFixed(1)}%</div>
          </div>
        </div>

        {anomalyStats && (
          <div className="p-6 rounded-lg bg-dark-800/30 border border-dark-700/50">
            <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cold-400" />
              异常严重程度分布
            </h4>
            <div className="space-y-3">
              {[
                { level: 'critical', label: '严重', count: anomalyStats.critical, color: 'bg-alert-red' },
                { level: 'high', label: '高危', count: anomalyStats.high, color: 'bg-alert-orange' },
                { level: 'medium', label: '中等', count: anomalyStats.medium, color: 'bg-alert-yellow' },
                { level: 'low', label: '轻微', count: anomalyStats.low, color: 'bg-dark-500' },
              ].map((item) => (
                <div key={item.level}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-dark-300">{item.label}</span>
                    <span className="text-sm font-mono text-white">{item.count}</span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{
                        width: stats.totalAnomalies > 0
                          ? `${(item.count / stats.totalAnomalies) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-dark-800/30 border border-dark-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-alert-orange" />
              <span className="text-sm text-dark-400">传感器故障</span>
            </div>
            <div className="text-xl font-mono font-bold text-white">{stats.sensorFaultCount}</div>
          </div>
          <div className="p-4 rounded-lg bg-dark-800/30 border border-dark-700/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-alert-red" />
              <span className="text-sm text-dark-400">货物异常</span>
            </div>
            <div className="text-xl font-mono font-bold text-white">{stats.cargoAnomalyCount}</div>
          </div>
          <div className="p-4 rounded-lg bg-dark-800/30 border border-dark-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-alert-yellow" />
              <span className="text-sm text-dark-400">数据质量问题</span>
            </div>
            <div className="text-xl font-mono font-bold text-white">{stats.dataQualityIssues}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewAnomalies = () => {
    if (!currentReport) return null;

    return (
      <div className="space-y-3">
        {currentReport.anomalies.length === 0 ? (
          <div className="text-center py-12 text-dark-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无异常记录</p>
          </div>
        ) : (
          currentReport.anomalies
            .sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime())
            .slice(0, 20)
            .map((anomaly) => {
              const diagnosis = currentReport.diagnoses.find((d) => d.anomalyId === anomaly.id);
              return (
                <div
                  key={anomaly.id}
                  className="p-4 rounded-lg bg-dark-800/30 border border-dark-700/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            anomaly.severity === 'critical'
                              ? 'bg-alert-red animate-pulse'
                              : anomaly.severity === 'high'
                              ? 'bg-alert-orange'
                              : anomaly.severity === 'medium'
                              ? 'bg-alert-yellow'
                              : 'bg-dark-500'
                          }`}
                        />
                        <span className="font-mono text-sm text-white">{anomaly.sensorId}</span>
                        <span className={`badge ${getSeverityColor(anomaly.severity)}`}>
                          {getSeverityLabel(anomaly.severity)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-300">
                          {getAnomalyTypeLabel(anomaly.anomalyType)}
                        </span>
                      </div>
                      <div className="text-xs text-dark-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(anomaly.eventTime)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-lg text-alert-orange">
                        {anomaly.temperature.toFixed(1)}°C
                      </div>
                      <div className="text-xs text-dark-500">
                        偏离 {anomaly.deviation.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  {diagnosis && (
                    <div className="mt-3 pt-3 border-t border-dark-700/50">
                      <div className="text-xs text-dark-400 mb-1">诊断结果</div>
                      <div className="text-sm text-cold-400">
                        {getDiagnosisTypeLabel(diagnosis.diagnosisType)}
                      </div>
                      <div className="text-xs text-dark-500 mt-1">{diagnosis.description}</div>
                    </div>
                  )}
                </div>
              );
            })
        )}
        {currentReport.anomalies.length > 20 && (
          <div className="text-center py-4 text-dark-400 text-sm">
            ... 还有 {currentReport.anomalies.length - 20} 条记录，请下载完整报告查看
          </div>
        )}
      </div>
    );
  };

  const renderPreviewDiagnosis = () => {
    if (!currentReport) return null;

    return (
      <div className="space-y-3">
        {currentReport.diagnoses.length === 0 ? (
          <div className="text-center py-12 text-dark-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无诊断记录</p>
          </div>
        ) : (
          currentReport.diagnoses
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 15)
            .map((diagnosis) => (
              <div
                key={diagnosis.id}
                className="p-4 rounded-lg bg-dark-800/30 border border-dark-700/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-cold-400">
                      {getDiagnosisTypeLabel(diagnosis.diagnosisType)}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-green-400">
                    置信度 {(diagnosis.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm text-dark-300 mb-3">{diagnosis.description}</p>
                <div className="space-y-2">
                  <div className="text-xs text-dark-400 mb-1">证据链：</div>
                  {diagnosis.evidenceChain.map((evidence, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs text-dark-400 pl-3 border-l-2 border-dark-600"
                    >
                      <span className="text-cold-400">•</span>
                      <span>{evidence.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-cold-400" />
            报告导出
          </h2>
          <p className="text-sm text-dark-400 mt-1">
            生成并导出温度异常检测报告，支持 PDF 和 Excel 格式
          </p>
        </div>
        {!currentBatch && (
          <button
            onClick={loadMockData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cold-500 hover:bg-cold-600 text-white transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            加载示例数据
          </button>
        )}
      </div>

      {!currentBatch ? (
        <div className="card p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-dark-600" />
          <h3 className="text-lg font-medium text-white mb-2">暂无数据批次</h3>
          <p className="text-dark-400 mb-6">请先导入数据或加载示例数据以生成报告</p>
          <button
            onClick={loadMockData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cold-500 to-cold-600 text-white font-medium hover:shadow-lg hover:shadow-cold-500/30 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Database className="w-5 h-5" />
            )}
            加载示例数据
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-cold-400" />
                报告配置
              </h3>

              <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-cold-500/10 to-transparent border border-cold-500/20">
                <div className="text-[10px] text-cold-400 uppercase tracking-wider mb-1">
                  当前数据批次
                </div>
                <div className="font-mono text-sm text-white">{currentBatch.name}</div>
                <div className="text-[11px] text-dark-400 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(currentBatch.importedAt)}
                </div>
                <div className="text-[11px] text-dark-500 mt-1">
                  完整率: {currentBatch.completeness.toFixed(2)}%
                </div>
              </div>

              <div className="space-y-3">
                <OptionToggle
                  label="包含原始数据"
                  description="导出完整的原始温度采样数据"
                  checked={reportOptions.includeRawData}
                  onChange={(v) => toggleOption('includeRawData', v)}
                  icon={Database}
                />
                <OptionToggle
                  label="包含处理后数据"
                  description="导出经过清洗和修正后的温度数据"
                  checked={reportOptions.includeProcessedData}
                  onChange={(v) => toggleOption('includeProcessedData', v)}
                  icon={BarChart3}
                />
                <OptionToggle
                  label="包含异常明细"
                  description="导出所有检测到的异常事件详细信息"
                  checked={reportOptions.includeAnomalyDetails}
                  onChange={(v) => toggleOption('includeAnomalyDetails', v)}
                  icon={AlertTriangle}
                />
                <OptionToggle
                  label="包含诊断结果"
                  description="导出异常根因诊断结果和证据链"
                  checked={reportOptions.includeDiagnosis}
                  onChange={(v) => toggleOption('includeDiagnosis', v)}
                  icon={CheckCircle2}
                />
              </div>

              <div className="mt-6 pt-4 border-t border-dark-700/50">
                <h4 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cold-400" />
                  高级导出选项
                </h4>
                <div className="space-y-3">
                  <OptionToggle
                    label="包含分组对比口径"
                    description="导出分组对比配置和统计结果，确保报告口径清晰可追溯"
                    checked={reportOptions.includeCompareAnalysis}
                    onChange={(v) => toggleOption('includeCompareAnalysis', v)}
                    icon={Layers}
                  />
                  <OptionToggle
                    label="包含图表回放配置"
                    description="导出图表回放的时间范围、播放速度和选择的传感器"
                    checked={reportOptions.includePlaybackConfig}
                    onChange={(v) => toggleOption('includePlaybackConfig', v)}
                    icon={Play}
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="w-full mt-6 py-3 rounded-lg bg-gradient-to-r from-cold-500 to-cold-600 text-white font-medium hover:shadow-lg hover:shadow-cold-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
                生成报告预览
              </button>
            </div>

            {currentReport && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5 text-cold-400" />
                  下载报告
                </h3>
                <p className="text-sm text-dark-400 mb-4">
                  报告已生成，可选择格式下载
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-alert-red/20 to-alert-orange/20 border border-alert-red/30 text-white font-medium hover:shadow-lg hover:shadow-alert-red/20 transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5 text-alert-red" />
                    下载 PDF 报告
                  </button>
                  <button
                    onClick={() => handleDownload('excel')}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-white font-medium hover:shadow-lg hover:shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-green-400" />
                    下载 Excel 报告
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-dark-700/50">
                  <div className="text-xs text-dark-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    生成时间: {formatDateTime(currentReport.generatedAt)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="card p-6 min-h-[600px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cold-400" />
                  报告预览
                </h3>
                {showPreview && currentReport && (
                  <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
                    {[
                      { key: 'summary', label: '摘要' },
                      { key: 'anomalies', label: '异常明细' },
                      { key: 'diagnosis', label: '诊断结果' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as typeof activeTab)}
                        className={`px-4 py-1.5 rounded-md text-sm transition-all ${
                          activeTab === tab.key
                            ? 'bg-cold-500 text-white'
                            : 'text-dark-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!showPreview || !currentReport ? (
                <div className="flex flex-col items-center justify-center h-[500px] text-dark-500">
                  <FileDown className="w-20 h-20 mb-4 opacity-20" />
                  <p className="text-lg">配置报告选项后点击"生成报告预览"</p>
                  <p className="text-sm mt-2">预览内容将在此处显示</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2">
                  {activeTab === 'summary' && renderPreviewSummary()}
                  {activeTab === 'anomalies' && renderPreviewAnomalies()}
                  {activeTab === 'diagnosis' && renderPreviewDiagnosis()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportReport;
