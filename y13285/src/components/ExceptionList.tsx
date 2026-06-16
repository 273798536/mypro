import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  FileText,
  AlertOctagon,
  Users,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ExceptionTypeBadge } from './StatusBadge';

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusConfig = {
  pending: { label: '待确认', color: 'bg-orange-100 text-orange-700' },
  confirmed: { label: '已确认', color: 'bg-green-100 text-green-700' },
  skipped: { label: '已跳过', color: 'bg-gray-100 text-gray-700' },
};

export function ExceptionList() {
  const { exceptions, ledgers, confirmException, skipException } = useStore();

  const getLedgerDetails = (ledgerIds: string[]) => {
    return ledgers.filter((l) => ledgerIds.includes(l.id));
  };

  const getExceptionIcon = (type: string) => {
    return type === 'old_override_new' ? <AlertOctagon size={20} /> : <Users size={20} />;
  };

  if (exceptions.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-sm font-medium text-gray-900">暂无异常</h3>
        <p className="mt-1 text-sm text-gray-500">所有审批台账已正常归并，无待确认异常</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exceptions.map((exception) => {
        const relatedLedgers = getLedgerDetails(exception.ledgerIds);
        const config = statusConfig[exception.status];

        return (
          <div
            key={exception.id}
            className={`border rounded-lg overflow-hidden transition-all ${
              exception.status === 'pending'
                ? 'border-orange-300 bg-orange-50/30 shadow-sm'
                : exception.status === 'confirmed'
                ? 'border-green-200 bg-green-50/30'
                : 'border-gray-200 bg-gray-50/30'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`flex-shrink-0 p-2 rounded-lg ${
                      exception.status === 'pending'
                        ? 'bg-orange-100 text-orange-600'
                        : exception.status === 'confirmed'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {getExceptionIcon(exception.exceptionType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ExceptionTypeBadge type={exception.exceptionType} />
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(exception.createdAt)}
                      </span>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="bg-white rounded-lg p-3 border border-orange-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-orange-800 mb-1">待确认原因</p>
                            <p className="text-sm text-gray-700">{exception.reason}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-blue-800 mb-1">影响范围</p>
                            <p className="text-sm text-gray-700">{exception.impactScope}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={14} className="text-gray-500" />
                          <p className="text-xs font-medium text-gray-700">关联审批记录（{relatedLedgers.length}条）</p>
                        </div>
                        <div className="space-y-2">
                          {relatedLedgers.map((ledger) => (
                            <div
                              key={ledger.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-800">{ledger.projectName}</span>
                                <span className="text-gray-500">{ledger.street}</span>
                                <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                                  {ledger.schemeVersion}
                                </span>
                              </div>
                              <span className="text-gray-400">{ledger.approvalDate}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {exception.exceptionType === 'same_street_complaints' && exception.status === 'pending' && (
                        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                          <p className="text-xs font-medium text-yellow-800">
                            ⚠️ 同一街口出现两条投诉，是否归并？请人工确认后操作，系统不会自动吞成一条。
                          </p>
                        </div>
                      )}

                      {exception.exceptionType === 'old_override_new' && exception.status === 'pending' && (
                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                          <p className="text-xs font-medium text-red-800">
                            ⚠️ 检测到旧方案覆盖新意见，系统不自动算完，请人工确认原因和影响范围后再决定。
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {exception.status === 'pending' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => confirmException(exception.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors shadow-sm"
                    >
                      <CheckCircle size={14} />
                      确认归并
                    </button>
                    <button
                      onClick={() => skipException(exception.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <XCircle size={14} />
                      跳过
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
