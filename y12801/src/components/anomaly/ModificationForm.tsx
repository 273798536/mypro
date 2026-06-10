import { useState } from 'react';
import { Check, X, Clock, User, FileText, AlertTriangle } from 'lucide-react';
import type { AnomalyReview, CurrentUser } from '@/types';

interface ModificationFormProps {
  anomalyReview: AnomalyReview;
  currentUser: CurrentUser;
  onApprove: (id: string, opinion?: string) => void;
  onReject: (id: string, opinion?: string) => void;
}

const STATUS_CONFIG = {
  pending: { label: '待审批', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: '已通过', color: 'bg-teal-100 text-teal-800', icon: Check },
  rejected: { label: '已驳回', color: 'bg-red-100 text-red-800', icon: X },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ModificationForm({
  anomalyReview,
  currentUser,
  onApprove,
  onReject,
}: ModificationFormProps) {
  const [opinion, setOpinion] = useState('');
  const isSupervisor = currentUser.role === 'supervisor';
  const isPending = anomalyReview.approvalStatus === 'pending';
  const statusConfig = STATUS_CONFIG[anomalyReview.approvalStatus];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-800">异常复核审批</h3>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </span>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-500">操作人：</span>
              <span className="text-slate-800 font-medium">{anomalyReview.operator}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-500">操作时间：</span>
              <span className="text-slate-800 font-mono text-xs">{formatDateTime(anomalyReview.operatedAt)}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-500">修改原因：</span>
              <span className="text-slate-800">{anomalyReview.reason}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-500">变更样本：</span>
              <span className="font-mono text-xs text-slate-800">{anomalyReview.changedSamples.join('、')}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs font-medium text-slate-500 mb-3">修改时间线</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-xs">原结论</p>
                <p className="text-slate-700 diff-old line-through text-xs">{anomalyReview.oldConclusion}</p>
              </div>
            </div>
            <div className="ml-1 w-0.5 h-4 bg-slate-200" />
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-xs">修正结论</p>
                <p className="text-slate-700 diff-new underline text-xs">{anomalyReview.newConclusion}</p>
              </div>
            </div>
          </div>
        </div>

        {anomalyReview.approvalStatus !== 'pending' && anomalyReview.approver && (
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-medium text-slate-500 mb-2">审批信息</p>
            <div className="text-sm space-y-1">
              <p><span className="text-slate-500">审批人：</span><span className="text-slate-800">{anomalyReview.approver}</span></p>
              <p><span className="text-slate-500">审批时间：</span><span className="text-slate-800 font-mono text-xs">{anomalyReview.approvedAt ? formatDateTime(anomalyReview.approvedAt) : '-'}</span></p>
            </div>
          </div>
        )}

        {isPending && isSupervisor && (
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">审批意见（可选）</label>
              <textarea
                value={opinion}
                onChange={e => setOpinion(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                placeholder="请输入审批意见..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onApprove(anomalyReview.id, opinion || undefined)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 transition-colors"
              >
                <Check className="w-4 h-4" />
                审批通过
              </button>
              <button
                onClick={() => onReject(anomalyReview.id, opinion || undefined)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
                驳回
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
