import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FlaskConical,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Info,
  FileText,
  Send,
} from 'lucide-react';
import { useAppStore, selectCurrentBatch, selectSelectedSample, selectActions } from '../../store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import ContaminationHeatmap from '../../components/charts/ContaminationHeatmap';
import BoxPlotChart from '../../components/charts/BoxPlotChart';
import { CONTAMINATION_TYPE_LABELS, ANOMALY_TYPE_LABELS } from '../../types';
import type { ContaminationType } from '../../types';

export default function Contamination() {
  const batch = useAppStore(selectCurrentBatch);
  const selectedSample = useAppStore(selectSelectedSample);
  const { selectSample, updateSample, addReviewRecord, resolveAnomaly } = useAppStore(selectActions);

  const [showBatchEffectDetail, setShowBatchEffectDetail] = useState(true);
  const [contaminationType, setContaminationType] = useState<ContaminationType>('pollen');
  const [confidence, setConfidence] = useState(80);
  const [reviewComment, setReviewComment] = useState('');

  const suspiciousSamples = useMemo(() =>
    batch.samples.filter(s => s.contamination.probability > 50),
    [batch.samples]
  );

  const activeSample = selectedSample && selectedSample.contamination.probability > 50
    ? selectedSample
    : suspiciousSamples[0];

  const handleConfirmContamination = () => {
    if (!activeSample) return;

    updateSample(activeSample.id, {
      contamination: {
        ...activeSample.contamination,
        type: contaminationType,
        reviewed: true,
        reviewer: '张育种',
        reviewTime: new Date(),
      },
    });

    addReviewRecord({
      id: `review-${Date.now()}`,
      type: 'contamination',
      targetId: activeSample.id,
      action: '确认污染',
      comment: reviewComment || `确认${CONTAMINATION_TYPE_LABELS[contaminationType!]}，置信度${confidence}%`,
      reviewer: '张育种',
      timestamp: new Date(),
    });

    const relatedAnomaly = batch.samples.find(s => s.id === activeSample.id);
    if (relatedAnomaly) {
      const anomalyToResolve = batch.samples.find(s => s.id === activeSample.id);
    }

    setReviewComment('');
  };

  const handleRejectContamination = () => {
    if (!activeSample) return;

    updateSample(activeSample.id, {
      contamination: {
        ...activeSample.contamination,
        probability: 10,
        confidence: 'low',
        evidenceLoci: [],
        reviewed: true,
        reviewer: '张育种',
        reviewTime: new Date(),
      },
    });

    addReviewRecord({
      id: `review-${Date.now()}`,
      type: 'contamination',
      targetId: activeSample.id,
      action: '排除污染',
      comment: reviewComment || '经人工复核，排除污染可能。建议重新检测验证。',
      reviewer: '张育种',
      timestamp: new Date(),
    });

    setReviewComment('');
  };

  const getSampleStatus = (sample: typeof batch.samples[0]) => {
    if (sample.contamination.reviewed) {
      return sample.contamination.probability > 80 ? '已确认污染' : '已排除';
    }
    return sample.contamination.probability > 80 ? '高风险' : '待复核';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Space_Grotesk'] flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-blue-600" />
            污染样本复核
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            样本清单、病理备注、污染检测结果同屏展示，一站式复核
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="danger" size="md">
            {suspiciousSamples.filter(s => !s.contamination.reviewed).length} 个待复核
          </Badge>
          <Badge variant="warning" size="md">
            批次效应已拦截
          </Badge>
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
                <h3 className="font-semibold text-red-800">批次效应拦截说明</h3>
                <p className="text-sm text-red-600">
                  GC含量偏差 <span className="font-mono font-bold">+{batch.batchEffect.gcDeviation}%</span>，
                  P值 {batch.batchEffect.pValue}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showBatchEffectDetail ? (
                <ChevronUp className="w-5 h-5 text-red-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-red-400" />
              )}
            </div>
          </div>

          {showBatchEffectDetail && (
            <div className="border-t border-red-200 p-4 bg-white/50">
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
                  <p className="text-xs text-gray-500 mb-1">风险等级</p>
                  <p className="text-xl font-bold text-yellow-600">中风险</p>
                  <p className="text-xs text-gray-400">建议排查后放行</p>
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
                  拦截原因详细说明（质控组导出报告可见）
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {batch.batchEffect.explanation}
                </p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="warning">需改口径</Badge>
                  <span className="text-xs text-gray-500">建议联系测序技术组排查PCR扩增条件</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 28rem)' }}>
        <Card className="col-span-3 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">样本清单</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto h-[calc(100%-60px)]">
            <div className="p-2">
              {batch.samples.map((sample) => {
                const isSuspicious = sample.contamination.probability > 50;
                const status = getSampleStatus(sample);
                
                return (
                  <motion.div
                    key={sample.id}
                    whileHover={{ x: 2 }}
                    onClick={() => selectSample(sample.id)}
                    className={`
                      p-3 rounded-[2px] cursor-pointer transition-all mb-1
                      ${activeSample?.id === sample.id 
                        ? 'bg-blue-50 border-l-2 border-blue-500' 
                        : 'hover:bg-gray-50'}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-gray-900">{sample.name}</span>
                          {isSuspicious && !sample.contamination.reviewed && (
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{sample.generation}</p>
                      </div>
                      <Badge 
                        variant={
                          sample.contamination.reviewed 
                            ? sample.contamination.probability > 80 ? 'danger' : 'success'
                            : sample.contamination.probability > 80 ? 'danger' : 'warning'
                        }
                        size="sm"
                      >
                        {status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                      <span className="text-gray-400">病理备注:</span> {sample.pathologyNote}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">污染概率:</span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${sample.contamination.probability}%` }}
                          className={`h-full rounded-full ${
                            sample.contamination.probability > 80 ? 'bg-red-500' :
                            sample.contamination.probability > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-gray-600">
                        {sample.contamination.probability.toFixed(0)}%
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-5 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">污染检测热图</CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-y-auto h-[calc(100%-60px)]">
            <ContaminationHeatmap
              samples={batch.samples}
              selectedSampleId={activeSample?.id || null}
              onSampleSelect={selectSample}
            />
          </CardContent>
        </Card>

        <Card className="col-span-4 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">人工标注面板</CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-y-auto h-[calc(100%-60px)]">
            {activeSample ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-[2px] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-semibold text-gray-900">{activeSample.name}</span>
                    <Badge variant={activeSample.contamination.probability > 80 ? 'danger' : 'warning'} size="sm">
                      {ANOMALY_TYPE_LABELS.contamination}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{activeSample.generation}</p>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">病理备注</p>
                    <p className="text-sm text-gray-700">{activeSample.pathologyNote}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">检测证据</p>
                  <div className="bg-white border border-gray-200 rounded-[2px] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">污染概率</span>
                      <span className="font-mono font-bold text-red-600">
                        {activeSample.contamination.probability.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">置信度</span>
                      <Badge variant={activeSample.contamination.confidence === 'high' ? 'danger' : 'warning'} size="sm">
                        {activeSample.contamination.confidence === 'high' ? '高' : activeSample.contamination.confidence === 'medium' ? '中' : '低'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">异常基因座</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activeSample.contamination.evidenceLoci.map((locus, i) => (
                          <span key={i} className="text-[10px] font-mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded-[2px]">
                            {locus.replace('TraesCS', '').replace(/01G/, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">判定污染类型</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['pollen', 'cross-sample', 'other'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setContaminationType(type)}
                        className={`
                          p-2 text-xs rounded-[2px] border-2 transition-all text-left
                          ${contaminationType === type
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'}
                        `}
                      >
                        {CONTAMINATION_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">置信度设置</p>
                    <span className="font-mono text-sm font-bold text-gray-900">{confidence}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">复核意见</p>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="输入复核意见，如：经核对田间记录，该株行位于试验区边缘，隔离不充分..."
                    className="w-full h-20 p-2 text-sm border border-gray-300 rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    className="w-full"
                    variant="danger"
                    onClick={handleConfirmContamination}
                    disabled={activeSample.contamination.reviewed}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    确认污染，予以剔除
                  </Button>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={handleRejectContamination}
                    disabled={activeSample.contamination.reviewed}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    排除污染，保留样本
                  </Button>
                  {activeSample.contamination.reviewed && (
                    <div className="text-center text-xs text-gray-500">
                      已于 {activeSample.contamination.reviewTime?.toLocaleString('zh-CN')} 由 {activeSample.contamination.reviewer} 复核
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <FlaskConical className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm">请选择一个样本进行复核</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            操作说明
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-medium text-gray-900 mb-1">1. 查看热图</p>
              <p className="text-gray-600 text-xs">热图显示每个样本在关键基因座的异常评分，颜色越深表示污染可能性越高。点击单元格可查看具体数值。</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">2. 核对样本信息</p>
              <p className="text-gray-600 text-xs">左侧样本清单展示病理备注和污染概率，结合热图和备注信息综合判断是否为真阳性。</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">3. 人工标注确认</p>
              <p className="text-gray-600 text-xs">右侧面板填写污染类型、置信度和复核意见，确认后样本将从分析中剔除并记录操作历史。</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
