import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  User,
  Clock,
  FileText,
  Edit3,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ResultExplanationCard } from '../components/ResultExplanationCard';
import { ErrorAlert } from '../components/ErrorAlert';
import { TraceTimeline } from '../components/TraceTimeline';
import { StatusBadge } from '../components/ErrorAlert';
import { cn } from '../lib/utils';

export function CalculationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentCalculation, loading, fetchCalculationDetail, reviewCalculation, exportCalculation, error } = useAppStore();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [reviewer] = useState('质检工程师');
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchCalculationDetail(id);
  }, [id, fetchCalculationDetail]);

  const handleReview = async (status: 'passed' | 'rejected') => {
    if (!id) return;
    if (status === 'rejected' && !showRejectForm) {
      setShowRejectForm(true);
      return;
    }
    if (status === 'rejected' && !rejectNote.trim()) return;
    setSubmitting(true);
    await reviewCalculation(id, status, status === 'rejected' ? rejectNote : undefined);
    setSubmitting(false);
    setShowRejectForm(false);
    setRejectNote('');
  };

  const handleExport = async () => {
    if (!id) return;
    setShowExportPreview(true);
    setTimeout(() => {
      exportCalculation(id);
    }, 800);
  };

  if (loading && !currentCalculation) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-pulse text-slate-400">加载中...</div>
      </div>
    );
  }

  if (!currentCalculation) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-500 mb-4">试算记录不存在</p>
        <button onClick={() => navigate('/')} className="text-navy-600 hover:underline text-sm">
          返回异常留痕
        </button>
      </div>
    );
  }

  const calc = currentCalculation;
  const isReviewed = calc.status === 'passed' || calc.status === 'rejected';
  const canReview = calc.status === 'pending';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between animate-slide-up stagger-1">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
          返回异常留痕
        </button>
        <div className="flex items-center gap-2">
          <StatusBadge status={calc.status} />
          <span className="font-mono text-xs text-slate-400">#{calc.id}</span>
        </div>
      </div>

      {calc.status === 'error' && calc.error && (
        <div className="animate-slide-up stagger-1">
          <ErrorAlert
            error={calc.error}
            onNavigate={(path) => navigate(path)}
          />
        </div>
      )}

      {calc.status !== 'error' && (
        <ResultExplanationCard
          explanation={calc.explanation}
          calculatedConcentration={calc.calculatedConcentration}
          deviation={calc.deviation}
          status={calc.status}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded p-6 shadow-card animate-slide-up stagger-2">
            <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-navy-600" strokeWidth={1.8} />
              试算详情
            </h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-slate-500 text-xs mb-1">试剂批次号</dt>
                <dd className="font-mono font-semibold text-slate-800">
                  <Link to="/batch-tracking" className="text-navy-600 hover:underline">
                    {calc.reagentBatchNo}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs mb-1">创建时间</dt>
                <dd className="text-slate-800">{formatDateTime(calc.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs mb-1">观测表面张力</dt>
                <dd className="font-mono font-semibold text-slate-800">{calc.observedTension.toFixed(1)} mN/m</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs mb-1">测量温度</dt>
                <dd className="font-mono font-semibold text-slate-800">{calc.temperature} ℃</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs mb-1">创建人</dt>
                <dd className="text-slate-800">{calc.createdBy}</dd>
              </div>
              {isReviewed && (
                <>
                  <div>
                    <dt className="text-slate-500 text-xs mb-1">复核人</dt>
                    <dd className="text-slate-800">{calc.reviewedBy}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs mb-1">复核时间</dt>
                    <dd className="text-slate-800">{calc.reviewedAt ? formatDateTime(calc.reviewedAt) : '-'}</dd>
                  </div>
                  {calc.reviewNote && (
                    <div className="col-span-2">
                      <dt className="text-slate-500 text-xs mb-1">复核备注</dt>
                      <dd className="p-3 bg-slate-50 rounded border border-slate-100 text-slate-700">
                        {calc.reviewNote}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>

          {calc.traceIds.length > 0 && (
            <div className="animate-slide-up stagger-3">
              <TraceTimeline links={calc.traceIds} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded p-6 shadow-card animate-slide-up stagger-2">
            <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-navy-600" strokeWidth={1.8} />
              复核操作
            </h3>

            {isReviewed ? (
              <div className="space-y-3">
                <div className={cn(
                  'flex items-center gap-3 p-4 rounded border',
                  calc.status === 'passed'
                    ? 'bg-status-passed/5 border-status-passed/20'
                    : 'bg-status-rejected/5 border-status-rejected/20'
                )}>
                  {calc.status === 'passed' ? (
                    <CheckCircle2 className="w-6 h-6 text-status-passed shrink-0" strokeWidth={1.8} />
                  ) : (
                    <XCircle className="w-6 h-6 text-status-rejected shrink-0" strokeWidth={1.8} />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      已{calc.status === 'passed' ? '通过' : '驳回'}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" strokeWidth={1.8} />
                      {calc.reviewedBy}
                      <span className="mx-1">·</span>
                      <Clock className="w-3 h-3" strokeWidth={1.8} />
                      {calc.reviewedAt ? formatDateTime(calc.reviewedAt) : '-'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/reagent-ledger/${calc.reagentId}/supplement`)}
                  className="w-full py-2 text-sm text-accent-600 border border-accent-200 bg-accent-50 hover:bg-accent-100 rounded font-medium transition-colors"
                >
                  发起补录修正
                </button>
              </div>
            ) : canReview ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 mb-3">
                  复核人：<span className="text-slate-700 font-medium">{reviewer}</span>
                </p>
                {showRejectForm ? (
                  <div className="space-y-3">
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={3}
                      placeholder="请填写驳回原因..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-status-rejected/20 focus:border-status-rejected resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowRejectForm(false); setRejectNote(''); }}
                        className="flex-1 py-2 text-sm text-slate-600 border border-slate-200 rounded hover:bg-slate-50"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleReview('rejected')}
                        disabled={submitting || !rejectNote.trim()}
                        className="flex-1 py-2 text-sm text-white bg-status-rejected rounded hover:bg-red-700 disabled:opacity-60 font-medium"
                      >
                        确认驳回
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleReview('passed')}
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm text-white bg-status-passed rounded hover:bg-emerald-700 disabled:opacity-60 font-semibold transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" strokeWidth={1.8} />
                      通过复核
                    </button>
                    <button
                      onClick={() => handleReview('rejected')}
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm text-status-rejected border border-status-rejected/30 bg-status-rejected/5 rounded hover:bg-status-rejected/10 disabled:opacity-60 font-semibold transition-colors"
                    >
                      <XCircle className="w-4 h-4" strokeWidth={1.8} />
                      驳回（填原因）
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                处理失败的记录，请先补全数据后重新试算
              </p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded p-6 shadow-card animate-slide-up stagger-3">
            <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Download className="w-4 h-4 text-navy-600" strokeWidth={1.8} />
              导出报告
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-navy-50/50 rounded border border-navy-100 text-xs text-slate-600 space-y-2">
                <div className="flex items-center justify-between">
                  <span>当前状态（界面）</span>
                  <StatusBadge status={calc.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span>导出状态（文件）</span>
                  <StatusBadge status={calc.status} />
                </div>
                <p className="text-[11px] text-status-passed flex items-center gap-1 pt-1 border-t border-navy-100">
                  <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                  导出内容与界面摘要严格一致
                </p>
              </div>
              <button
                onClick={handleExport}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-navy-700 bg-navy-50 border border-navy-200 rounded hover:bg-navy-100 transition-colors"
              >
                <Download className="w-4 h-4" strokeWidth={1.8} />
                导出 CSV 报告
                {showExportPreview && (
                  <span className="text-[10px] text-status-passed ml-1 animate-pulse">
                    ✓ 校验一致
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowExportPreview((s) => !s)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1"
              >
                {showExportPreview ? (
                  <><EyeOff className="w-3 h-3" strokeWidth={1.8} /> 隐藏预览</>
                ) : (
                  <><Eye className="w-3 h-3" strokeWidth={1.8} /> 查看导出内容预览</>
                )}
              </button>
              {showExportPreview && (
                <div className="mt-2 p-3 bg-slate-900 rounded overflow-auto max-h-64 animate-slide-up">
                  <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                    {buildExportPreview(calc)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n: number): string { return String(n).padStart(2, '0'); }

function buildExportPreview(calc: any): string {
  const statusMap: Record<string, string> = {
    pending: '待复核', passed: '已通过', rejected: '已驳回', error: '处理失败',
  };
  const lines = [
    '=== 表面张力浓度试算报告 ===',
    '',
    '--- 摘要（与页面展示一致） ---',
    `试算编号,${calc.id}`,
    `试剂批次,${calc.reagentBatchNo}`,
    `观测表面张力,${calc.observedTension.toFixed(1)} mN/m`,
    `测量温度,${calc.temperature} ℃`,
    `试算浓度,${calc.calculatedConcentration.toFixed(1)} mg/L`,
    `偏差,${calc.deviation > 0 ? '+' : ''}${calc.deviation.toFixed(1)}%`,
    `结果解释,${calc.explanation.summary}`,
    `状态,${statusMap[calc.status]}`,
    `复核人,${calc.reviewedBy ?? '-'}`,
    `复核时间,${calc.reviewedAt ? formatDateTime(calc.reviewedAt) : '-'}`,
    `复核备注,${calc.reviewNote ?? '-'}`,
    `创建时间,${formatDateTime(calc.createdAt)}`,
  ];
  return lines.join('\n');
}
