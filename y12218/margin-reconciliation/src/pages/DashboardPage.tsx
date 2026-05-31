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
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Lock,
  RefreshCw,
  FileText,
} from 'lucide-react';
import type { MarginCalculationResult, ReconciliationSummary } from '../types';
import { formatCurrency, getStatusLabel, getRiskLabel } from '../utils/marginCalculator';

interface DashboardPageProps {
  results: MarginCalculationResult[];
  summary: ReconciliationSummary | null;
  positions: any[];
  onSelectResult: (result: MarginCalculationResult) => void;
  onRecalculate: () => void;
  isCalculating: boolean;
  selectedSampleName?: string;
}

const RISK_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

const STATUS_COLORS = {
  matched: '#10b981',
  mismatch: '#ef4444',
  pending: '#6b7280',
  manual: '#f59e0b',
};

export function DashboardPage({
  results,
  summary,
  positions,
  onSelectResult,
  onRecalculate,
  isCalculating,
  selectedSampleName,
}: DashboardPageProps) {
  if (!summary || results.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">请先导入样例数据</p>
        </div>
      </div>
    );
  }

  const barChartData = results.map((r) => ({
    name: r.customerName,
    应缴保证金: r.totalRequiredMargin / 10000,
    实缴保证金: r.actualMargin / 10000,
    差异: r.marginDifference / 10000,
  }));

  const riskPieData = Object.entries(summary.riskBreakdown).map(([key, value]) => ({
    name: getRiskLabel(key as any),
    value,
    color: RISK_COLORS[key as keyof typeof RISK_COLORS],
  }));

  const statusPieData = [
    { name: '核对一致', value: summary.matchedCount, color: STATUS_COLORS.matched },
    { name: '核对不一致', value: summary.mismatchCount, color: STATUS_COLORS.mismatch },
    { name: '待核对', value: summary.pendingCount, color: STATUS_COLORS.pending },
    { name: '需人工确认', value: summary.manualCount, color: STATUS_COLORS.manual },
  ].filter((d) => d.value > 0);

  const versionTrendData = buildVersionTrendData(positions);

  const criticalCount = summary.riskBreakdown.critical + summary.riskBreakdown.high;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">保证金核对概览</h2>
          <p className="text-gray-600 mt-1">
            {selectedSampleName ? `当前场景：${selectedSampleName}` : ''}
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={onRecalculate}
          disabled={isCalculating}
        >
          <RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
          {isCalculating ? '重算中...' : '重新计算'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">客户总数</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{summary.totalCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">核对一致</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{summary.matchedCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">核对不一致</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{summary.mismatchCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">高风险客户</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{criticalCount}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">客户保证金对比</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: '万元', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(2)}万元`, '']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Bar dataKey="应缴保证金" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="实缴保证金" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="差异" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">风险分布</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {riskPieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">核对状态</h3>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {statusPieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">保证金版本变化趋势</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={versionTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="version" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: '万元', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(2)}万元`, '']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Legend />
            {versionTrendData[0] &&
              Object.keys(versionTrendData[0])
                .filter((k) => k !== 'version')
                .map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">客户核对结果列表</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>交易日：2026-05-30</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">客户名称</th>
                <th className="table-header">应缴保证金</th>
                <th className="table-header">实缴保证金</th>
                <th className="table-header">差异</th>
                <th className="table-header">风险等级</th>
                <th className="table-header">状态</th>
                <th className="table-header">特殊标记</th>
                <th className="table-header">操作</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr
                  key={result.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onSelectResult(result)}
                >
                  <td className="table-cell font-medium">{result.customerName}</td>
                  <td className="table-cell">{formatCurrency(result.totalRequiredMargin)}</td>
                  <td className="table-cell">{formatCurrency(result.actualMargin)}</td>
                  <td className={`table-cell font-mono ${result.marginDifference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {result.marginDifference >= 0 ? '+' : ''}
                    {formatCurrency(result.marginDifference)}
                  </td>
                  <td className="table-cell">
                    <span
                      className={`badge ${
                        result.riskLevel === 'critical'
                          ? 'badge-danger'
                          : result.riskLevel === 'high'
                          ? 'badge-warning'
                          : result.riskLevel === 'medium'
                          ? 'badge-info'
                          : 'badge-success'
                      }`}
                    >
                      {getRiskLabel(result.riskLevel)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`badge ${
                        result.status === 'matched'
                          ? 'badge-success'
                          : result.status === 'mismatch'
                          ? 'badge-danger'
                          : result.status === 'manual'
                          ? 'badge-warning'
                          : 'badge-info'
                      }`}
                    >
                      {getStatusLabel(result.status)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {result.hasNightJump && (
                        <span className="badge bg-amber-100 text-amber-700" title="夜盘跳价">
                          <Zap className="w-3 h-3 mr-1" />
                          跳价
                        </span>
                      )}
                      {result.hasMarginRateChange && (
                        <span className="badge bg-blue-100 text-blue-700" title="保证金率调整">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          率调
                        </span>
                      )}
                      {result.hasOverriddenFundFlow && (
                        <span className="badge bg-red-100 text-red-700" title="出金冻结">
                          <Lock className="w-3 h-3 mr-1" />
                          冻结
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      查看明细
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function buildVersionTrendData(positions: any[]) {
  const customers = [...new Set(positions.map((p) => p.customerId))];
  const customerMap: Record<string, string> = {
    'cust-001': '张三',
    'cust-002': '李四',
    'cust-003': '王五',
    'cust-004': '赵六',
    'cust-005': '钱七',
  };

  const versions = ['日盘', '夜盘V1', '夜盘V2'];

  return versions.map((version, idx) => {
    const data: Record<string, any> = { version };
    
    customers.forEach((custId) => {
      const custPositions = positions.filter((p) => p.customerId === custId);
      const totalMargin = custPositions.reduce((sum, p) => {
        const versionData = p.versions[idx];
        if (versionData) {
          return sum + versionData.marginAmount;
        }
        return sum + (p.versions[p.versions.length - 1]?.marginAmount || 0);
      }, 0);
      data[customerMap[custId] || custId] = totalMargin / 10000;
    });

    return data;
  });
}
