import { useApp } from '../context/AppContext';
import { STATUS_COLORS } from '../types';

export default function Sidebar() {
  const { scoreRecords, anomalies, activeColorRule } = useApp();

  const summary = {
    total: scoreRecords.length,
    approved: scoreRecords.filter(r => r.status === 'approved').length,
    pending: scoreRecords.filter(r => r.status === 'pending').length,
    reviewNeeded: scoreRecords.filter(r => r.status === 'review_needed').length,
    rejected: scoreRecords.filter(r => r.status === 'rejected').length,
    openAnomalies: anomalies.filter(a => a.status === 'open').length,
  };

  return (
    <aside className="w-64 bg-white border-r p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">概览</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">总记录</span>
            <span className="font-semibold text-gray-900">{summary.total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">待确认</span>
            <span className={`px-2 py-0.5 rounded text-sm font-medium ${STATUS_COLORS.pending}`}>
              {summary.pending}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">需复核</span>
            <span className={`px-2 py-0.5 rounded text-sm font-medium ${STATUS_COLORS.review_needed}`}>
              {summary.reviewNeeded}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">通过</span>
            <span className={`px-2 py-0.5 rounded text-sm font-medium ${STATUS_COLORS.approved}`}>
              {summary.approved}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">驳回</span>
            <span className={`px-2 py-0.5 rounded text-sm font-medium ${STATUS_COLORS.rejected}`}>
              {summary.rejected}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-red-700 font-medium">待处理异常</span>
          <span className="bg-red-600 text-white text-sm font-bold px-2 py-0.5 rounded">
            {summary.openAnomalies}
          </span>
        </div>
        <p className="text-xs text-red-600">请优先处理带标记的异常项</p>
      </div>

      {activeColorRule && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            颜色规则速查
          </h2>
          <div className="space-y-2">
            {activeColorRule.rules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: rule.color }}
                />
                <span className="text-gray-700">{rule.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-blue-700 font-medium text-sm mb-2">使用提示</h3>
        <ul className="text-xs text-blue-600 space-y-1">
          <li>• 绿色 = 可直接使用</li>
          <li>• 橙色 = 需找航拍剪辑复核</li>
          <li>• 黄色 = 待确认</li>
          <li>• 红色 = 驳回/有问题</li>
        </ul>
      </div>
    </aside>
  );
}
