import { useNavigate } from 'react-router-dom';
import { useLedgerStore } from '../store/useLedgerStore';
import { AlertTriangle, TrendingUp, DollarSign, Coins, Users, CheckCircle, Clock, XCircle, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getAnomalyLabel } from '../utils/export';
import { zhCN } from 'date-fns/locale';
import { format } from 'date-fns';

export default function Dashboard() {
  const { stats, transactions } = useLedgerStore();
  const navigate = useNavigate();

  const anomalyTxs = transactions.filter(tx => tx.status === 'anomaly' || tx.status === 'pending_review').slice(0, 6);

  const pieData = [
    { name: '退款未回滚', value: stats.anomalyBreakdown['refund_not_rolledback'], color: '#ef4444' },
    { name: '补贴跨活动', value: stats.anomalyBreakdown['subsidy_cross_campaign'], color: '#f59e0b' },
    { name: '积分倍率叠加', value: stats.anomalyBreakdown['points_rate_overlap'], color: '#3b82f6' },
    { name: '需人工确认', value: stats.anomalyBreakdown['manual_review_needed'], color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const statusDistribution = [
    { name: '未处理', count: stats.unhandledCount, color: '#627d98' },
    { name: '已修正', count: stats.revisedCount, color: '#10b981' },
    { name: '待确认', count: stats.pendingReviewCount, color: '#f59e0b' },
    { name: '异常', count: stats.anomalyCount, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">成本仪表盘</h1>
          <p className="text-navy-400 text-sm mt-1">
            数据更新时间: {format(new Date(), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cli-card group hover:border-navy-500 transition-colors cursor-pointer" onClick={() => navigate('/reports')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-navy-400 text-sm">总成本</p>
              <p className="text-2xl font-bold text-white font-mono mt-1">¥{stats.totalCost.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-navy-800 rounded-lg group-hover:bg-navy-700 transition-colors">
              <DollarSign className="w-6 h-6 text-navy-300" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-navy-400">积分成本 ¥{stats.totalPointsCost.toFixed(0)}</span>
            <span className="text-navy-600">+</span>
            <span className="text-navy-400">补贴 ¥{stats.totalSubsidyCost.toFixed(0)}</span>
          </div>
        </div>

        <div className="cli-card group hover:border-red-600 transition-colors cursor-pointer" onClick={() => { navigate('/ledger'); useLedgerStore.getState().setFilters({ statuses: ['anomaly'] }); }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-navy-400 text-sm">异常交易</p>
              <p className="text-2xl font-bold text-red-400 font-mono mt-1">{stats.anomalyCount}</p>
            </div>
            <div className="p-2 bg-red-900/30 rounded-lg group-hover:bg-red-900/50 transition-colors">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {Object.entries(stats.anomalyBreakdown)
              .filter(([_, v]) => v > 0)
              .map(([k, v]) => (
                <span key={k} className="px-1.5 py-0.5 bg-red-900/30 text-red-300 rounded text-xs">
                  {getAnomalyLabel(k)} {v}
                </span>
              ))}
          </div>
        </div>

        <div className="cli-card group hover:border-emerald-600 transition-colors cursor-pointer" onClick={() => { navigate('/ledger'); useLedgerStore.getState().setFilters({ statuses: ['revised'] }); }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-navy-400 text-sm">已修正</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{stats.revisedCount}</p>
            </div>
            <div className="p-2 bg-emerald-900/30 rounded-lg group-hover:bg-emerald-900/50 transition-colors">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 text-xs text-navy-400">
            修正记录已保留完整痕迹
          </div>
        </div>

        <div className="cli-card group hover:border-amber-600 transition-colors cursor-pointer" onClick={() => { navigate('/ledger'); useLedgerStore.getState().setFilters({ statuses: ['pending_review'] }); }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-navy-400 text-sm">待人工确认</p>
              <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{stats.pendingReviewCount}</p>
            </div>
            <div className="p-2 bg-amber-900/30 rounded-lg group-hover:bg-amber-900/50 transition-colors">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 text-xs text-navy-400">
            需要人工介入核实处理
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="cli-card lg:col-span-2">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-navy-400" />
            每日成本趋势
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyCost}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334e68" />
                <XAxis dataKey="date" stroke="#829ab1" fontSize={11} />
                <YAxis stroke="#829ab1" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#102a43',
                    border: '1px solid #334e68',
                    borderRadius: '6px',
                    color: '#d9e2ec',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
                />
                <Bar dataKey="pointsCost" name="积分成本" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="subsidyCost" name="补贴成本" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cli-card">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            异常类型分布
          </h3>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#102a43',
                      border: '1px solid #334e68',
                      borderRadius: '6px',
                      color: '#d9e2ec',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-navy-500 text-sm">
              暂无异常数据
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {statusDistribution.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-navy-400">{s.name}</span>
                <span className="text-white font-mono ml-auto">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {anomalyTxs.length > 0 && (
        <div className="cli-card border-red-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              需要关注的异常交易
            </h3>
            <button
              onClick={() => { navigate('/ledger'); useLedgerStore.getState().setFilters({ statuses: ['anomaly', 'pending_review'] }); }}
              className="text-xs text-navy-400 hover:text-white flex items-center gap-1"
            >
              查看全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {anomalyTxs.map(tx => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-navy-900/50 rounded-lg border border-navy-800 hover:border-red-700/50 transition-colors cursor-pointer group"
                onClick={() => navigate('/ledger')}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    tx.status === 'anomaly' ? 'bg-red-400 animate-pulse-slow' : 'bg-amber-400 animate-pulse-slow'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm">{tx.id}</span>
                      <span className="text-navy-400 text-xs">{tx.merchantName}</span>
                    </div>
                    <div className="text-xs text-navy-500 mt-0.5">
                      ¥{tx.amount.toFixed(2)} · {tx.pointsEarned}积分
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    {tx.anomalies.map(a => (
                      <span key={a} className="px-1.5 py-0.5 bg-red-900/50 text-red-300 rounded text-[10px]">
                        {getAnomalyLabel(a)}
                      </span>
                    ))}
                  </div>
                  {tx.anomalyNotes && (
                    <p className="text-xs text-navy-500 mt-1 max-w-xs truncate">{tx.anomalyNotes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="cli-card">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            按活动成本分摊
          </h3>
          <div className="space-y-3">
            {stats.costByCampaign.map(c => (
              <div key={c.campaignId} className="group">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-navy-200 group-hover:text-white transition-colors">{c.campaignName}</span>
                  <span className="text-white font-mono">¥{c.cost.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-navy-600 to-navy-400 rounded-full transition-all"
                    style={{ width: `${(c.cost / stats.totalCost) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-navy-500 mt-1">{c.count} 笔交易</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cli-card">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            按商户成本分摊 (Top 5)
          </h3>
          <div className="space-y-3">
            {stats.costByMerchant.slice(0, 5).map(m => (
              <div key={m.merchantId} className="group">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-navy-200 group-hover:text-white transition-colors">{m.merchantName}</span>
                  <span className="text-white font-mono">¥{m.cost.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
                    style={{ width: `${(m.cost / (stats.costByMerchant[0]?.cost || 1)) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-navy-500 mt-1">{m.count} 笔交易</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
