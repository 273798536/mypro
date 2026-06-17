import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { SampleTimeline } from '@/components/SampleTimeline';
import { ModelComparison } from '@/components/ModelComparison';
import { AttachmentList } from '@/components/AttachmentList';
import { 
  ArrowLeft, User, Calendar, Gauge, Layers, AlertTriangle, 
  CheckCircle, XCircle, FileWarning, Clock, Link2, 
  PauseCircle, PlayCircle, FileText 
} from 'lucide-react';

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const getStatusConfig = (status: string, isSuspended: boolean) => {
  if (isSuspended) {
    return {
      bg: 'bg-sky-50',
      border: 'border-sky-300',
      text: 'text-sky-700',
      dot: 'status-suspended',
      label: '已挂起',
      icon: PauseCircle,
    };
  }
  const configs: Record<string, any> = {
    pending: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-700',
      dot: 'status-pending',
      label: '待处理',
      icon: Clock,
    },
    approved: {
      bg: 'bg-moss-50',
      border: 'border-moss-300',
      text: 'text-moss-700',
      dot: 'status-approved',
      label: '已批准',
      icon: CheckCircle,
    },
    rejected: {
      bg: 'bg-rust-50',
      border: 'border-rust-300',
      text: 'text-rust-700',
      dot: 'status-rejected',
      label: '已拒绝',
      icon: XCircle,
    },
    suspended: {
      bg: 'bg-sky-50',
      border: 'border-sky-300',
      text: 'text-sky-700',
      dot: 'status-suspended',
      label: '已挂起',
      icon: PauseCircle,
    },
  };
  return configs[status] || configs.pending;
};

const SampleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    samples, 
    selectSample, 
    selectedSample,
    checkSampleReferences,
    suspendSample,
    confirmSuspendedSample,
    getSampleConclusion,
  } = useAppStore();
  
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [assignee, setAssignee] = useState('');
  const [referenceCheck, setReferenceCheck] = useState<{ complete: boolean; missing: string[] } | null>(null);

  useEffect(() => {
    if (id) {
      const sample = samples.find(s => s.id === id);
      if (sample) {
        selectSample(id);
        setReferenceCheck(checkSampleReferences(id));
      }
    }
    return () => {
      selectSample(null);
    };
  }, [id, samples, selectSample, checkSampleReferences]);

  if (!selectedSample) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50">
        <div className="text-center">
          <FileText className="w-12 h-12 text-navy-300 mx-auto mb-3" />
          <p className="text-navy-500 mb-4">样本不存在或已被删除</p>
          <button onClick={() => navigate('/')} className="btn">
            返回看板
          </button>
        </div>
      </div>
    );
  }

  const sample = selectedSample;
  const statusConfig = getStatusConfig(sample.status, sample.isSuspended);
  const StatusIcon = statusConfig.icon;
  const conclusion = getSampleConclusion(sample.id);
  const isMisjudgeSample = sample.id === 'MISJUDGE001';

  const handleSuspend = () => {
    if (!suspendReason.trim() || !assignee.trim()) return;
    suspendSample(sample.id, suspendReason, assignee);
    setShowSuspendForm(false);
    setSuspendReason('');
    setAssignee('');
    setReferenceCheck(checkSampleReferences(sample.id));
  };

  const handleConfirm = () => {
    confirmSuspendedSample(sample.id);
    setReferenceCheck(checkSampleReferences(sample.id));
  };

  return (
    <div className="min-h-screen bg-navy-50">
      <div className="sticky top-0 z-30 bg-white border-b border-navy-200 shadow-sm">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-navy-600 hover:text-navy-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">返回看板</span>
              </button>
              <div className="w-px h-5 bg-navy-200" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-xl font-bold text-navy-800">
                    样本详情
                  </h1>
                  <span className="font-mono text-sm text-navy-500">
                    {sample.id}
                  </span>
                  {isMisjudgeSample && (
                    <span className="tag tag-amber">
                      旧模型误判测试样本
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!sample.isSuspended && !sample.referenceComplete && referenceCheck && !referenceCheck.complete && (
                <button
                  onClick={() => setShowSuspendForm(true)}
                  className="btn btn-sky text-sm flex items-center gap-1.5"
                >
                  <PauseCircle className="w-4 h-4" />
                  挂起等待确认
                </button>
              )}
              {sample.isSuspended && (
                <button
                  onClick={handleConfirm}
                  className="btn btn-moss text-sm flex items-center gap-1.5"
                >
                  <PlayCircle className="w-4 h-4" />
                  确认解除挂起
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSuspendForm && (
        <div className="bg-sky-50 border-b border-sky-200 py-4">
          <div className="container mx-auto px-6">
            <div className="flex items-start gap-3">
              <FileWarning className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-sky-800 mb-2">
                  挂起样本，等待接手同事确认
                </div>
                <div className="text-xs text-sky-600 mb-3">
                  引用缺失：{referenceCheck?.missing.join('、')}
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-xl">
                  <div>
                    <label className="text-xs text-navy-500 block mb-1">挂起原因</label>
                    <input
                      type="text"
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="请输入挂起原因"
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-navy-500 block mb-1">接手同事</label>
                    <input
                      type="text"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      placeholder="请输入接手人姓名"
                      className="input-field text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleSuspend} className="btn btn-sky text-sm">
                    确认挂起
                  </button>
                  <button
                    onClick={() => setShowSuspendForm(false)}
                    className="btn text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 animate-fade-in">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-navy-500" />
                    <span className="font-serif text-xl font-bold text-navy-800">
                      {sample.customerName}
                    </span>
                  </div>
                  <div className="text-sm text-navy-500">
                    客户ID：<span className="font-mono">{sample.customerId}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 border ${statusConfig.bg} ${statusConfig.border}`}>
                  <span className={`status-dot ${statusConfig.dot}`}></span>
                  <StatusIcon className={`w-4 h-4 ${statusConfig.text}`} />
                  <span className={`text-sm font-semibold ${statusConfig.text}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-navy-50 border border-navy-100">
                  <div className="flex items-center gap-1.5 text-xs text-navy-500 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    申请日期
                  </div>
                  <div className="font-mono font-semibold text-navy-700">
                    {formatDate(sample.applyDate)}
                  </div>
                </div>
                <div className="p-3 bg-navy-50 border border-navy-100">
                  <div className="flex items-center gap-1.5 text-xs text-navy-500 mb-1">
                    <Layers className="w-3.5 h-3.5" />
                    客户分层
                  </div>
                  <div className="font-semibold text-navy-700">
                    {sample.segmentName}
                  </div>
                </div>
                <div className="p-3 bg-navy-50 border border-navy-100">
                  <div className="flex items-center gap-1.5 text-xs text-navy-500 mb-1">
                    <Gauge className="w-3.5 h-3.5" />
                    最新评分
                  </div>
                  <div className={`font-mono font-bold text-xl ${
                    sample.latestResult === 'pass' ? 'text-moss-600' : 'text-rust-600'
                  }`}>
                    {sample.latestScore}
                    <span className="text-sm font-normal ml-1">
                      {sample.latestResult === 'pass' ? '通过' : '未通过'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-navy-50 border border-navy-100">
                  <div className="flex items-center gap-1.5 text-xs text-navy-500 mb-1">
                    <Gauge className="w-3.5 h-3.5" />
                    当前阈值
                  </div>
                  <div className="font-mono font-semibold text-navy-700">
                    ≥{sample.threshold}分
                    <span className="text-xs font-normal text-navy-500 ml-1">
                      ({sample.thresholdVersion})
                    </span>
                  </div>
                </div>
              </div>

              <div className="divider-dashed" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 mb-1">
                    <Gauge className="w-3.5 h-3.5" />
                    模型版本
                  </div>
                  <div className="font-mono font-semibold text-amber-800">
                    {sample.modelVersion}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    特殊标记
                  </div>
                  <div className="flex items-center gap-2">
                    {sample.hasLateAttachment && (
                      <span className="tag tag-amber text-xs">含晚到附件</span>
                    )}
                    {!sample.referenceComplete && (
                      <span className="tag tag-rust text-xs">
                        <Link2 className="w-3 h-3 mr-0.5" />
                        引用缺失
                      </span>
                    )}
                    {sample.isSuspended && sample.assignedTo && (
                      <span className="tag tag-sky text-xs">
                        接手人：{sample.assignedTo}
                      </span>
                    )}
                    {!sample.hasLateAttachment && sample.referenceComplete && !sample.isSuspended && (
                      <span className="tag tag-moss text-xs">数据完整</span>
                    )}
                  </div>
                </div>
              </div>

              {sample.isSuspended && sample.suspendReason && (
                <div className="mt-4 p-3 bg-sky-50 border border-sky-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-sky-600 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-sky-700 mb-1">
                        挂起原因
                      </div>
                      <div className="text-sm text-sky-800">
                        {sample.suspendReason}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {referenceCheck && !referenceCheck.complete && !sample.isSuspended && (
                <div className="mt-4 p-3 bg-rust-50 border border-rust-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rust-600 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-rust-700 mb-1">
                        引用缺失检测
                      </div>
                      <div className="text-sm text-rust-800">
                        检测到以下引用缺失：{referenceCheck.missing.join('、')}
                      </div>
                      <div className="text-xs text-rust-600 mt-1">
                        建议挂起等待接手同事确认，避免输出假稳定结论
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <SampleTimeline sampleId={sample.id} />

            <ModelComparison sampleId={sample.id} />
          </div>

          <div className="space-y-6">
            <div className="card p-5 animate-fade-in animate-stagger-1">
              <h3 className="font-serif text-lg font-semibold text-navy-800 mb-4">
                最终结论
              </h3>
              {conclusion ? (
                <div>
                  <div className={`flex items-center gap-2 mb-3 px-3 py-2 border ${
                    conclusion.finalResult === 'approve' ? 'bg-moss-50 border-moss-200' :
                    conclusion.finalResult === 'reject' ? 'bg-rust-50 border-rust-200' :
                    'bg-sky-50 border-sky-200'
                  }`}>
                    {conclusion.finalResult === 'approve' ? (
                      <CheckCircle className="w-5 h-5 text-moss-600" />
                    ) : conclusion.finalResult === 'reject' ? (
                      <XCircle className="w-5 h-5 text-rust-600" />
                    ) : (
                      <PauseCircle className="w-5 h-5 text-sky-600" />
                    )}
                    <span className={`font-semibold ${
                      conclusion.finalResult === 'approve' ? 'text-moss-700' :
                      conclusion.finalResult === 'reject' ? 'text-rust-700' :
                      'text-sky-700'
                    }`}>
                      {conclusion.finalResult === 'approve' ? '批准' :
                       conclusion.finalResult === 'reject' ? '拒绝' : '挂起'}
                    </span>
                  </div>
                  <p className="text-sm text-navy-700 mb-3 leading-relaxed">
                    {conclusion.explanation}
                  </p>
                  <div className="text-xs text-navy-500 space-y-1">
                    <div>结论日期：{formatDate(conclusion.conclusionDate)}</div>
                    <div>结论人：{conclusion.conclusionBy}</div>
                    <div>
                      引用完整性：
                      {conclusion.isReferenceComplete ? (
                        <span className="text-moss-600 font-medium">完整</span>
                      ) : (
                        <span className="text-rust-600 font-medium">
                          缺失（{conclusion.missingReferences.join('、')}）
                        </span>
                      )}
                    </div>
                    <div>已关联附件：{conclusion.referencedAttachmentIds.length} 个</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <FileText className="w-8 h-8 text-navy-300 mx-auto mb-2" />
                  <p className="text-navy-500 text-sm">暂无最终结论</p>
                </div>
              )}
            </div>

            <AttachmentList sampleId={sample.id} />

            {isMisjudgeSample && (
              <div className="card p-5 animate-fade-in animate-stagger-2 bg-amber-50/50 border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-amber-800 mb-2">
                      误判测试样本说明
                    </div>
                    <div className="text-xs text-amber-700 space-y-1.5">
                      <p>
                        此样本用于验证模型改判解释功能：
                      </p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>旧模型 v1.9.0：评分 592 分 → 未通过</li>
                        <li>新模型 v2.1.0：评分 675 分 → 通过</li>
                        <li>阈值从 600 分调整为 650 分</li>
                      </ul>
                      <p className="pt-1.5">
                        请查看上方「模型版本对比」中的改判解释，
                        确认新模型能否清晰说明改判原因。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SampleDetail;
