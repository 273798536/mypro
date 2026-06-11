import { useApp } from '../context/AppContext';
import type { RiskRecord, RiskLevel, ProcessingStatus } from '../types';

function riskLevelBadge(level: RiskLevel) {
  const map: Record<RiskLevel, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-green-100 text-green-700 border-green-200'
  };
  const labels: Record<RiskLevel, string> = { high: '高风险', medium: '中风险', low: '低风险' };
  return { className: map[level], label: labels[level] };
}

function statusBadge(status: ProcessingStatus) {
  const map: Record<ProcessingStatus, string> = {
    normal_passed: 'bg-green-50 text-green-700 border-green-200',
    normal_pending: 'bg-slate-50 text-slate-700 border-slate-200',
    anomaly_fixed: 'bg-teal-50 text-teal-700 border-teal-200',
    anomaly_pending: 'bg-orange-50 text-orange-700 border-orange-200',
    currency_error: 'bg-pink-50 text-pink-700 border-pink-200',
    withdrawn: 'bg-purple-50 text-purple-700 border-purple-200'
  };
  const labels: Record<ProcessingStatus, string> = {
    normal_passed: '正常通过',
    normal_pending: '待复核',
    anomaly_fixed: '异常已修复',
    anomaly_pending: '异常待处理',
    currency_error: '币种错误',
    withdrawn: '已撤回'
  };
  return { className: map[status], label: labels[status] };
}

function formatAmount(amount: number): string {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(2)}亿`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}万`;
  return `${amount}`;
}

export default function RecordList() {
  const { filteredRecords, state, selectRecord } = useApp();
  const { selectedRecordId } = state;

  if (filteredRecords.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <div className="text-slate-400 text-lg mb-2">暂无符合筛选条件的记录</div>
        <div className="text-slate-500 text-sm">请尝试调整筛选条件</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-700">债券代码</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">债券名称</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">募集日期</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">金额</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">风险等级</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">处理状态</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700">异常</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700">撤回</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">责任人</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record: RiskRecord) => {
              const risk = riskLevelBadge(record.riskLevel);
              const status = statusBadge(record.processingStatus);
              const isCurrencyError = record.processingStatus === 'currency_error';
              const isSelected = selectedRecordId === record.id;
              const hasWithdrawal = !!record.withdrawalRecord || record.manualNotes.some(n => n.isWithdrawn);

              return (
                <tr
                  key={record.id}
                  onClick={() => selectRecord(record.id)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-bond-50 border-l-4 border-l-bond-500'
                      : 'hover:bg-slate-50'
                  } ${isCurrencyError ? 'bg-pink-50/30' : ''}`}
                >
                  <td className="px-4 py-3 font-mono text-slate-700">{record.bondCode}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">
                    <div className="flex items-center gap-2">
                      {record.bondName}
                      {isCurrencyError && (
                        <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                          小样例混入
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{record.raiseDate}</td>
                  <td className="px-4 py-3 text-right text-slate-700 font-medium">
                    {formatAmount(record.raiseAmount)}
                    <span className="text-xs text-slate-400 ml-1">{record.currency}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${risk.className}`}>
                      {risk.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {record.isAnomaly ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs">!</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasWithdrawal ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 text-white text-xs">↩</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{record.responsiblePerson}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
