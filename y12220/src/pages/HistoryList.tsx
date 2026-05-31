import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/utils/calculator';
import dayjs from 'dayjs';
import {
  History,
  Clock,
  User,
  CheckCircle,
  XCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RefreshCw,
  Plane,
  AlertTriangle,
  GitCommit,
  List,
  X,
} from 'lucide-react';
import Loading, { TableLoadingSkeleton } from '@/components/Loading';
import Empty from '@/components/Empty';
import { cn } from '@/lib/utils';
import type { RebookRecord, AuditLog } from '@/types';
import { getCabinName } from '@/utils/mockData';

type StatusFilter = 'all' | 'approved' | 'rejected' | 'settled';

export default function HistoryList() {
  const {
    rebookRecords,
    isLoading,
    initialize,
    loadRebookRecords,
    getAuditLogs,
  } = useStore();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState<string | null>(null);
  const [searchOrderNo, setSearchOrderNo] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [auditLogs, setAuditLogs] = useState<Record<string, AuditLog[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      await initialize();
      await loadRebookRecords();
      setTimeout(() => setIsPageLoading(false), 500);
    };
    init();
  }, [initialize, loadRebookRecords]);

  const filteredRecords = useMemo(() => {
    let records = rebookRecords.filter(
      (r) => r.status !== 'draft' && r.status !== 'pending'
    );

    if (statusFilter !== 'all') {
      records = records.filter((r) => r.status === statusFilter);
    }

    if (searchOrderNo) {
      records = records.filter((r) =>
        r.orderNo.toLowerCase().includes(searchOrderNo.toLowerCase())
      );
    }

    return records.sort(
      (a, b) =>
        dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
    );
  }, [rebookRecords, statusFilter, searchOrderNo]);

  const loadAuditLogs = async (recordId: string) => {
    if (auditLogs[recordId]) {
      setShowTimeline(showTimeline === recordId ? null : recordId);
      return;
    }

    setLoadingLogs(recordId);
    try {
      const logs = await getAuditLogs(recordId);
      setAuditLogs((prev) => ({ ...prev, [recordId]: logs }));
      setShowTimeline(recordId);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoadingLogs(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      approved: {
        label: '已通过',
        className: 'bg-accent-green-100 text-accent-green-700',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      rejected: {
        label: '已驳回',
        className: 'bg-accent-red-100 text-accent-red-700',
        icon: <XCircle className="w-3 h-3" />,
      },
      settled: {
        label: '已结算',
        className: 'bg-primary-100 text-primary-700',
        icon: <CheckCircle className="w-3 h-3" />,
      },
    };
    return statusMap[status] || statusMap.approved;
  };

  if (isPageLoading || isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-primary-800 mb-6">历史记录</h1>
        <TableLoadingSkeleton rows={8} columns={5} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">历史记录</h1>
          <p className="text-sm text-primary-500 mt-1">
            查看所有改签历史记录和操作日志
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
            <input
              type="text"
              placeholder="搜索订单号..."
              value={searchOrderNo}
              onChange={(e) => setSearchOrderNo(e.target.value)}
              className="pl-10 pr-4 py-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm w-48"
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-primary-200 rounded-lg p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                statusFilter === 'all'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-primary-600 hover:bg-primary-50'
              )}
            >
              全部
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                statusFilter === 'approved'
                  ? 'bg-accent-green-100 text-accent-green-700 font-medium'
                  : 'text-primary-600 hover:bg-primary-50'
              )}
            >
              通过
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                statusFilter === 'rejected'
                  ? 'bg-accent-red-100 text-accent-red-700 font-medium'
                  : 'text-primary-600 hover:bg-primary-50'
              )}
            >
              驳回
            </button>
            <button
              onClick={() => setStatusFilter('settled')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                statusFilter === 'settled'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-primary-600 hover:bg-primary-50'
              )}
            >
              已结算
            </button>
          </div>
          <button
            onClick={() => loadRebookRecords()}
            className="p-2 text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
        {filteredRecords.length === 0 ? (
          <Empty
            title="暂无历史记录"
            description="当前没有已处理的改签记录"
            icon={<History className="w-12 h-12" />}
          />
        ) : (
          <div className="divide-y divide-primary-100">
            {filteredRecords.map((record) => {
              const status = getStatusBadge(record.status);
              const logs = auditLogs[record.id];

              return (
                <div key={record.id}>
                  <div
                    className={cn(
                      'px-5 py-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-primary-50 transition-colors cursor-pointer',
                      expandedId === record.id && 'bg-primary-50'
                    )}
                    onClick={() =>
                      setExpandedId(expandedId === record.id ? null : record.id)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-primary-800">
                          {record.orderNo}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
                            status.className
                          )}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                        {record.anomalies.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-amber-100 text-accent-amber-700">
                            <AlertTriangle className="w-3 h-3" />
                            {record.anomalies.length} 异常
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-primary-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          操作人: {record.createdBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Plane className="w-3.5 h-3.5" />
                          {record.newSegments.length} 航段
                        </span>
                        {record.reviewedBy && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            审核人: {record.reviewedBy}
                          </span>
                        )}
                      </div>
                      {record.reviewComment && (
                        <p className="text-xs text-primary-500 mt-1 bg-primary-50 inline-block px-2 py-1 rounded">
                          审核意见: {record.reviewComment}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-primary-500">差价</p>
                        <p
                          className={cn(
                            'font-semibold',
                            record.totalDifference >= 0
                              ? 'text-accent-red-600'
                              : 'text-accent-green-600'
                          )}
                        >
                          {record.totalDifference >= 0 ? '+' : ''}
                          {formatCurrency(record.totalDifference)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadAuditLogs(record.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                        >
                          <GitCommit className="w-4 h-4" />
                          操作日志
                        </button>
                        {expandedId === record.id ? (
                          <ChevronUp className="w-5 h-5 text-primary-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-primary-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedId === record.id && (
                    <div className="px-5 pb-5 border-t border-primary-100 bg-primary-50/50">
                      <div className="pt-4">
                        <VersionTimeline record={record} />
                      </div>
                    </div>
                  )}

                  {showTimeline === record.id && (
                    <div className="px-5 pb-5 border-t border-primary-100 bg-primary-50/50">
                      <div className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-primary-700 flex items-center gap-2">
                            <List className="w-4 h-4" />
                            操作日志
                          </h4>
                          <button
                            onClick={() => setShowTimeline(null)}
                            className="p-1 text-primary-400 hover:text-primary-600 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {loadingLogs === record.id ? (
                          <Loading text="加载日志中..." size="sm" />
                        ) : logs && logs.length > 0 ? (
                          <div className="space-y-3">
                            {logs.map((log) => (
                              <div
                                key={log.id}
                                className="flex gap-3 p-3 bg-white rounded-lg border border-primary-100"
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-primary-800">
                                      {log.action}
                                    </span>
                                    <span className="text-xs text-primary-500 flex-shrink-0">
                                      {dayjs(log.timestamp).format(
                                        'YYYY-MM-DD HH:mm:ss'
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-xs text-primary-500 mt-0.5">
                                    操作人: {log.operator}
                                  </p>
                                  {log.newValue && (
                                    <p className="text-xs text-primary-600 mt-1 bg-primary-50 p-2 rounded">
                                      {log.newValue}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Empty
                            title="暂无操作日志"
                            description="该记录暂无操作日志"
                            className="py-8"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function VersionTimeline({ record }: { record: RebookRecord }) {
  const events = useMemo(() => {
    const result: Array<{
      time: string;
      title: string;
      description: string;
      operator?: string;
      type: 'create' | 'submit' | 'review' | 'settle';
    }> = [];

    result.push({
      time: record.createdAt,
      title: '创建改签记录',
      description: `订单 ${record.orderNo} 改签记录已创建`,
      operator: record.createdBy,
      type: 'create',
    });

    if (record.submittedAt) {
      result.push({
        time: record.submittedAt,
        title: '提交复核',
        description: '改签记录已提交，等待审核',
        operator: record.createdBy,
        type: 'submit',
      });
    }

    if (record.reviewedAt && record.reviewedBy) {
      result.push({
        time: record.reviewedAt,
        title: record.status === 'approved' ? '审核通过' : '审核驳回',
        description: record.reviewComment || '无审核意见',
        operator: record.reviewedBy,
        type: 'review',
      });
    }

    if (record.settledAt) {
      result.push({
        time: record.settledAt,
        title: '已结算',
        description: `差价 ${formatCurrency(record.totalDifference)} 已结算完成`,
        operator: record.reviewedBy,
        type: 'settle',
      });
    }

    return result.sort(
      (a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf()
    );
  }, [record]);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      create: 'bg-primary-500',
      submit: 'bg-accent-amber-500',
      review: 'bg-accent-green-500',
      settle: 'bg-primary-700',
    };
    return colors[type] || 'bg-primary-500';
  };

  const getTypeBg = (type: string) => {
    const colors: Record<string, string> = {
      create: 'bg-primary-100 text-primary-700',
      submit: 'bg-accent-amber-100 text-accent-amber-700',
      review: 'bg-accent-green-100 text-accent-green-700',
      settle: 'bg-primary-100 text-primary-700',
    };
    return colors[type] || 'bg-primary-100 text-primary-700';
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-primary-700 mb-4 flex items-center gap-2">
        <GitCommit className="w-4 h-4" />
        版本时间轴
      </h4>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary-200" />
          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={index} className="relative pl-10">
                <div
                  className={cn(
                    'absolute left-2.5 w-3 h-3 rounded-full border-2 border-white',
                    getTypeColor(event.type)
                  )}
                />
                <div
                  className={cn(
                    'p-3 rounded-lg border',
                    getTypeBg(event.type)
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold">
                      {event.title}
                    </span>
                    <span className="text-xs opacity-80 flex-shrink-0">
                      {dayjs(event.time).format('HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 mb-1">{event.description}</p>
                  {event.operator && (
                    <p className="text-xs opacity-70">
                      操作人: {event.operator}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-primary-100">
          <h5 className="text-sm font-semibold text-primary-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            差价明细
          </h5>
          <div className="space-y-2">
            {record.calculationDetails.map((detail) => (
              <div
                key={detail.id}
                className="flex items-center justify-between py-2 border-b border-primary-100 last:border-0"
              >
                <span className="text-sm text-primary-700">{detail.item}</span>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      detail.difference >= 0
                        ? 'text-accent-red-600'
                        : 'text-accent-green-600'
                    )}
                  >
                    {detail.difference >= 0 ? '+' : ''}
                    {formatCurrency(detail.difference)}
                  </p>
                  <p className="text-xs text-primary-400">
                    {formatCurrency(detail.originalAmount)} →{' '}
                    {formatCurrency(detail.newAmount)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-primary-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-primary-800">
                应收差价合计
              </span>
              <span
                className={cn(
                  'text-lg font-bold',
                  record.totalDifference >= 0
                    ? 'text-accent-red-600'
                    : 'text-accent-green-600'
                )}
              >
                {record.totalDifference >= 0 ? '+' : ''}
                {formatCurrency(record.totalDifference)}
              </span>
            </div>
          </div>

          {record.anomalies.length > 0 && (
            <div className="mt-4 pt-4 border-t border-primary-200">
              <h5 className="text-sm font-semibold text-primary-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent-amber-500" />
                异常项
              </h5>
              <div className="space-y-2">
                {record.anomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="p-2 bg-accent-amber-50 border border-accent-amber-200 rounded text-xs text-accent-amber-800"
                  >
                    {anomaly.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.explanations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-primary-200">
              <h5 className="text-sm font-semibold text-primary-700 mb-2">
                异常解释
              </h5>
              <div className="space-y-2">
                {record.explanations.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-2 bg-primary-50 rounded text-xs"
                  >
                    <p className="text-primary-600">{exp.content}</p>
                    <p className="text-primary-400 mt-1">
                      — {exp.explainedBy} @{' '}
                      {dayjs(exp.createdAt).format('YYYY-MM-DD HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
