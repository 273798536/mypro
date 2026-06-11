import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  FileQuestion,
  Settings,
  ArrowRight,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  MessageSquare,
  ChevronRight,
  Info,
  Package,
  XCircle,
} from 'lucide-react';
import { useAppStore, selectAnomalies, selectActions, selectCurrentBatch } from '../../store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ANOMALY_TYPE_LABELS, ANOMALY_ACTION_LABELS, ANOMALY_SEVERITY_LABELS } from '../../types';
import type { Anomaly, AnomalyAction } from '../../types';

export default function Anomalies() {
  const anomalies = useAppStore(selectAnomalies);
  const batch = useAppStore(selectCurrentBatch);
  const { resolveAnomaly, addReviewRecord } = useAppStore(selectActions);

  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<'all' | AnomalyAction>('all');
  const [resolutionNote, setResolutionNote] = useState('');
  const [showResolutionForm, setShowResolutionForm] = useState(false);

  const filteredAnomalies = useMemo(() => {
    if (actionFilter === 'all') return anomalies;
    return anomalies.filter(a => a.suggestedAction === actionFilter);
  }, [anomalies, actionFilter]);

  const selectedAnomaly = useMemo(() =>
    anomalies.find(a => a.id === selectedAnomalyId),
    [anomalies, selectedAnomalyId]
  );

  const stats = useMemo(() => ({
    total: anomalies.length,
    needMaterials: anomalies.filter(a => a.suggestedAction === 'need-materials').length,
    needRecalibration: anomalies.filter(a => a.suggestedAction === 'need-recalibration').length,
    pending: anomalies.filter(a => a.suggestedAction === 'pending').length,
    resolved: anomalies.filter(a => a.resolved).length,
  }), [anomalies]);

  const handleResolve = (resolution: 'approve' | 'override') => {
    if (!selectedAnomaly) return;

    resolveAnomaly(selectedAnomaly.id, {
      resolved: true,
      resolution: resolution === 'approve' ? 'follow-suggestion' : 'override',
      resolvedBy: '张育种',
      resolvedAt: new Date(),
      resolutionNote: resolutionNote || (
        resolution === 'approve'
          ? `同意系统建议：${ANOMALY_ACTION_LABELS[selectedAnomaly.suggestedAction]}`
          : '人工复核后调整处理方案'
      ),
    });

    addReviewRecord({
      id: `review-${Date.now()}`,
      type: 'anomaly',
      targetId: selectedAnomaly.id,
      action: resolution === 'approve' ? '按建议处理' : '人工调整处理',
      comment: resolutionNote || (
        resolution === 'approve'
          ? `已按系统建议处理：${ANOMALY_ACTION_LABELS[selectedAnomaly.suggestedAction]}`
          : '经人工复核，调整处理方案'
      ),
      reviewer: '张育种',
      timestamp: new Date(),
    });

    setResolutionNote('');
    setShowResolutionForm(false);
  };

  const getActionIcon = (action: AnomalyAction) => {
    switch (action) {
      case 'need-materials': return <Package className="w-4 h-4" />;
      case 'need-recalibration': return <Settings className="w-4 h-4" />;
      case 'pending': return <FileQuestion className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: AnomalyAction) => {
    switch (action) {
      case 'need-materials': return 'orange';
      case 'need-recalibration': return 'purple';
      case 'pending': return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Space_Grotesk'] flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-blue-600" />
            异常处理中心
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            异常分类处理，明确下一步该补材料还是改口径
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="danger" size="md">
            {anomalies.filter(a => !a.resolved).length} 个待处理
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className={`transition-all cursor-pointer ${
          actionFilter === 'all' ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`} onClick={() => setActionFilter('all')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">全部异常</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-[2px] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`transition-all cursor-pointer ${
          actionFilter === 'need-materials' ? 'ring-2 ring-orange-500 ring-offset-2' : ''
        }`} onClick={() => setActionFilter('need-materials')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">需补材料</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.needMaterials}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-[2px] flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`transition-all cursor-pointer ${
          actionFilter === 'need-recalibration' ? 'ring-2 ring-purple-500 ring-offset-2' : ''
        }`} onClick={() => setActionFilter('need-recalibration')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">需改口径</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.needRecalibration}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-[2px] flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setActionFilter('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">待确认</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-[2px] flex items-center justify-center">
                <FileQuestion className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 26rem)' }}>
        <Card className="col-span-5 overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">异常列表</CardTitle>
            <span className="text-xs text-gray-500">共 {filteredAnomalies.length} 条</span>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto h-[calc(100%-60px)]">
            <div className="p-2">
              {filteredAnomalies.map((anomaly) => {
                const isSelected = selectedAnomalyId === anomaly.id;
                const actionColor = getActionColor(anomaly.suggestedAction);
                
                return (
                  <motion.div
                    key={anomaly.id}
                    whileHover={{ x: 2 }}
                    onClick={() => {
                      setSelectedAnomalyId(anomaly.id);
                      setShowResolutionForm(false);
                      setResolutionNote('');
                    }}
                    className={`
                      p-3 rounded-[2px] cursor-pointer transition-all mb-2
                      ${isSelected 
                        ? 'bg-blue-50 border-l-2 border-blue-500' 
                        : 'hover:bg-gray-50'}
                      ${anomaly.resolved ? 'opacity-60' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className={`
                          w-8 h-8 rounded-[2px] flex items-center justify-center flex-shrink-0
                          ${actionColor === 'orange' ? 'bg-orange-100 text-orange-600' :
                            actionColor === 'purple' ? 'bg-purple-100 text-purple-600' :
                            'bg-gray-100 text-gray-600'}
                        `}>
                          {getActionIcon(anomaly.suggestedAction)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-900">
                              {ANOMALY_TYPE_LABELS[anomaly.type]}
                            </span>
                            <Badge
                              variant={
                                anomaly.severity === 'high' ? 'danger' :
                                anomaly.severity === 'medium' ? 'warning' : 'info'
                              }
                              size="sm"
                            >
                              {ANOMALY_SEVERITY_LABELS[anomaly.severity]}
                            </Badge>
                            {anomaly.resolved && (
                              <Badge variant="success" size="sm">已处理</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {anomaly.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant={
                                anomaly.suggestedAction === 'need-materials' ? 'warning' :
                                anomaly.suggestedAction === 'need-recalibration' ? 'secondary' : 'default'
                              }
                              size="sm"
                            >
                              {ANOMALY_ACTION_LABELS[anomaly.suggestedAction]}
                            </Badge>
                            <span className="text-[10px] text-gray-400">
                              {anomaly.sampleId || `批次 ${batch.id}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-7 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">异常详情与处理</CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-y-auto h-[calc(100%-60px)]">
            {selectedAnomaly ? (
              <div className="space-y-5">
                <div className={`rounded-[2px] p-4 border-2 ${
                  selectedAnomaly.suggestedAction === 'need-materials'
                    ? 'bg-orange-50 border-orange-200'
                    : selectedAnomaly.suggestedAction === 'need-recalibration'
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-10 h-10 rounded-[2px] flex items-center justify-center flex-shrink-0
                      ${selectedAnomaly.suggestedAction === 'need-materials' ? 'bg-orange-100 text-orange-600' :
                        selectedAnomaly.suggestedAction === 'need-recalibration' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'}
                    `}>
                      {selectedAnomaly.suggestedAction === 'need-materials' ? (
                        <Package className="w-5 h-5" />
                      ) : selectedAnomaly.suggestedAction === 'need-recalibration' ? (
                        <Settings className="w-5 h-5" />
                      ) : (
                        <FileQuestion className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        selectedAnomaly.suggestedAction === 'need-materials' ? 'text-orange-800' :
                        selectedAnomaly.suggestedAction === 'need-recalibration' ? 'text-purple-800' :
                        'text-gray-800'
                      }`}>
                        系统建议：{ANOMALY_ACTION_LABELS[selectedAnomaly.suggestedAction]}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        selectedAnomaly.suggestedAction === 'need-materials' ? 'text-orange-700' :
                        selectedAnomaly.suggestedAction === 'need-recalibration' ? 'text-purple-700' :
                        'text-gray-700'
                      }`}>
                        {selectedAnomaly.suggestedAction === 'need-materials'
                          ? '请补充以下材料后继续分析：' + (
                            selectedAnomaly.type === 'low-coverage'
                              ? '重新提取WH-003样本DNA，进行深度补测，目标深度≥100×'
                              : selectedAnomaly.type === 'quality-issue'
                              ? '重新制备WH-011样本测序文库，优化建库条件'
                              : '补充相关实验材料'
                          )
                          : selectedAnomaly.suggestedAction === 'need-recalibration'
                          ? '请调整分析参数或重新检测：' + (
                            selectedAnomaly.type === 'batch-effect'
                              ? '联系测序技术组排查PCR扩增条件，优化GC偏向性'
                              : selectedAnomaly.type === 'contamination'
                              ? '重新核对样本编号，检查样本交叉污染情况'
                              : selectedAnomaly.type === 'genotype-conflict'
                              ? '重新核对谱系记录，确认父本母本信息'
                              : '调整分析参数'
                          )
                          : '请人工确认以下信息：' + (
                            selectedAnomaly.type === 'uncertain-mutation'
                              ? 'WH-007样本第156位氨基酸变异需要Sanger测序验证'
                              : '人工复核确认'
                          )
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-[2px] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">异常基本信息</h4>
                    {selectedAnomaly.resolved && (
                      <Badge variant="success">已处理完成</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">异常类型</p>
                      <p className="text-sm font-medium text-gray-900">
                        {ANOMALY_TYPE_LABELS[selectedAnomaly.type]}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">严重程度</p>
                      <Badge
                        variant={
                          selectedAnomaly.severity === 'high' ? 'danger' :
                          selectedAnomaly.severity === 'medium' ? 'warning' : 'info'
                        }
                      >
                        {ANOMALY_SEVERITY_LABELS[selectedAnomaly.severity]}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">关联样本</p>
                      <p className="text-sm font-mono text-gray-900">
                        {selectedAnomaly.sampleId || '全批次'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">检测时间</p>
                      <p className="text-sm text-gray-600">
                        {selectedAnomaly.detectedAt.toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">详细描述</p>
                    <p className="text-sm text-gray-700">{selectedAnomaly.description}</p>
                  </div>
                  {selectedAnomaly.evidence && selectedAnomaly.evidence.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">检测证据</p>
                      <div className="space-y-1.5">
                        {selectedAnomaly.evidence.map((ev, i) => (
                          <div key={i} className="text-xs text-gray-600 flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedAnomaly.resolved && selectedAnomaly.resolutionNote && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-[2px] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-emerald-800">处理结果</span>
                    </div>
                    <p className="text-sm text-emerald-700">{selectedAnomaly.resolutionNote}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-emerald-600">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span>{selectedAnomaly.resolvedBy}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{selectedAnomaly.resolvedAt?.toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {!selectedAnomaly.resolved && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3"
                    >
                      {!showResolutionForm ? (
                        <div className="flex gap-3">
                          <Button
                            className="flex-1"
                            variant="primary"
                            onClick={() => setShowResolutionForm(true)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            按建议处理
                          </Button>
                          <Button
                            className="flex-1"
                            variant="secondary"
                            onClick={() => setShowResolutionForm(true)}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            人工调整方案
                          </Button>
                        </div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-50 border border-gray-200 rounded-[2px] p-4"
                        >
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            处理确认
                          </h4>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">处理意见</label>
                            <textarea
                              value={resolutionNote}
                              onChange={(e) => setResolutionNote(e.target.value)}
                              placeholder="输入处理意见，如：已安排WH-003样本重新提取DNA，预计3个工作日内完成..."
                              className="w-full h-20 p-2 text-sm border border-gray-300 rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                            />
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleResolve('approve')}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              确认按建议处理
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleResolve('override')}
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              人工调整处理
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowResolutionForm(false);
                                setResolutionNote('');
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              取消
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <AlertTriangle className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm">请从左侧选择一个异常项查看详情</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            处理流程说明
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-100 rounded-[2px] flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">需补材料</span>
                <span className="text-xs text-gray-500">→</span>
                <span className="text-xs text-gray-600">补充样本、试剂或重新检测</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-100 rounded-[2px] flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">需改口径</span>
                <span className="text-xs text-gray-500">→</span>
                <span className="text-xs text-gray-600">调整参数、修正方法或重新分析</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded-[2px] flex items-center justify-center">
                  <FileQuestion className="w-3.5 h-3.5 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">待确认</span>
                <span className="text-xs text-gray-500">→</span>
                <span className="text-xs text-gray-600">人工复核判定处理方案</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
