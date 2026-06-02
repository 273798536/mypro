import React, { useState } from 'react';
import {
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Hash,
  Edit3,
} from 'lucide-react';
import {
  ServiceRecord,
  Visitor,
  Appointment,
  Window,
  DataSupplement,
} from '../../types';
import { useSupplementStore, supplementEngine } from '../../engines/SupplementEngine';
import { useQueueStore } from '../../store/useQueueStore';
import { useExceptionStore, exceptionEngine } from '../../engines/ExceptionEngine';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface QueueTableProps {
  records: ServiceRecord[];
  visitors: Visitor[];
  appointments: Appointment[];
  windows: Window[];
}

const QueueTable: React.FC<QueueTableProps> = ({
  records,
  visitors,
  appointments,
  windows,
}) => {
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const { selectedRecordId, setSelectedRecordId, highlightedSupplementId } = useQueueStore();
  const exceptions = useExceptionStore((state) => state.exceptions);
  const supplements = useSupplementStore((state) => state.supplements);

  const getAppointment = (visitorId: string) =>
    appointments.find((a) => a.visitorId === visitorId);

  const getWindowName = (windowId: string) =>
    windows.find((w) => w.id === windowId)?.name || '-';

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      waiting: { label: '等待中', className: 'badge-warning', icon: <Clock size={12} /> },
      serving: { label: '办理中', className: 'badge bg-primary-50 text-primary-600', icon: <User size={12} /> },
      completed: { label: '已完成', className: 'badge-success', icon: <CheckCircle size={12} /> },
      left: { label: '已离开', className: 'badge-neutral', icon: <XCircle size={12} /> },
    };
    const info = statusMap[status] || statusMap.waiting;
    return (
      <span className={info.className}>
        <span className="mr-1">{info.icon}</span>
        {info.label}
      </span>
    );
  };

  const getRowClassName = (record: ServiceRecord, visitor: Visitor | undefined) => {
    const recordExceptions = exceptions.filter((e) => e.recordId === record.id || e.recordId === visitor?.id);
    const hasPendingException = recordExceptions.some((e) => e.status === 'pending');
    const hasConfirmedException = recordExceptions.some((e) => e.status === 'confirmed');
    const isHighlighted = highlightedSupplementId && supplements.some(
      (s) => s.id === highlightedSupplementId && s.affectedRecords.includes(record.id)
    );

    if (isHighlighted) return 'animate-pulse bg-warning-50/70';
    if (hasConfirmedException) return 'exception-row';
    if (hasPendingException) return 'pending-row';
    return '';
  };

  const hasSupplements = (recordId: string, visitorId: string) => {
    return supplements.some(
      (s) => s.recordId === recordId || s.recordId === visitorId || s.affectedRecords.includes(recordId)
    );
  };

  const getRecordExceptions = (record: ServiceRecord, visitor: Visitor | undefined) => {
    return exceptions.filter((e) =>
      e.recordId === record.id || e.recordId === visitor?.id || e.recordId === visitor?.id
    );
  };

  const getRecordSupplements = (record: ServiceRecord, visitor: Visitor | undefined) => {
    return supplements.filter(
      (s) =>
        s.recordId === record.id ||
        s.recordId === visitor?.id ||
        s.affectedRecords.includes(record.id)
    );
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="table-base">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-[60px]">序号</th>
              <th>姓名</th>
              <th>预约号</th>
              <th>到访时间</th>
              <th>窗口</th>
              <th>业务类型</th>
              <th>等待时长</th>
              <th>服务时长</th>
              <th>状态</th>
              <th className="w-[100px]">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => {
              const visitor = visitors.find((v) => v.id === record.visitorId);
              const appointment = getAppointment(record.visitorId);
              const hasSuppl = hasSupplements(record.id, record.visitorId);
              const recordExceptions = getRecordExceptions(record, visitor);
              const isExpanded = expandedRecordId === record.id;

              return (
                <React.Fragment key={record.id}>
                  <tr
                    className={`${getRowClassName(record, visitor)} cursor-pointer transition-all duration-200 ${
                      selectedRecordId === record.id ? 'bg-primary-50/50' : ''
                    }`}
                    onClick={() => {
                      setSelectedRecordId(record.id);
                      setExpandedRecordId(isExpanded ? null : record.id);
                    }}
                  >
                    <td className="text-neutral-400">{index + 1}</td>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        {visitor?.name || '-'}
                        {hasSuppl && (
                          <span
                            className="supplement-mark inline-block w-3 h-3"
                            title="存在补录数据"
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Hash size={12} className="text-neutral-400" />
                        {appointment?.appointmentNo || (
                          <span className="text-neutral-400">无预约</span>
                        )}
                        {appointment?.isSupplemented && (
                          <span className="text-xs text-warning-500">(补录)</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-neutral-400" />
                        {format(record.startTime, 'MM-dd HH:mm', { locale: zhCN })}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-sm">{getWindowName(record.windowId)}</span>
                    </td>
                    <td>{record.businessType}</td>
                    <td>{record.waitDuration} 分钟</td>
                    <td className={record.hasException ? 'text-danger-500 font-medium' : ''}>
                      {record.serviceDuration} 分钟
                    </td>
                    <td>{getStatusBadge(visitor?.status || 'waiting')}</td>
                    <td>
                      <button
                        className="p-1.5 rounded hover:bg-neutral-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRecordId(isExpanded ? null : record.id);
                        }}
                      >
                        <Eye size={16} className="text-neutral-500" />
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-neutral-50">
                      <td colSpan={10} className="p-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                              <User size={16} className="text-primary-500" />
                              基本信息
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-neutral-500">身份证号</span>
                                <span className="font-mono">{visitor?.idCard || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">来源渠道</span>
                                <span>{visitor?.sourceChannel === 'appointment' ? '预约' : visitor?.sourceChannel === 'online' ? '线上' : '现场取号'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">排队位置</span>
                                <span>第 {record.queuePosition} 位</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">办理结束时间</span>
                                <span>{record.endTime ? format(record.endTime, 'MM-dd HH:mm', { locale: zhCN }) : '-'}</span>
                              </div>
                            </div>

                            {record.originalJudgmentSnapshot && (
                              <div className="mt-4 p-3 bg-warning-50 rounded-md border border-warning-200">
                                <div className="flex items-start gap-2">
                                  <Edit3 size={14} className="text-warning-500 mt-0.5" />
                                  <div>
                                    <div className="text-xs text-warning-600 font-medium">原始判断快照</div>
                                    <div className="text-sm text-neutral-700 mt-1">
                                      {record.originalJudgmentSnapshot}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            {recordExceptions.length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                                  <AlertTriangle size={16} className="text-danger-500" />
                                  异常记录 ({recordExceptions.length})
                                </h4>
                                <div className="space-y-2">
                                  {recordExceptions.map((ex) => (
                                    <div
                                      key={ex.id}
                                      className={`p-3 rounded-md border ${
                                        ex.status === 'confirmed'
                                          ? 'bg-danger-50 border-danger-200'
                                          : ex.status === 'resolved'
                                          ? 'bg-success-50 border-success-200'
                                          : 'bg-warning-50 border-warning-200'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium">
                                          {exceptionEngine.getExceptionTypeLabel(ex.type)}
                                        </span>
                                        <span
                                          className={`text-xs ${
                                            ex.status === 'confirmed'
                                              ? 'text-danger-600'
                                              : ex.status === 'resolved'
                                              ? 'text-success-600'
                                              : 'text-warning-600'
                                          }`}
                                        >
                                          {exceptionEngine.getExceptionStatusLabel(ex.status)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-neutral-600">{ex.description}</p>
                                      {ex.originalJudgment && (
                                        <p className="text-xs text-neutral-500 mt-1 italic">
                                          原始判断：{ex.originalJudgment}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {getRecordSupplements(record, visitor).length > 0 && (
                              <div>
                                <h4 className="font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                                  <Edit3 size={16} className="text-warning-500" />
                                  补录记录
                                </h4>
                                <div className="space-y-2">
                                  {getRecordSupplements(record, visitor).map((supp) => (
                                    <SupplementRecordItem key={supp.id} supplement={supp} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {records.length === 0 && (
        <div className="py-16 text-center text-neutral-400">
          <div className="text-4xl mb-2">📋</div>
          <p>暂无符合条件的记录</p>
        </div>
      )}
    </div>
  );
};

const SupplementRecordItem: React.FC<{ supplement: DataSupplement }> = ({ supplement }) => {
  return (
    <div className="p-3 bg-warning-50 rounded-md border border-warning-200">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-warning-700">
          {supplementEngine.getSupplementFieldLabel(supplement.fieldName)}
        </span>
        <span className="text-xs text-neutral-500">
          {format(supplement.supplementTime, 'MM-dd HH:mm', { locale: zhCN })}
        </span>
      </div>
      <div className="text-xs text-neutral-600 flex items-center gap-2">
        <span className="line-through text-danger-500">{supplement.oldValue || '(空)'}</span>
        <span className="text-neutral-400">→</span>
        <span className="text-success-600 font-medium">{supplement.newValue}</span>
      </div>
      <div className="text-xs text-neutral-500 mt-1">
        操作人：{supplement.operator} | 影响 {supplement.affectedRecords.length} 条记录
      </div>
    </div>
  );
};

export default QueueTable;
