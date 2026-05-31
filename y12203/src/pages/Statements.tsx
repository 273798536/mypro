import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Filter, AlertTriangle, Info, Download } from 'lucide-react';
import { useAppStore } from '../store';
import { formatCurrency, formatDate } from '../utils/calculator';

const COLORS = ['#334e68', '#486581', '#627d98', '#829ab1', '#9fb3c8'];

export default function Statements() {
  const { recoveries, claims, contracts, filters, setFilters, resetFilters, recalculateRecovery } =
    useAppStore();
  const [showFilters, setShowFilters] = useState(false);

  const filteredRecoveries = useMemo(() => {
    return recoveries.filter((r) => {
      const claim = claims.find((c) => c.id === r.claimId);
      const contract = contracts.find((c) => c.id === r.contractId);

      if (filters.riskType && claim?.riskType !== filters.riskType) return false;
      if (filters.reinsurer && contract?.reinsurer !== filters.reinsurer) return false;
      if (filters.hasDeductibleError !== null && r.hasDeductibleError !== filters.hasDeductibleError)
        return false;

      return true;
    });
  }, [recoveries, claims, contracts, filters]);

  const chartData = useMemo(() => {
    const byReinsurer: Record<string, number> = {};
    filteredRecoveries.forEach((r) => {
      const contract = contracts.find((c) => c.id === r.contractId);
      if (contract) {
        byReinsurer[contract.reinsurer] = (byReinsurer[contract.reinsurer] || 0) + r.recoverableAmount;
      }
    });
    return Object.entries(byReinsurer).map(([name, value]) => ({ name, value }));
  }, [filteredRecoveries, contracts]);

  const barChartData = useMemo(() => {
    const byClaim: Record<string, { name: string; 摊回金额: number; 赔款金额: number }> = {};
    filteredRecoveries.forEach((r) => {
      const claim = claims.find((c) => c.id === r.claimId);
      if (claim) {
        if (!byClaim[r.claimId]) {
          byClaim[r.claimId] = { name: claim.caseNo, 摊回金额: 0, 赔款金额: r.totalLoss };
        }
        byClaim[r.claimId].摊回金额 += r.recoverableAmount;
      }
    });
    return Object.values(byClaim);
  }, [filteredRecoveries, claims]);

  const riskTypes = [...new Set(claims.map((c) => c.riskType))];
  const reinsurers = [...new Set(contracts.map((c) => c.reinsurer))];

  const totalRecovery = filteredRecoveries.reduce((sum, r) => sum + r.recoverableAmount, 0);
  const totalLoss = filteredRecoveries.reduce((sum, r) => sum + r.totalLoss, 0);
  const errorCount = filteredRecoveries.filter((r) => r.hasDeductibleError).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">摊回表</h1>
          <p className="text-gray-500 mt-1">摊回明细报表与多维分析</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            筛选
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors">
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">险别</label>
              <select
                value={filters.riskType}
                onChange={(e) => setFilters({ riskType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">全部</option>
                {riskTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">再保险人</label>
              <select
                value={filters.reinsurer}
                onChange={(e) => setFilters({ reinsurer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">全部</option>
                {reinsurers.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">免赔错用</label>
              <select
                value={filters.hasDeductibleError === null ? '' : String(filters.hasDeductibleError)}
                onChange={(e) =>
                  setFilters({
                    hasDeductibleError: e.target.value === '' ? null : e.target.value === 'true',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">全部</option>
                <option value="true">仅显示异常</option>
                <option value="false">仅显示正常</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                重置筛选
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">摊回总额</p>
          <p className="text-2xl font-bold text-primary-700 mt-1">{formatCurrency(totalRecovery)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">关联赔款</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalLoss)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">免赔错用</p>
          <p className={`text-2xl font-bold mt-1 ${errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {errorCount} 笔
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">按再保险人分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">赔案摊回对比</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Bar dataKey="赔款金额" fill="#9fb3c8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="摊回金额" fill="#334e68" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">摊回明细</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  赔案编号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  被保险人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分保合同
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  赔款金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  免赔额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  摊回金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  计算口径
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  计算时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecoveries.map((recovery) => {
                const claim = claims.find((c) => c.id === recovery.claimId);
                const contract = contracts.find((c) => c.id === recovery.contractId);
                return (
                  <tr
                    key={recovery.id}
                    className={`hover:bg-gray-50 transition-colors ${recovery.hasDeductibleError ? 'bg-red-50/50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{claim?.caseNo}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {claim?.insured}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">{contract?.contractNo}</span>
                        <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded">
                          {recovery.contractVersion}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {formatCurrency(recovery.totalLoss)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {formatCurrency(recovery.deductibleApplied)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                      {formatCurrency(recovery.recoverableAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="group relative inline-block">
                          <Info className="w-4 h-4 text-gray-400 cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                            {recovery.calculationBasis}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {recovery.hasDeductibleError ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            免赔错用
                          </span>
                          <button
                            onClick={() => recalculateRecovery(recovery.id)}
                            className="text-xs text-primary-600 hover:text-primary-700 underline"
                          >
                            重算
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          正常
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                      {formatDate(recovery.calculatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredRecoveries.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            <p className="font-medium">暂无数据</p>
            <p className="text-sm mt-1">请调整筛选条件</p>
          </div>
        )}
      </div>
    </div>
  );
}
