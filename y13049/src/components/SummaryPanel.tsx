import { useApp } from '../context/AppContext';

export default function SummaryPanel() {
  const { summaryStats, filteredRecords } = useApp();
  const totalAmount = filteredRecords.reduce((sum, r) => sum + r.raiseAmount, 0);

  const formatAmount = (amount: number) => {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(2)}亿`;
    if (amount >= 10000) return `${(amount / 10000).toFixed(0)}万`;
    return `${amount}`;
  };

  const cards = [
    {
      label: '记录总数',
      value: summaryStats.total,
      subText: `涉及金额 ${formatAmount(totalAmount)} 元`,
      color: 'bg-slate-50 border-slate-200',
      valueColor: 'text-slate-800'
    },
    {
      label: '高风险',
      value: summaryStats.highRisk,
      subText: '不含币种错误/已撤回',
      color: 'bg-red-50 border-red-200',
      valueColor: 'text-red-700'
    },
    {
      label: '中风险',
      value: summaryStats.mediumRisk,
      subText: '不含币种错误/已撤回',
      color: 'bg-amber-50 border-amber-200',
      valueColor: 'text-amber-700'
    },
    {
      label: '低风险',
      value: summaryStats.lowRisk,
      subText: '不含币种错误/已撤回',
      color: 'bg-green-50 border-green-200',
      valueColor: 'text-green-700'
    },
    {
      label: '异常记录',
      value: summaryStats.anomalyCount,
      subText: '含数据/业务异常',
      color: 'bg-orange-50 border-orange-200',
      valueColor: 'text-orange-700'
    },
    {
      label: '待处理',
      value: summaryStats.pendingCount,
      subText: '需人工介入',
      color: 'bg-yellow-50 border-yellow-200',
      valueColor: 'text-yellow-700'
    },
    {
      label: '含撤回',
      value: summaryStats.withdrawalCount,
      subText: '撤回记录已关联结论',
      color: 'bg-purple-50 border-purple-200',
      valueColor: 'text-purple-700'
    },
    {
      label: '币种错误',
      value: summaryStats.currencyErrorCount,
      subText: '不计入风险统计',
      color: 'bg-pink-50 border-pink-200',
      valueColor: 'text-pink-700'
    }
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">风险预警汇总</h2>
        <span className="text-sm text-slate-500">
          数据截止：{new Date().toLocaleDateString('zh-CN')}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border p-4 ${card.color} transition-all hover:shadow-sm`}
          >
            <div className="text-sm text-slate-600 mb-1">{card.label}</div>
            <div className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</div>
            <div className="text-xs text-slate-500 mt-1">{card.subText}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
