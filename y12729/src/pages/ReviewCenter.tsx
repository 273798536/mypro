import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { StatusBadge, ReviewBadge, DuplicateTag, SectionCard, PillButton, PrimaryButton, ExplanationBox } from '@/components/Badges';
import type { AnalysisSample } from '@/types';
import { CheckCircle2, XCircle, FileEdit, ChevronDown, ChevronUp, Zap, AlertTriangle } from 'lucide-react';

type FilterTab = 'all' | 'pending_review' | 'approved' | 'rejected' | 'duplicates';

function ReviewCard({ sample }: { sample: AnalysisSample }) {
  const navigate = useNavigate();
  const setReviewStatus = useStore((s) => s.setReviewStatus);
  const recomputeAll = useStore((s) => s.recomputeAll);
  const getSampleById = useStore((s) => s.getSampleById);
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(sample.reviewComment || '');

  const duplicateSample = sample.isDuplicate && sample.duplicateOf
    ? getSampleById(sample.duplicateOf)
    : null;

  const handleApprove = () => {
    setReviewStatus(sample.id, 'approved');
  };

  const handleReject = () => {
    setReviewStatus(sample.id, 'rejected');
  };

  const handleSupplement = () => {
    setReviewStatus(sample.id, 'pending_review', note);
    recomputeAll();
    setExpanded(false);
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden animate-fade-in animate-slide-up">
      <div className="p-5">
        <div className="flex items-start gap-5">
          <div className="flex flex-col gap-2 shrink-0 w-56">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={sample.status} />
              <ReviewBadge status={sample.reviewStatus} reviewed={sample.reviewed} />
            </div>
            {sample.isDuplicate && (
              <DuplicateTag score={sample.duplicatePair?.similarityScore} />
            )}
            <button
              onClick={() => navigate(`/sample/${sample.id}`)}
              className="text-left group"
            >
              <h4 className="font-semibold text-neutral-50 text-sm group-hover:text-accent-cyan transition-colors">
                {sample.name}
              </h4>
            </button>
            <div className="text-xs text-neutral-300 font-mono space-y-0.5">
              <div>ID: {sample.id}</div>
              <div>创建: {new Date(sample.createdAt).toLocaleString('zh-CN')}</div>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            {sample.explanation && (
              <ExplanationBox summary={sample.explanation.summary} />
            )}

            {sample.issues.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />
                  数据问题 ({sample.issues.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sample.issues.map((issue, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        issue.severity === 'error'
                          ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
                          : 'bg-accent-amber/15 text-accent-amber border-accent-amber/30'
                      }`}
                    >
                      {issue.message}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {sample.isDuplicate && sample.duplicatePair && (
              <div className="bg-accent-red/10 rounded-lg p-3 border border-accent-red/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-accent-red">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  重复样本检测
                </div>
                <div className="text-xs text-neutral-200 space-y-0.5">
                  {duplicateSample ? (
                    <div>
                      与样本 <span className="text-accent-cyan font-medium cursor-pointer hover:underline" onClick={() => navigate(`/sample/${duplicateSample.id}`)}>{duplicateSample.name}</span> 重复
                    </div>
                  ) : (
                    <div>与样本 {sample.duplicateOf} 重复</div>
                  )}
                  <div>相似度: <span className="text-accent-red font-medium">{(sample.duplicatePair.similarityScore * 100).toFixed(1)}%</span></div>
                  <div>拦截理由: <span className="text-neutral-100">{sample.duplicatePair.reason}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-deep-600/50">
          <div className="text-xs text-neutral-400">
            {sample.reviewComment && (
              <span>备注: {sample.reviewComment}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <PrimaryButton
              variant="ghost"
              icon={<FileEdit className="w-4 h-4" />}
              onClick={() => setExpanded(!expanded)}
            >
              补录数据
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </PrimaryButton>
            <PrimaryButton
              variant="danger"
              icon={<XCircle className="w-4 h-4" />}
              onClick={handleReject}
            >
              打回
            </PrimaryButton>
            <PrimaryButton
              variant="primary"
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleApprove}
            >
              通过
            </PrimaryButton>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-deep-600/50 animate-fade-in">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">备注</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="添加复核备注..."
                  className="w-full h-20 px-3 py-2 rounded-lg bg-deep-800/80 border border-deep-600/60 text-sm text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-accent-cyan/50 resize-none"
                />
              </div>
              <div className="flex justify-end">
                <PrimaryButton variant="primary" onClick={handleSupplement}>
                  确认补录并重新计算
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewCenter() {
  const samples = useStore((s) => s.samples);
  const setReviewStatus = useStore((s) => s.setReviewStatus);
  const recomputeAll = useStore((s) => s.recomputeAll);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const counts = useMemo(() => {
    return {
      all: samples.length,
      pending_review: samples.filter((s) => !s.reviewed).length,
      approved: samples.filter((s) => s.reviewed && s.reviewStatus === 'approved').length,
      rejected: samples.filter((s) => s.reviewed && s.reviewStatus === 'rejected').length,
      duplicates: samples.filter((s) => s.isDuplicate).length,
    };
  }, [samples]);

  const filteredSamples = useMemo(() => {
    switch (activeTab) {
      case 'pending_review':
        return samples.filter((s) => !s.reviewed);
      case 'approved':
        return samples.filter((s) => s.reviewed && s.reviewStatus === 'approved');
      case 'rejected':
        return samples.filter((s) => s.reviewed && s.reviewStatus === 'rejected');
      case 'duplicates':
        return samples.filter((s) => s.isDuplicate);
      default:
        return samples;
    }
  }, [samples, activeTab]);

  const handleApproveAllNormal = () => {
    samples.forEach((s) => {
      if (s.status === 'normal' && !s.reviewed) {
        setReviewStatus(s.id, 'approved');
      }
    });
  };

  const handleMarkAllDuplicates = () => {
    samples.forEach((s) => {
      if (s.isDuplicate && !s.reviewed) {
        setReviewStatus(s.id, 'rejected', '重复样本，自动打回');
      }
    });
    recomputeAll();
  };

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-deep-900/95 backdrop-blur-sm border-b border-accent-cyan/10">
        <div className="px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-50 tracking-tight">批量复核中心</h1>
              <p className="text-sm text-neutral-300 mt-1">
                待复核 <span className="text-accent-cyan font-semibold">{counts.pending_review}</span> 条样例
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PrimaryButton
                variant="ghost"
                icon={<AlertTriangle className="w-4 h-4" />}
                onClick={handleMarkAllDuplicates}
              >
                标记所有重复样本
              </PrimaryButton>
              <PrimaryButton
                variant="primary"
                icon={<Zap className="w-4 h-4" />}
                onClick={handleApproveAllNormal}
              >
                一键通过所有正常样例
              </PrimaryButton>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <PillButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} count={counts.all}>
              全部
            </PillButton>
            <PillButton active={activeTab === 'pending_review'} onClick={() => setActiveTab('pending_review')} count={counts.pending_review}>
              待复核
            </PillButton>
            <PillButton active={activeTab === 'approved'} onClick={() => setActiveTab('approved')} count={counts.approved}>
              已通过
            </PillButton>
            <PillButton active={activeTab === 'rejected'} onClick={() => setActiveTab('rejected')} count={counts.rejected}>
              已打回
            </PillButton>
            <PillButton active={activeTab === 'duplicates'} onClick={() => setActiveTab('duplicates')} count={counts.duplicates}>
              仅重复样本
            </PillButton>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-4">
        {filteredSamples.length === 0 ? (
          <SectionCard title="暂无数据">
            <div className="text-center py-12 text-neutral-400 text-sm">
              当前筛选条件下没有样例
            </div>
          </SectionCard>
        ) : (
          filteredSamples.map((sample) => (
            <ReviewCard key={sample.id} sample={sample} />
          ))
        )}
      </div>
    </div>
  );
}
