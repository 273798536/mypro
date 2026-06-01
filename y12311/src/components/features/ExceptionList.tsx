import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Exception, ExceptionStatus, ExceptionType } from '../../types';
import { exceptionEngine } from '../../engines/ExceptionEngine';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ExceptionListProps {
  exceptions: Exception[];
  onUpdateStatus: (id: string, status: ExceptionStatus, remark?: string) => void;
  onBatchUpdate?: (ids: string[], status: ExceptionStatus) => void;
}

const ExceptionList: React.FC<ExceptionListProps> = ({
  exceptions,
  onUpdateStatus,
  onBatchUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<ExceptionStatus>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tabs = [
    { status: 'pending' as const, label: '待确认', icon: Clock, color: 'warning' },
    { status: 'confirmed' as const, label: '异常', icon: AlertTriangle, color: 'danger' },
    { status: 'resolved' as const, label: '已处理', icon: CheckCircle, color: 'success' },
  ];

  const filteredExceptions = exceptions.filter((e) => e.status === activeTab);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredExceptions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExceptions.map((e) => e.id)));
    }
  };

  const handleBatchConfirm = () => {
    if (onBatchUpdate && selectedIds.size > 0) {
      onBatchUpdate(Array.from(selectedIds), 'confirmed');
      setSelectedIds(new Set());
    }
  };

  const handleBatchResolve = () => {
    if (onBatchUpdate && selectedIds.size > 0) {
      onBatchUpdate(Array.from(selectedIds), 'resolved');
      setSelectedIds(new Set());
    }
  };

  const getTypeIcon = (type: ExceptionType) => {
    const icons = {
      missed_appointment: <XCircle size={16} />,
      abnormal_duration: <AlertCircle size={16} />,
      window_pause: <Clock size={16} />,
    };
    return icons[type];
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-neutral-100 text-neutral-600',
      medium: 'bg-warning-50 text-warning-600',
      high: 'bg-danger-50 text-danger-600',
    };
    return colors[severity as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const count = exceptions.filter((e) => e.status === tab.status).length;
            return (
              <button
                key={tab.status}
                onClick={() => {
                  setActiveTab(tab.status);
                  setSelectedIds(new Set());
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                  activeTab === tab.status
                    ? `bg-${tab.color}-50 text-${tab.color}-600 font-medium`
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                <span className="badge-neutral text-xs">{count}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'pending' && selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500">
              已选择 {selectedIds.size} 项
            </span>
            <button onClick={handleBatchConfirm} className="btn-warning text-sm">
              批量确认
            </button>
            <button onClick={handleBatchResolve} className="btn-success text-sm">
              批量处理
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-[40px]">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredExceptions.length && filteredExceptions.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                />
              </th>
              <th>类型</th>
              <th>严重程度</th>
              <th>描述</th>
              <th>发现时间</th>
              <th>操作人</th>
              <th>原始判断</th>
              <th className="w-[120px]">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredExceptions.map((exception) => {
              const isExpanded = expandedId === exception.id;
              const isSelected = selectedIds.has(exception.id);

              return (
                <React.Fragment key={exception.id}>
                  <tr
                    className={`cursor-pointer transition-colors ${
                      exception.severity === 'high' ? 'bg-danger-50/30' : ''
                    } ${isSelected ? 'bg-primary-50/50' : ''}`}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(exception.id)}
                        className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-primary-500">{getTypeIcon(exception.type)}</span>
                        <span className="font-medium">
                          {exceptionEngine.getExceptionTypeLabel(exception.type)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getSeverityColor(exception.severity)}`}>
                        {exceptionEngine.getExceptionSeverityLabel(exception.severity)}
                      </span>
                    </td>
                    <td className="max-w-xs truncate" title={exception.description}>
                      {exception.description}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar size={12} className="text-neutral-400" />
                        {format(exception.createdAt, 'MM-dd HH:mm', { locale: zhCN })}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-sm">
                        <User size={12} className="text-neutral-400" />
                        {exception.handler || '-'}
                      </div>
                    </td>
                    <td className="max-w-[150px] truncate text-sm text-neutral-500">
                      {exception.originalJudgment || '-'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {activeTab === 'pending' && (
                          <>
                            <button
                              onClick={() => onUpdateStatus(exception.id, 'confirmed')}
                              className="p-1.5 rounded hover:bg-warning-100 text-warning-500 transition-colors"
                              title="确认异常"
                            >
                              <AlertTriangle size={14} />
                            </button>
                            <button
                              onClick={() => onUpdateStatus(exception.id, 'resolved')}
                              className="p-1.5 rounded hover:bg-success-100 text-success-500 transition-colors"
                              title="标记已处理"
                            >
                              <CheckCircle size={14} />
                            </button>
                          </>
                        )}
                        {activeTab === 'confirmed' && (
                          <button
                            onClick={() => onUpdateStatus(exception.id, 'resolved')}
                            className="p-1.5 rounded hover:bg-success-100 text-success-500 transition-colors"
                            title="标记已处理"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : exception.id)}
                          className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-neutral-50">
                      <td colSpan={8} className="p-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-neutral-700 mb-2">异常详情</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-neutral-500">异常ID</span>
                                <span className="font-mono">{exception.id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">关联记录ID</span>
                                <span className="font-mono">{exception.recordId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">确认时间</span>
                                <span>
                                  {exception.confirmedAt
                                    ? format(exception.confirmedAt, 'MM-dd HH:mm', { locale: zhCN })
                                    : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">处理时间</span>
                                <span>
                                  {exception.resolvedAt
                                    ? format(exception.resolvedAt, 'MM-dd HH:mm', { locale: zhCN })
                                    : '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-neutral-700 mb-2">处理备注</h4>
                            {exception.remark ? (
                              <p className="text-sm text-neutral-600 p-3 bg-neutral-100 rounded-md">
                                {exception.remark}
                              </p>
                            ) : (
                              <p className="text-sm text-neutral-400">暂无备注</p>
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

      {filteredExceptions.length === 0 && (
        <div className="py-16 text-center text-neutral-400">
          <AlertCircle size={48} className="mx-auto mb-2 opacity-50" />
          <p>暂无{exceptionEngine.getExceptionStatusLabel(activeTab)}的异常记录</p>
        </div>
      )}
    </div>
  );
};

export default ExceptionList;
