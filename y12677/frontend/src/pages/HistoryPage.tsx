import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useStore';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import type { ChangeDetail, HistoryRecord } from '../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

const FIELD_LABELS: Record<string, string> = {
  'status': '记录状态',
  'conclusion': '分析结论',
  'updatedAt': '更新时间',
  'timeParameters.startTime': '起始时间',
  'timeParameters.endTime': '结束时间',
  'timeParameters.samplingInterval': '采样间隔(秒)',
  'unitConversionError.hasError': '存在单位换算错误',
  'unitConversionError.description': '错误描述'
};

function formatFieldValue(field: string, val: any): string {
  if (field === 'status') {
    const statusMap: Record<string, string> = { pending: '待复核', reviewed: '已复核', approved: '已通过' };
    return statusMap[String(val)] || String(val);
  }
  if (field === 'unitConversionError.hasError') {
    return val ? '是' : '否';
  }
  if (field.includes('Time') && typeof val === 'string') {
    try {
      return formatDate(val);
    } catch {
      return String(val);
    }
  }
  if (val === '' || val === null || val === undefined) return '(空)';
  return String(val);
}

function ChangeItem({ change }: { change: ChangeDetail }) {
  const label = FIELD_LABELS[change.field] || change.field;
  const isStatusOrConclusion = change.field === 'status' || change.field === 'conclusion';

  return (
    <div className={`p-3 rounded-lg border ${
      isStatusOrConclusion ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-border-light'
    }`}>
      <p className="text-xs font-medium text-text-dark mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-gray">原值</p>
          <p className="text-sm text-text-dark line-through truncate">
            {formatFieldValue(change.field, change.oldValue)}
          </p>
        </div>
        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-primary">新值</p>
          <p className="text-sm font-medium text-primary truncate">
            {formatFieldValue(change.field, change.newValue)}
          </p>
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ record, isFirst }: { record: HistoryRecord; isFirst: boolean }) {
  return (
    <div className="relative pl-10">
      <div className={`absolute left-3 top-2 w-6 h-6 rounded-full flex items-center justify-center ${
        isFirst ? 'bg-primary ring-4 ring-primary/20' : 'bg-gray-300'
      }`}>
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}
            d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="absolute left-[1.6rem] top-8 bottom-0 w-0.5 bg-border-light"></div>

      <div className="bg-white rounded-xl shadow-sm border border-border-light overflow-hidden">
        <div className="px-5 py-3 border-b border-border-light bg-gray-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-sm">
              {record.modifier.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-text-dark">{record.modifier}</p>
              <p className="text-xs text-text-gray">{formatDate(record.modifiedAt)}</p>
            </div>
          </div>
          {isFirst && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              最新修改
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          {record.modificationReason && (
            <div>
              <p className="text-xs text-text-gray mb-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                修改原因
              </p>
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                <p className="text-sm text-text-dark">{record.modificationReason}</p>
              </div>
            </div>
          )}

          {record.changes && record.changes.length > 0 && (
            <div>
              <p className="text-xs text-text-gray mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                修改内容（{record.changes.filter(c => c.field !== 'updatedAt').length} 项）
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {record.changes
                  .filter(c => c.field !== 'updatedAt')
                  .map(c => (
                    <ChangeItem key={c.field} change={c} />
                  ))}
              </div>
            </div>
          )}

          {record.processingOpinion && (
            <div>
              <p className="text-xs text-text-gray mb-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                处理意见
              </p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-text-dark whitespace-pre-wrap">{record.processingOpinion}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { history, loading, error, currentRecord, fetchHistory, fetchRecord, clearCurrent } = useAppStore();

  useEffect(() => {
    if (id) {
      fetchRecord(id);
      fetchHistory(id);
    }
    return () => clearCurrent();
  }, [id, fetchHistory, fetchRecord, clearCurrent]);

  if (loading && history.length === 0) return <Loading message="加载历史记录..." />;
  if (error && history.length === 0) return <ErrorAlert message={error} onRetry={() => id && fetchHistory(id)} />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-dark mb-1">修改历史</h1>
          <p className="text-text-gray text-sm">
            记录编号：{currentRecord?.id || id} · 共 {history.length} 条历史
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/record/${id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border-light bg-white text-text-dark rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 19l-7-7 7-7" />
            </svg>
            返回详情
          </Link>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-light p-12 text-center">
          <svg className="w-14 h-14 mx-auto text-text-gray/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-text-dark font-medium mb-1">暂无修改历史</p>
          <p className="text-text-gray text-sm mb-4">该记录尚未被修改或审核过</p>
          <Link
            to={`/record/${id}/correct`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-warning text-white rounded-lg text-sm hover:bg-warning-light transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            去修正参数
          </Link>
        </div>
      ) : (
        <div className="space-y-4 pb-6">
          {history.map((h, idx) => (
            <HistoryCard key={h.id} record={h} isFirst={idx === 0} />
          ))}
        </div>
      )}

      {currentRecord && (
        <div className="mt-6 bg-info-bg rounded-xl p-4 border border-primary/10">
          <p className="text-xs text-text-gray mb-1">顺着异常往回查（当前状态）</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-text-gray">记录状态：</span>
              <span className="font-medium text-text-dark">
                {{ pending: '待复核', reviewed: '已复核', approved: '已通过' }[currentRecord.status]}
              </span>
            </div>
            <div>
              <span className="text-text-gray">单位换算错误：</span>
              <span className={`font-medium ${currentRecord.unitConversionError.hasError ? 'text-warning' : 'text-green-600'}`}>
                {currentRecord.unitConversionError.hasError ? '存在' : '无'}
              </span>
            </div>
            <div className="flex-1 min-w-[200px]">
              <span className="text-text-gray">当前结论：</span>
              <span className="font-medium text-text-dark">{currentRecord.conclusion}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
