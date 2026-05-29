import { useLedgerStore } from '../store/useLedgerStore';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PieChart as PieIcon, Building2, Tag, TrendingUp, DollarSign } from 'lucide-react';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Allocation() {
  const { stats, campaigns } = useLedgerStore();

  const campaignData = stats.costByCampaign.map((c, i) => ({
    name: c.campaignName,
    value: c.cost,
    count: c.count,
    fill: COLORS[i % COLORS.length],
  }));

  const merchantData = stats.costByMerchant.slice(0, 8).map((m, i) => ({
    name: m.merchantName.replace('超市', '').replace('咖啡', '').replace('商城', '').replace('石油', '').replace('出行', ''),
    积分成本: m.cost * 0.6,
    补贴成本: m.cost * 0.4,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">成本分摊</h1>
        <p className="text-navy-400 text-sm mt-1">
          按活动、商户维度查看成本构成与分摊明细
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="cli-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-navy-800 rounded-lg">
              <DollarSign className="w-5 h-5 text-navy-300" />
            </div>
            <div>
              <p className="text-navy-400 text-xs">总成本</p>
              <p className="text-2xl font-bold text-white font-mono">¥{stats.totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="cli-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <Tag className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-navy-400 text-xs">活动数</p>
              <p className="text-2xl font-bold text-blue-400 font-mono">{campaigns.length}</p>
            </div>
          </div>
        </div>
        <div className="cli-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/30 rounded-lg">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-navy-400 text-xs">商户数</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono">{stats.costByMerchant.length}</p>
            </div>
          </div>
        </div>
        <div className="cli-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-navy-400 text-xs">笔均成本</p>
              <p className="text-2xl font-bold text-amber-400 font-mono">
                ¥{(stats.totalCost / stats.totalTransactions).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cli-card">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-navy-400" />
            按活动成本分布
          </h3>
          {campaignData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={campaignData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {campaignData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#102a43',
                      border: '1px solid #334e68',
                      borderRadius: '6px',
                      color: '#d9e2ec',
                    }}
                    formatter={(value: number) => [`¥${value.toFixed(2)}`, '成本']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-navy-500">
              暂无数据
            </div>
          )}
        </div>

        <div className="cli-card">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-navy-400" />
            按商户成本构成 (Top 8)
          </h3>
          {merchantData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={merchantData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334e68" />
                  <XAxis dataKey="name" stroke="#829ab1" fontSize={11} />
                  <YAxis stroke="#829ab1" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#102a43',
                      border: '1px solid #334e68',
                      borderRadius: '6px',
                      color: '#d9e2ec',
                    }}
                    formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
                  />
                  <Bar dataKey="积分成本" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="补贴成本" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-navy-500">
              暂无数据
            </div>
          )}
        </div>
      </div>

      <div className="cli-card">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-navy-400" />
          按活动成本明细
        </h3>
        <div className="overflow-x-auto">
          <table className="cli-table">
            <thead>
              <tr>
                <th>活动名称</th>
                <th>版本</th>
                <th>交易笔数</th>
                <th>积分成本</th>
                <th>补贴成本</th>
                <th>总成本</th>
                <th>占比</th>
                <th>笔均成本</th>
              </tr>
            </thead>
            <tbody>
              {stats.costByCampaign.map(c => {
                const campaign = campaigns.find(ca => ca.id === c.campaignId);
                const total = c.cost;
                const pointsCost = total * 0.6;
                const subsidyCost = total * 0.4;
                const percentage = c.cost / stats.totalCost;
                return (
                  <tr key={c.campaignId}>
                    <td className="text-navy-100">{c.campaignName}</td>
                    <td className="text-navy-400 font-mono text-xs">{campaign?.version || '-'}</td>
                    <td className="text-navy-300 font-mono">{c.count}</td>
                    <td className="text-blue-400 font-mono">¥{pointsCost.toFixed(2)}</td>
                    <td className="text-amber-400 font-mono">¥{subsidyCost.toFixed(2)}</td>
                    <td className="text-white font-mono font-semibold">¥{c.cost.toFixed(2)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-navy-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-navy-500 to-navy-400 rounded-full"
                            style={{ width: `${percentage * 100}%` }}
                          />
                        </div>
                        <span className="text-navy-400 text-xs font-mono">
                          {(percentage * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-navy-300 font-mono">¥{(c.cost / c.count).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cli-card">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-navy-400" />
          按商户成本明细
        </h3>
        <div className="overflow-x-auto">
          <table className="cli-table">
            <thead>
              <tr>
                <th>商户名称</th>
                <th>交易笔数</th>
                <th>积分成本</th>
                <th>补贴成本</th>
                <th>总成本</th>
                <th>占比</th>
              </tr>
            </thead>
            <tbody>
              {stats.costByMerchant.map(m => {
                const percentage = m.cost / stats.totalCost;
                const pointsCost = m.cost * 0.6;
                const subsidyCost = m.cost * 0.4;
                return (
                  <tr key={m.merchantId}>
                    <td className="text-navy-100">{m.merchantName}</td>
                    <td className="text-navy-300 font-mono">{m.count}</td>
                    <td className="text-blue-400 font-mono">¥{pointsCost.toFixed(2)}</td>
                    <td className="text-amber-400 font-mono">¥{subsidyCost.toFixed(2)}</td>
                    <td className="text-white font-mono font-semibold">¥{m.cost.toFixed(2)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-navy-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                            style={{ width: `${percentage * 100}%` }}
                          />
                        </div>
                        <span className="text-navy-400 text-xs font-mono">
                          {(percentage * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
