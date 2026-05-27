import { useState } from 'react';
import { useRebateStore } from '../store/rebateStore';
import { RefreshCw, Check, ChevronDown, ChevronUp, Clock, User, MapPin } from 'lucide-react';

export default function Details() {
  const { rebateResults, contracts, salesAssignments, ptPackages, recalculateRebate, confirmRebate, auditLogs } = useRebateStore();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      normal: 'bg-blue-100 text-blue-700',
      warning: 'bg-amber-100 text-amber-700',
      disputed: 'bg-rose-100 text-rose-700',
      confirmed: 'bg-emerald-100 text-emerald-700',
    };
    const labels: Record<string, string> = {
      normal: '正常',
      warning: '警告',
      disputed: '争议',
      confirmed: '已确认',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getWarningIcon = (type: string) => {
    const icons: Record<string, string> = {
      sales_change: '👤',
      cross_month_refund: '📅',
      pt_split: '✂️',
      transfer: '🔄',
      invalid_data: '❌',
    };
    return icons[type] || '⚠️';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">返利明细</h1>
          <p className="text-slate-500 mt-1">查看所有返利记录、归属版本和修正痕迹</p>
        </div>
        <button
          onClick={() => recalculateRebate()}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4a75] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          全部重算
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  合同信息
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  销售/门店
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  合同金额
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  基础返利
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  调整
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  最终返利
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rebateResults.map((result) => {
                const contract = contracts.find((c) => c.id === result.contractId);
                const isExpanded = expandedRow === result.id;
                const assignmentVersions = salesAssignments.filter((a) => a.contractId === result.contractId);
                const packageInfo = ptPackages.find((p) => p.contractId === result.contractId);
                const relatedAuditLogs = auditLogs.filter((log) => log.entityId === result.id || log.entityId === result.contractId);

                return (
                  <>
                    <tr
                      key={result.id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        result.status === 'disputed' ? 'bg-rose-50/50' : result.status === 'warning' ? 'bg-amber-50/50' : ''
                      }`}
                      onClick={() => setExpandedRow(isExpanded ? null : result.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                            <span className="font-semibold text-slate-600 text-sm">
                              {contract?.memberName?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{contract?.memberName || '-'}</p>
                            <p className="text-xs text-slate-500">{result.contractId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{result.salesName}</p>
                          <p className="text-xs text-slate-500">{result.storeName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-800">
                        ¥{result.baseAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        ¥{result.rebateAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={result.adjustmentAmount < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {result.adjustmentAmount >= 0 ? '+' : ''}¥{result.adjustmentAmount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-slate-800">¥{result.finalAmount.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(result.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {result.status !== 'confirmed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmRebate(result.id);
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="确认"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="space-y-4">
                            {result.warnings.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">异常提示</h4>
                                <div className="flex flex-wrap gap-2">
                                  {result.warnings.map((warning, idx) => (
                                    <div
                                      key={idx}
                                      className={`px-3 py-2 rounded-lg text-sm ${
                                        warning.severity === 'high'
                                          ? 'bg-rose-100 text-rose-700'
                                          : warning.severity === 'medium'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-blue-100 text-blue-700'
                                      }`}
                                    >
                                      <span className="mr-1">{getWarningIcon(warning.type)}</span>
                                      {warning.message}
                                      <div className="text-xs mt-1 opacity-80">
                                        {warning.type === 'sales_change' && (
                                          <>当前销售: {warning.details.currentSales}，之前: {warning.details.previousSales}</>
                                        )}
                                        {warning.type === 'cross_month_refund' && (
                                          <>合同月份: {warning.details.contractMonth}，退款月份: {warning.details.refundMonth}</>
                                        )}
                                        {warning.type === 'pt_split' && (
                                          <>拆分比例: {Object.entries(warning.details.splitRatio || {}).map(([k, v]) => `${k}:${(v as number) * 100}%`).join(', ')}</>
                                        )}
                                        {warning.type === 'transfer' && (
                                          <>{warning.details.fromStore} → {warning.details.toStore}</>
                                        )}
                                        {warning.type === 'invalid_data' && (
                                          <>问题: {warning.details.phone || warning.details.amount}</>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {assignmentVersions.length > 1 && (
                              <div>
                                <button
                                  className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2 hover:text-slate-900"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedVersions(expandedVersions === result.id ? null : result.id);
                                  }}
                                >
                                  <Clock className="w-4 h-4" />
                                  销售归属版本 ({assignmentVersions.length}个版本)
                                  {expandedVersions === result.id ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                                {expandedVersions === result.id && (
                                  <div className="pl-6 space-y-2 border-l-2 border-slate-200">
                                    {assignmentVersions
                                      .sort((a, b) => b.version - a.version)
                                      .map((version) => (
                                        <div
                                          key={version.id}
                                          className={`p-3 rounded-lg ${
                                            version.isActive ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <User className="w-4 h-4 text-slate-500" />
                                              <span className="font-medium">{version.salesName}</span>
                                              {version.isActive && (
                                                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-700 text-xs rounded-full">
                                                  当前
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-xs text-slate-500">版本 {version.version}</span>
                                          </div>
                                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                              <MapPin className="w-3 h-3" />
                                              生效日期: {version.effectiveDate}
                                            </span>
                                            {version.changeReason && (
                                              <span>变更原因: {version.changeReason}</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {packageInfo && packageInfo.isSplit && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">私教包拆分信息</h4>
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="font-medium text-slate-800">{packageInfo.packageName}</p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    课时: {packageInfo.usedSessions}/{packageInfo.totalSessions} · 
                                    金额: ¥{packageInfo.totalAmount}
                                  </p>
                                  <div className="flex gap-4 mt-2 text-xs text-slate-600">
                                    {Object.entries(packageInfo.splitRatio).map(([salesId, ratio]) => {
                                      const salesName = salesAssignments.find((a) => a.salesId === salesId)?.salesName || salesId;
                                      return (
                                        <span key={salesId}>
                                          {salesName}: {(ratio as number * 100).toFixed(0)}%
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            {relatedAuditLogs.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">修正痕迹</h4>
                                <div className="space-y-2">
                                  {relatedAuditLogs.slice(0, 5).map((log) => (
                                    <div key={log.id} className="flex items-start gap-3 p-2 text-sm">
                                      <div className="w-2 h-2 mt-1.5 bg-slate-300 rounded-full flex-shrink-0" />
                                      <div className="flex-1">
                                        <span className="font-medium text-slate-700">
                                          {log.action === 'recalculate' ? '重新计算' : log.action === 'confirm' ? '确认' : log.action}
                                        </span>
                                        <span className="text-slate-500 ml-2">
                                          由 {log.operatedBy} 操作
                                        </span>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                          {new Date(log.operatedAt).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
