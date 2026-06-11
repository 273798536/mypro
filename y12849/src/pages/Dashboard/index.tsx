import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Dna,
  FlaskConical,
  GitBranch,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useAppStore, selectCurrentBatch, selectAnomalies, selectActions } from '../../store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import BoxPlotChart from '../../components/charts/BoxPlotChart';
import { useNavigate } from 'react-router-dom';
import { ANOMALY_CATEGORY_LABELS, ANOMALY_TYPE_LABELS } from '../../types';

const riskLevelColors = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const riskLevelLabels = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const batch = useAppStore(selectCurrentBatch);
  const anomalies = useAppStore(selectAnomalies);
  const { selectSample } = useAppStore(selectActions);
  const [showBatchEffectDetail, setShowBatchEffectDetail] = useState(true);

  const qcMetrics = [
    { label: 'GC含量', value: `${batch.batchEffect.historicalData[3].gcContent.toFixed(1)}%`, status: batch.batchEffect.blocked ? 'error' : 'normal', deviation: `+${batch.batchEffect.gcDeviation}%` },
    { label: 'Q30', value: `${(batch.samples.reduce((acc, s) => acc + s.qcMetrics.q30, 0) / batch.samples.length).toFixed(1)}%`, status: 'normal' },
    { label: '平均深度', value: `${Math.round(batch.samples.reduce((acc, s) => acc + s.qcMetrics.depth, 0) / batch.samples.length)}×`, status: 'normal' },
    { label: '比对率', value: `${(batch.samples.reduce((acc, s) => acc + s.qcMetrics.mappingRate, 0) / batch.samples.length).toFixed(1)}%`, status: 'normal' },
  ];

  const quickActions = [
    { icon: Dna, label: '蛋白质结构标注', path: '/structure', count: batch.samples.filter(s => s.mutations.length > 0).length, desc: '个待标注突变' },
    { icon: FlaskConical, label: '污染样本复核', path: '/contamination', count: batch.samples.filter(s => s.contamination.probability > 80).length, desc: '个可疑样本' },
    { icon: GitBranch, label: '谱系追踪', path: '/lineage', count: batch.samples.filter(s => s.lineageInfo.needsReview).length, desc: '个节点待复核' },
  ];

  const anomalyCategories = ['need-materials', 'need-recalibration', 'pending'] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Space_Grotesk']">测序结果总览</h1>
          <p className="text-sm text-gray-500 mt-1">{batch.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="blue" size="md">
            {batch.samples.length} 个样本
          </Badge>
          <Button onClick={() => navigate('/report')}>
            查看质控报告
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {batch.batchEffect.blocked && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-[2px] overflow-hidden"
        >
          <div
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => setShowBatchEffectDetail(!showBatchEffectDetail)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-[2px] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-red-800">批次效应已拦截</h3>
                  <Badge variant={riskLevelColors[batch.batchEffect.riskLevel] as any}>
                    {riskLevelLabels[batch.batchEffect.riskLevel]}
                  </Badge>
                </div>
                <p className="text-sm text-red-600">
                  GC含量偏差 <span className="font-mono font-bold">+{batch.batchEffect.gcDeviation}%</span>，
                  超过阈值 {batch.batchEffect.gcThreshold}%，P值 {batch.batchEffect.pValue}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/contamination'); }}>
                查看详情
              </Button>
              {showBatchEffectDetail ? (
                <ChevronUp className="w-5 h-5 text-red-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-red-400" />
              )}
            </div>
          </div>

          <AnimatePresence>
            {showBatchEffectDetail && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-red-200"
              >
                <div className="p-4 bg-white/50">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-[2px] p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">GC含量偏差</p>
                      <p className="text-xl font-bold font-mono text-red-600">+{batch.batchEffect.gcDeviation}%</p>
                      <p className="text-xs text-gray-400">阈值: {batch.batchEffect.gcThreshold}%</p>
                    </div>
                    <div className="bg-white rounded-[2px] p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">统计检验</p>
                      <p className="text-xl font-bold font-mono text-gray-900">P = {batch.batchEffect.pValue}</p>
                      <p className="text-xs text-gray-400">单样本T检验</p>
                    </div>
                    <div className="bg-white rounded-[2px] p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">对比批次</p>
                      <p className="text-xl font-bold font-mono text-gray-900">{batch.batchEffect.comparisonBatches.length} 批</p>
                      <p className="text-xs text-gray-400">历史数据对比</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2px] p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      历史批次GC含量对比
                    </h4>
                    <BoxPlotChart
                      data={batch.batchEffect.historicalData}
                      threshold={batch.batchEffect.gcThreshold}
                      currentBatch={batch.id}
                    />
                  </div>

                  <div className="mt-4 bg-white rounded-[2px] p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      拦截原因说明
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {batch.batchEffect.explanation}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Badge variant="warning">需改口径</Badge>
                      <span className="text-xs text-gray-500">建议联系测序技术组排查原因</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {qcMetrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{metric.label}</p>
                    <p className="text-2xl font-bold font-mono text-gray-900 mt-1">{metric.value}</p>
                  </div>
                  {metric.status === 'error' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
                {metric.deviation && (
                  <div className="mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-600 font-medium">偏差 {metric.deviation}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            onClick={() => navigate(action.path)}
          >
            <Card hover className="cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-[2px] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  {action.count > 0 && (
                    <Badge variant="danger" size="md">
                      {action.count} {action.desc}
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-4">{action.label}</h3>
                <div className="mt-2 flex items-center text-sm text-blue-600 font-medium group-hover:gap-2 transition-all gap-1">
                  立即处理 <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {anomalyCategories.map((category, catIndex) => {
          const categoryAnomalies = anomalies.filter(a => a.suggestedAction === category && !a.resolved);
          const categoryColors: Record<string, { bg: string; border: string; title: string; accent: string }> = {
            'need-materials': { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-800', accent: 'bg-orange-500' },
            'need-recalibration': { bg: 'bg-blue-50', border: 'border-blue-200', title: 'text-blue-800', accent: 'bg-blue-500' },
            'pending': { bg: 'bg-gray-50', border: 'border-gray-200', title: 'text-gray-800', accent: 'bg-gray-500' },
          };
          const colors = categoryColors[category];

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + catIndex * 0.1 }}
            >
              <Card>
                <CardHeader className={`${colors.bg} border-b ${colors.border}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${colors.accent}`} />
                      <CardTitle className={`text-base ${colors.title}`}>
                        {ANOMALY_CATEGORY_LABELS[category]}
                      </CardTitle>
                    </div>
                    <Badge variant={category === 'need-materials' ? 'danger' : category === 'need-recalibration' ? 'info' : 'default'} size="md">
                      {categoryAnomalies.length} 项
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-64 overflow-y-auto">
                  {categoryAnomalies.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                      <p className="text-sm">暂无待处理项</p>
                    </div>
                  ) : (
                    categoryAnomalies.map((anomaly, index) => (
                      <motion.div
                        key={anomaly.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          if (anomaly.relatedSamples && anomaly.relatedSamples.length > 0) {
                            selectSample(anomaly.relatedSamples[0]);
                          }
                          navigate('/anomalies');
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${anomaly.priority === 'high' ? 'bg-red-500' : anomaly.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                              <Badge variant="default" size="sm">
                                {ANOMALY_TYPE_LABELS[anomaly.type]}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-gray-900 text-sm truncate">{anomaly.title}</h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{anomaly.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-400">关联样本:</span>
                              {(anomaly.relatedSamples || []).slice(0, 3).map(s => (
                                <span key={s} className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded-[2px] text-gray-600">
                                  {s}
                                </span>
                              ))}
                              {(anomaly.relatedSamples || []).length > 3 && (
                                <span className="text-xs text-gray-400">+{(anomaly.relatedSamples || []).length - 3}</span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                        </div>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              样本列表
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> 正常
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" /> 待复核
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> 异常
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">样本ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">世代</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">病理备注</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">GC含量</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Q30</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">污染概率</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">突变数</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batch.samples.map((sample, index) => {
                  const isContaminated = sample.contamination.probability > 80;
                  const needsReview = sample.lineageInfo.needsReview;
                  const hasIssue = isContaminated || needsReview;
                  const statusColor = isContaminated ? 'red' : needsReview ? 'yellow' : 'emerald';

                  return (
                    <motion.tr
                      key={sample.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono font-medium text-gray-900">{sample.name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{sample.generation}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={sample.pathologyNote}>
                        {sample.pathologyNote}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-mono text-sm ${sample.qcMetrics.gcContent > 47 ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                          {sample.qcMetrics.gcContent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono text-sm text-gray-700">{sample.qcMetrics.q30.toFixed(1)}%</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-mono text-sm ${isContaminated ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                          {sample.contamination.probability.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono text-sm text-gray-700">{sample.mutations.length}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[2px] text-xs font-medium bg-${statusColor}-50 text-${statusColor}-700`}>
                          <span className={`w-1.5 h-1.5 rounded-full bg-${statusColor}-500`} />
                          {isContaminated ? '污染' : needsReview ? '待复核' : '正常'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sample.mutations.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                selectSample(sample.id);
                                navigate('/structure');
                              }}
                            >
                              <Dna className="w-4 h-4 mr-1" />
                              标注
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              selectSample(sample.id);
                              navigate(hasIssue ? '/anomalies' : '/lineage');
                            }}
                          >
                            查看
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
