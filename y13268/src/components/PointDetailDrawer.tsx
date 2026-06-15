import { X, FileText, Calculator, History as HistoryIcon, MapPin } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { checkOverCapacity, formatCapacity, formatPercent, getSourceLabel, getSourceColorClass, formatDateTime, getStatusLabel } from '@/utils';
import { STATUS_LIST } from '@/types';

export default function PointDetailDrawer() {
  const { detailDrawerOpen, closeDetailDrawer, selectedPointId, points, getLedgerByPointId, getHistoryByPointId } = useAppStore();

  const point = points.find((p) => p.id === selectedPointId);
  const ledgerRecords = selectedPointId ? getLedgerByPointId(selectedPointId) : [];
  const historyLogs = selectedPointId ? getHistoryByPointId(selectedPointId) : [];

  if (!detailDrawerOpen || !point) return null;

  const capacityCheck = checkOverCapacity(point);
  const statusInfo = STATUS_LIST.find((s) => s.value === point.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={closeDetailDrawer}
      />
      <div className="relative w-full max-w-lg bg-white shadow-2xl animate-slide-in-right overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{point.name}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {point.community} · {point.address}
            </p>
          </div>
          <button
            onClick={closeDetailDrawer}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary-600" />
              本次计算口径
            </h3>
            <div className="bg-primary-50 border border-primary-100 rounded-sm p-4">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500">设计容量</p>
                  <p className="text-lg font-semibold font-mono text-gray-800">
                    {formatCapacity(point.capacity)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">容量上限</p>
                  <p className="text-lg font-semibold font-mono text-gray-800">
                    {formatCapacity(point.limit)}
                  </p>
                </div>
              </div>
              <div className="border-t border-primary-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">超限值</span>
                  <span
                    className={`font-mono font-medium ${
                      capacityCheck.isOver ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {capacityCheck.isOver ? '+' : ''}
                    {formatCapacity(capacityCheck.exceedValue)}
                    <span className="ml-2 text-sm">
                      ({capacityCheck.isOver ? '+' : ''}
                      {formatPercent(capacityCheck.exceedRatio)})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600">计算方式</span>
                  <span className="text-sm text-gray-500">
                    设计容量 - 变压器容量上限
                  </span>
                </div>
              </div>
              {capacityCheck.isOver && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-sm">
                  <p className="text-sm font-medium text-red-700 mb-2">下一步操作：</p>
                  <ol className="text-sm text-red-600 space-y-1 list-decimal list-inside">
                    {capacityCheck.nextSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-600" />
              审批台账（含原始字段）
            </h3>
            <div className="space-y-3">
              {ledgerRecords.length > 0 ? (
                ledgerRecords.map((record) => (
                  <div
                    key={record.id}
                    className="border border-gray-200 rounded-sm overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-sm ${getSourceColorClass(
                            record.source
                          )}`}
                        >
                          {record.sourceName}
                        </span>
                        <span className="text-xs text-gray-500">
                          导入：{formatDateTime(record.importTime)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-500 mb-2">原始字段：</p>
                      <div className="bg-gray-50 rounded-sm p-3 text-sm space-y-1">
                        {Object.entries(record.rawFields).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between gap-4"
                          >
                            <span className="text-gray-600 font-mono text-xs">
                              {key}
                            </span>
                            <span className="text-gray-800 font-medium text-right">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  暂无台账记录
                </p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-primary-600" />
              历史变更记录
            </h3>
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4">
                {historyLogs.length > 0 ? (
                  historyLogs.map((log) => (
                    <div key={log.id} className="relative pl-8">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-primary-500 border-2 border-white shadow" />
                      <div className="bg-gray-50 rounded-sm p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-800">
                            {log.actionName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(log.time)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          操作人：{log.operator}
                        </p>
                        {Object.keys(log.beforeData).length > 0 && (
                          <div className="text-xs space-y-1">
                            {Object.entries(log.beforeData).map(([key, value]) => {
                              const afterValue = log.afterData[key];
                              return (
                                <div
                                  key={key}
                                  className="flex items-center gap-2"
                                >
                                  <span className="text-gray-500">
                                    {key}：
                                  </span>
                                  <span className="line-through text-gray-400">
                                    {String(value)}
                                  </span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-green-600 font-medium">
                                    {String(afterValue)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                          原因：{log.reason}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4 pl-6">
                    暂无历史记录
                  </p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              当前处理状态
            </h3>
            <div className="flex items-center gap-3">
              <span className={`status-badge ${statusInfo?.className || ''}`}>
                {getStatusLabel(point.status)}
              </span>
              {point.assignee && (
                <span className="text-sm text-gray-500">
                  负责人：{point.assignee}
                </span>
              )}
            </div>
            {point.remark && (
              <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-sm">
                {point.remark}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
