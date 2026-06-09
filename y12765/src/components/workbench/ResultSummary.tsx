import { CheckCircle, AlertTriangle, XCircle, Clock, History, Save, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVerificationStore } from '@/store/useVerificationStore';
import { computeSummary, statusLabel } from '@/utils/consistency';
import SafetyAlertBanner from '@/components/common/SafetyAlertBanner';
import RetestSuggestionList from '@/components/common/RetestSuggestionList';

function StatusBadge({ status }: { status: ReturnType<typeof computeSummary> }) {
  if (status.total === 0) {
    return <span className="chip bg-slate-100 text-slate-600"><Clock size={12} />待核验</span>;
  }
  if (status.failCount > 0) {
    return <span className="chip bg-fail-500 text-white"><XCircle size={12} />不合格</span>;
  }
  if (status.reviewCount > 0) {
    return <span className="chip bg-warn-500 text-white"><AlertTriangle size={12} />待工程师复核</span>;
  }
  return <span className="chip bg-pass-500 text-white"><CheckCircle size={12} />通过</span>;
}

export default function ResultSummary() {
  const { additiveItems, role, saveRecord, currentRecord } = useVerificationStore();
  const nav = useNavigate();
  const summary = computeSummary(additiveItems);
  const overallStatus = summary.failCount > 0 ? 'fail' : summary.reviewCount > 0 ? 'review' : summary.total > 0 ? 'pass' : 'pending';

  return (
    <div className="flex flex-col h-full gap-4 overflow-auto">
      <div className="card p-4">
        <div className="section-title !mb-2">核验结论摘要</div>
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={summary} />
          <div className="text-xs text-slate-500">
            当前身份：<span className="font-semibold text-slate-700">{role === 'engineer' ? '配方工程师' : '学生'}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center mb-3">
          <div className="bg-slate-50 rounded-md py-2">
            <div className="text-lg font-serif font-bold text-slate-800">{summary.total}</div>
            <div className="text-xs text-slate-500">总条目</div>
          </div>
          <div className="bg-pass-50 rounded-md py-2">
            <div className="text-lg font-serif font-bold text-pass-700">{summary.passCount}</div>
            <div className="text-xs text-slate-500">通过</div>
          </div>
          <div className="bg-warn-50 rounded-md py-2">
            <div className="text-lg font-serif font-bold text-warn-700">{summary.reviewCount}</div>
            <div className="text-xs text-slate-500">待复核</div>
          </div>
          <div className="bg-fail-50 rounded-md py-2">
            <div className="text-lg font-serif font-bold text-fail-700">{summary.failCount}</div>
            <div className="text-xs text-slate-500">不合格</div>
          </div>
        </div>
        <div className="text-xs text-slate-500 mb-3">
          {currentRecord
            ? <>最近保存：{currentRecord.batchNumber} · {currentRecord.createdAt} · {statusLabel(currentRecord.status)}</>
            : '尚未保存本次核验记录'}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={saveRecord}>
            <Save size={14} />保存记录
          </button>
          {role === 'student' && (
            <button className="btn-primary" onClick={() => nav('/result')}>
              学生结果页 <ArrowRight size={14} />
            </button>
          )}
          {role === 'engineer' && (
            <button className="btn-secondary" onClick={() => nav('/review')}>
              <History size={14} />复盘视图
            </button>
          )}
        </div>
        <div className="mt-3 text-xs text-slate-500 bg-slate-50 rounded p-2 border border-slate-200/70">
          🔒 导出前会自动校验：界面摘要判定 vs 重算结果必须一致；每条数据必须关联原始行号，否则拒绝导出。
          {overallStatus !== 'pending' && summary.reviewCount > 0 && role === 'student' && (
            <div className="mt-1 text-warn-700 font-medium">⚠ 学生请注意：存在橙色"需工程师复核"项，请勿直接用于生产放行。</div>
          )}
        </div>
      </div>

      <div>
        <div className="section-title">
          <AlertTriangle size={18} className="text-warn-600" />
          安全提示（核心稳定）
        </div>
        <SafetyAlertBanner />
      </div>

      <div>
        <div className="section-title">
          <History size={18} className="text-brand-700" />
          复测建议（核心稳定）
        </div>
        <RetestSuggestionList />
      </div>
    </div>
  );
}
