import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronRight,
  Printer,
  Share2,
  TrendingUp,
  Info,
  Package,
  Settings,
} from 'lucide-react';
import { useAppStore, selectCurrentBatch, selectAnomalies, selectReviewHistory, selectActions } from '../../store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import BoxPlotChart from '../../components/charts/BoxPlotChart';
import ContaminationHeatmap from '../../components/charts/ContaminationHeatmap';
import {
  ANOMALY_TYPE_LABELS,
  ANOMALY_ACTION_LABELS,
  ANOMALY_SEVERITY_LABELS,
  CONTAMINATION_TYPE_LABELS,
} from '../../types';

export default function Report() {
  const batch = useAppStore(selectCurrentBatch);
  const anomalies = useAppStore(selectAnomalies);
  const reviewHistory = useAppStore(selectReviewHistory);
  const { selectSample } = useAppStore(selectActions);

  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'json'>('pdf');

  const summary = useMemo(() => {
    const totalSamples = batch.samples.length;
    const passedSamples = batch.samples.filter(s => s.qcStatus === 'pass').length;
    const contaminatedSamples = batch.samples.filter(
      s => s.contamination.probability > 80 && s.contamination.reviewed
    ).length;
    const pendingReview = batch.samples.filter(s => !s.contamination.reviewed && s.contamination.probability > 50).length;
    const resolvedAnomalies = anomalies.filter(a => a.resolved).length;
    const pendingAnomalies = anomalies.filter(a => !a.resolved).length;
    const totalMutations = batch.samples.reduce((sum, s) => sum + s.mutations.length, 0);
    const highImpactMutations = batch.samples.reduce(
      (sum, s) => sum + s.mutations.filter(m => m.functionalImpact === 'high').length,
      0
    );

    return {
      totalSamples,
      passedSamples,
      contaminatedSamples,
      pendingReview,
      resolvedAnomalies,
      pendingAnomalies,
      totalMutations,
      highImpactMutations,
      passRate: ((passedSamples / totalSamples) * 100).toFixed(1),
      contaminationRate: ((contaminatedSamples / totalSamples) * 100).toFixed(1),
    };
  }, [batch.samples, anomalies]);

  const handleExport = async () => {
    setIsExporting(true);
    
    setTimeout(() => {
      const reportData = {
        batchId: batch.id,
        generatedAt: new Date().toISOString(),
        summary,
        batchEffect: batch.batchEffect,
        samples: batch.samples.map(s => ({
          id: s.id,
          name: s.name,
          generation: s.generation,
          pathologyNote: s.pathologyNote,
          qcStatus: s.qcStatus,
          qcMetrics: s.qcMetrics,
          contamination: s.contamination,
          mutations: s.mutations.map(m => ({
            id: m.id,
            gene: m.gene,
            mutationType: m.mutationType,
            functionalImpact: m.functionalImpact,
            aminoAcidChange: m.aminoAcidChange,
            siftScore: m.siftScore,
            polyphenScore: m.polyphenScore,
          })),
        })),
        anomalies: anomalies.map(a => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          description: a.description,
          suggestedAction: a.suggestedAction,
          resolved: a.resolved,
          resolutionNote: a.resolutionNote,
          resolvedAt: a.resolvedAt,
        })),
        reviewHistory: reviewHistory.map(r => ({
          id: r.id,
          type: r.type,
          action: r.action,
          comment: r.comment,
          reviewer: r.reviewer,
          timestamp: r.timestamp,
        })),
      };

      if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${batch.id}_质控报告_${new Date().toLocaleDateString('zh-CN')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const text = `
# 蛋白质结构突变标注 - 质控报告
=====================================

## 基本信息
- 批次号: ${batch.id}
- 生成时间: ${new Date().toLocaleString('zh-CN')}
- 样本数量: ${summary.totalSamples}
- 通过率: ${summary.passRate}%

## 摘要统计
- ✅ 通过质控: ${summary.passedSamples} 个样本
- ❌ 污染剔除: ${summary.contaminatedSamples} 个样本
- ⏳ 待复核: ${summary.pendingReview} 个样本
- 🧬 总突变数: ${summary.totalMutations} 个
- ⚠️ 高影响突变: ${summary.highImpactMutations} 个
- 🔧 异常处理: ${summary.resolvedAnomalies}/${anomalies.length} 已解决

## 批次效应拦截说明
GC含量偏差: +${batch.batchEffect.gcDeviation}%
阈值: ${batch.batchEffect.gcThreshold}%
P值: ${batch.batchEffect.pValue}
状态: ${batch.batchEffect.blocked ? '已拦截' : '已放行'}

${batch.batchEffect.explanation}

## 异常处理列表
${anomalies.map(a => `
### ${ANOMALY_TYPE_LABELS[a.type]} (${ANOMALY_SEVERITY_LABELS[a.severity]})
- 状态: ${a.resolved ? '已处理' : '待处理'}
- 建议: ${ANOMALY_ACTION_LABELS[a.suggestedAction]}
- 描述: ${a.description}
${a.resolutionNote ? `- 处理结果: ${a.resolutionNote}` : ''}
`).join('')}

## 复核记录
${reviewHistory.map(r => `
- [${r.timestamp.toLocaleString('zh-CN')}] ${r.reviewer}: ${r.action} - ${r.comment}
`).join('')}

=====================================
报告由蛋白质结构突变标注系统自动生成
        `.trim();

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${batch.id}_质控报告_${new Date().toLocaleDateString('zh-CN')}.${exportFormat === 'pdf' ? 'txt' : 'csv'}`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setIsExporting(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Space_Grotesk'] flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            质控报告
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            批次 {batch.id} 完整分析报告，包含所有质控指标、异常处理和复核记录
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-[2px] p-1">
            {(['pdf', 'excel', 'json'] as const).map((format) => (
              <button
                key={format}
                onClick={() => setExportFormat(format)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-all flex items-center gap-1.5 ${
                  exportFormat === format
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {format === 'pdf' && <FileText className="w-3.5 h-3.5" />}
                {format === 'excel' && <FileSpreadsheet className="w-3.5 h-3.5" />}
                {format === 'json' && <FileJson className="w-3.5 h-3.5" />}
                {format.toUpperCase()}
              </button>
            ))}
          </div>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? '生成中...' : '导出报告'}
          </Button>
          <Button variant="ghost" size="md">
            <Printer className="w-4 h-4 mr-2" />
            打印
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-6 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-[2px] flex items-center justify-center mb-2">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 mb-1">样本总数</p>
              <p className="text-2xl font-bold text-gray-900 font-mono">{summary.totalSamples}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-[2px] flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-xs text-gray-500 mb-1">通过质控</p>
              <p className="text-2xl font-bold text-emerald-600 font-mono">{summary.passedSamples}</p>
              <p className="text-[10px] text-gray-500">{summary.passRate}%</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-red-100 rounded-[2px] flex items-center justify-center mb-2">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-xs text-gray-500 mb-1">污染剔除</p>
              <p className="text-2xl font-bold text-red-600 font-mono">{summary.contaminatedSamples}</p>
              <p className="text-[10px] text-gray-500">{summary.contaminationRate}%</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-yellow-100 rounded-[2px] flex items-center justify-center mb-2">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-xs text-gray-500 mb-1">待复核</p>
              <p className="text-2xl font-bold text-yellow-600 font-mono">{summary.pendingReview}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-[2px] flex items-center justify-center mb-2">
                <AlertTriangle className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-xs text-gray-500 mb-1">总突变</p>
              <p className="text-2xl font-bold text-purple-600 font-mono">{summary.totalMutations}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-orange-100 rounded-[2px] flex items-center justify-center mb-2">
                <Info className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-xs text-gray-500 mb-1">高影响</p>
              <p className="text-2xl font-bold text-orange-600 font-mono">{summary.highImpactMutations}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {batch.batchEffect.blocked && (
        <Card className="border-red-200">
          <CardHeader className="pb-2 bg-red-50 border-b border-red-200">
            <CardTitle className="text-base text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              批次效应拦截说明（质控组必读）
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4 space-y-3">
                <div className="bg-white border border-gray-200 rounded-[2px] p-3">
                  <p className="text-xs text-gray-500 mb-1">GC含量偏差</p>
                  <p className="text-2xl font-bold font-mono text-red-600">+{batch.batchEffect.gcDeviation}%</p>
                  <p className="text-xs text-gray-400">阈值: {batch.batchEffect.gcThreshold}%</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-[2px] p-3">
                  <p className="text-xs text-gray-500 mb-1">统计检验</p>
                  <p className="text-xl font-bold font-mono text-gray-900">P = {batch.batchEffect.pValue}</p>
                  <p className="text-xs text-gray-400">单样本T检验</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-[2px] p-3">
                  <p className="text-xs text-gray-500 mb-1">风险等级</p>
                  <p className="text-xl font-bold text-yellow-600">中风险</p>
                  <p className="text-xs text-gray-400">需排查后放行</p>
                </div>
              </div>
              <div className="col-span-8">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  历史批次GC含量对比
                </h4>
                <BoxPlotChart
                  data={batch.batchEffect.historicalData}
                  threshold={batch.batchEffect.gcThreshold}
                  currentBatch={batch.id}
                />
                <div className="mt-3 p-3 bg-red-50 rounded-[2px] border border-red-200">
                  <p className="text-sm text-red-800 leading-relaxed">
                    <strong>拦截原因：</strong>{batch.batchEffect.explanation}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="warning">
                      <Settings className="w-3 h-3 mr-1" />
                      需改口径
                    </Badge>
                    <span className="text-xs text-gray-600">
                      建议联系测序技术组排查PCR扩增条件，优化GC偏向性。
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">样本清单</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">样本ID</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">世代</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">病理备注</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">GC%</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Q30%</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">深度</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">污染概率</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">突变数</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {batch.samples.map((sample) => (
                    <tr
                      key={sample.id}
                      onClick={() => selectSample(sample.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-gray-900">{sample.name}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{sample.generation}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                        {sample.pathologyNote}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-sm">
                        <span className={Math.abs(sample.qcMetrics.gcContent - 45) > 3 ? 'text-red-600' : 'text-gray-900'}>
                          {sample.qcMetrics.gcContent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-sm">
                        <span className={sample.qcMetrics.q30 < 90 ? 'text-red-600' : 'text-emerald-600'}>
                          {sample.qcMetrics.q30.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-sm">
                        <span className={sample.qcMetrics.depth < 30 ? 'text-red-600' : 'text-gray-900'}>
                          {sample.qcMetrics.depth.toFixed(0)}×
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono text-sm font-medium ${
                          sample.contamination.probability > 80 ? 'text-red-600' :
                          sample.contamination.probability > 50 ? 'text-yellow-600' : 'text-emerald-600'
                        }`}>
                          {sample.contamination.probability.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-sm">
                        <span className={sample.mutations.some(m => m.functionalImpact === 'high') ? 'text-orange-600 font-medium' : 'text-gray-900'}>
                          {sample.mutations.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            sample.contamination.probability > 80 && sample.contamination.reviewed
                              ? 'danger'
                              : sample.qcStatus === 'pass'
                              ? 'success'
                              : sample.contamination.reviewed
                              ? 'success'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {sample.contamination.probability > 80 && sample.contamination.reviewed
                            ? '已剔除'
                            : sample.qcStatus === 'pass'
                            ? '通过'
                            : sample.contamination.reviewed
                            ? '通过'
                            : '待复核'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">异常汇总</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {anomalies.map((anomaly) => (
                  <div key={anomaly.id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div className={`
                          w-7 h-7 rounded-[2px] flex items-center justify-center flex-shrink-0 mt-0.5
                          ${anomaly.suggestedAction === 'need-materials' ? 'bg-orange-100 text-orange-600' :
                            anomaly.suggestedAction === 'need-recalibration' ? 'bg-purple-100 text-purple-600' :
                            'bg-gray-100 text-gray-600'}
                        `}>
                          {anomaly.suggestedAction === 'need-materials' ? (
                            <Package className="w-3.5 h-3.5" />
                          ) : anomaly.suggestedAction === 'need-recalibration' ? (
                            <Settings className="w-3.5 h-3.5" />
                          ) : (
                            <Info className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-900">
                              {ANOMALY_TYPE_LABELS[anomaly.type]}
                            </span>
                            {anomaly.resolved && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {anomaly.description}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge
                              variant={
                                anomaly.suggestedAction === 'need-materials' ? 'warning' :
                                anomaly.suggestedAction === 'need-recalibration' ? 'secondary' : 'default'
                              }
                              size="sm"
                            >
                              {ANOMALY_ACTION_LABELS[anomaly.suggestedAction]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">复核记录</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {reviewHistory.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">暂无复核记录</p>
                  </div>
                ) : (
                  reviewHistory.slice(0, 8).map((record) => (
                    <div key={record.id} className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{record.reviewer}</span>
                            <span className="text-gray-500"> · {record.action}</span>
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{record.comment}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {record.timestamp.toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">污染检测热图（全批次）</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ContaminationHeatmap
            samples={batch.samples}
            selectedSampleId={null}
            onSampleSelect={selectSample}
            showLabels
          />
        </CardContent>
      </Card>
    </div>
  );
}
