import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare,
  X,
  TrendingUp,
  ArrowLeftRight,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useStore } from '../store/useStore';
import { CalculationService } from '../services/calculationService';
import { formatPressure, formatNumber } from '../utils/units';
import { FLOW_REGIME_LABELS, FLOW_REGIME_COLORS } from '../utils/constants';

export default function ComparePage() {
  const navigate = useNavigate();
  const { calculations, selectedCompareIds, toggleCompare, clearCompare } = useStore();

  const selectedCalculations = useMemo(() => {
    return calculations.filter((c) => selectedCompareIds.includes(c.id));
  }, [calculations, selectedCompareIds]);

  const compareResults = useMemo(() => {
    return selectedCalculations.map((calc) => {
      try {
        const result = CalculationService.calculate(calc);
        return { calc, result };
      } catch {
        return { calc, result: null };
      }
    });
  }, [selectedCalculations]);

  const chartData = useMemo(() => {
    return compareResults
      .filter((r) => r.result !== null)
      .map(({ calc, result }) => ({
        name: calc.name.length > 10 ? calc.name.slice(0, 10) + '...' : calc.name,
        fullName: calc.name,
        pressureDrop: result?.totalPressureDrop ? result.totalPressureDrop / 1000 : 0,
        velocity: result?.velocity || 0,
        reynolds: result?.reynolds || 0,
        headLoss: result?.headLoss || 0,
        localLoss: result?.localLoss || 0,
      }));
  }, [compareResults]);

  const sensitivityData = useMemo(() => {
    if (compareResults.length < 2) return [];
    
    const base = compareResults[0];
    if (!base.result) return [];

    return compareResults
      .filter((r) => r.result !== null && r.calc.id !== base.calc.id)
      .map(({ calc, result }) => {
        const dpChange = result && base.result
          ? ((result.totalPressureDrop - base.result.totalPressureDrop) / base.result.totalPressureDrop) * 100
          : 0;
        const diameterChange = ((calc.diameter - base.calc.diameter) / base.calc.diameter) * 100;
        const flowChange = ((calc.flowRate - base.calc.flowRate) / base.calc.flowRate) * 100;

        return {
          name: calc.name.length > 10 ? calc.name.slice(0, 10) + '...' : calc.name,
          fullName: calc.name,
          diameterChange: Number(diameterChange.toFixed(1)),
          flowChange: Number(flowChange.toFixed(1)),
          pressureDropChange: Number(dpChange.toFixed(1)),
        };
      });
  }, [compareResults]);

  if (selectedCalculations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">方案对比</h1>
            <p className="text-gray-500 mt-1">对比多个计算方案的压降结果</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center py-16">
            <GitCompare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">暂无对比方案</h3>
            <p className="text-gray-500 mb-6">
              在压降计算页面保存方案后，点击"加入对比"按钮添加到对比列表
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              前往计算页面
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">方案对比</h1>
          <p className="text-gray-500 mt-1">
            已选择 {selectedCalculations.length} 个方案进行对比（最多5个）
          </p>
        </div>
        <button onClick={clearCompare} className="btn btn-secondary">
          <X className="w-4 h-4" />
          清空对比
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {selectedCalculations.map((calc) => (
          <div
            key={calc.id}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">
              {calc.name}
            </span>
            <button
              onClick={() => toggleCompare(calc.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <div className="card-header">参数对比</div>
        <div className="min-w-full">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  参数
                </th>
                {compareResults.map(({ calc }) => (
                  <th
                    key={calc.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {calc.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 text-sm text-gray-600">管径</td>
                {compareResults.map(({ calc }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm font-mono">
                    {calc.diameter} {calc.diameterUnit}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">流量</td>
                {compareResults.map(({ calc }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm font-mono">
                    {calc.flowRate} {calc.flowRateUnit}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-600">管长</td>
                {compareResults.map(({ calc }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm font-mono">
                    {calc.pipeLength} {calc.pipeLengthUnit}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">粗糙度</td>
                {compareResults.map(({ calc }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm font-mono">
                    {calc.roughness} {calc.roughnessUnit}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-600">流体</td>
                {compareResults.map(({ calc }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm">
                    {calc.fluid.name}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">阀门数量</td>
                {compareResults.map(({ calc }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm">
                    {calc.valves.reduce((s, v) => s + v.count, 0)} 个
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="card-header flex items-center justify-between">
          <span>结果对比</span>
          <TrendingUp className="w-5 h-5 text-primary-500" />
        </div>
        <div className="min-w-full">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  指标
                </th>
                {compareResults.map(({ calc, result }) => (
                  <th
                    key={calc.id}
                    className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      result && compareResults.every(
                        (r) => !r.result || r.result.totalPressureDrop >= result.totalPressureDrop
                      )
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {calc.name}
                    {result && compareResults.every(
                      (r) => !r.result || r.result.totalPressureDrop >= result.totalPressureDrop
                    ) && (
                      <span className="ml-2 text-green-500">✓ 最优</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 text-sm text-gray-600">总压降</td>
                {compareResults.map(({ calc, result }) => (
                  <td
                    key={calc.id}
                    className={`px-4 py-3 text-sm font-mono font-bold ${
                      result && compareResults.every(
                        (r) => !r.result || r.result.totalPressureDrop >= result.totalPressureDrop
                      )
                        ? 'text-green-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {result ? formatPressure(result.totalPressureDrop) : '-'}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">流速</td>
                {compareResults.map(({ calc, result }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm font-mono">
                    {result ? `${formatNumber(result.velocity, 3)} m/s` : '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-600">雷诺数</td>
                {compareResults.map(({ calc, result }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm font-mono">
                    {result ? formatNumber(result.reynolds, 0) : '-'}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">流态</td>
                {compareResults.map(({ calc, result }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm">
                    {result ? (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${FLOW_REGIME_COLORS[result.flowRegime]}20`,
                          color: FLOW_REGIME_COLORS[result.flowRegime],
                        }}
                      >
                        {FLOW_REGIME_LABELS[result.flowRegime]}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-600">摩擦系数</td>
                {compareResults.map(({ calc, result }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm font-mono">
                    {result ? formatNumber(result.frictionFactor, 6) : '-'}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">沿程损失</td>
                {compareResults.map(({ calc, result }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm font-mono">
                    {result ? `${formatNumber(result.headLoss, 4)} m` : '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-600">局部损失</td>
                {compareResults.map(({ calc, result }) => (
                  <td key={calc.id} className="px-4 py-3 text-sm font-mono">
                    {result ? `${formatNumber(result.localLoss, 4)} m` : '-'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {chartData.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              压降对比 (kPa)
            </div>
            <div className="card-body h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length && payload[0].value !== undefined) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                            <p className="font-medium text-gray-800">{data.fullName}</p>
                            <p className="text-sm text-primary-600">
                              压降: {formatPressure(Number(payload[0].value) * 1000)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="pressureDrop" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-primary-500" />
              流速 & 雷诺数对比
            </div>
            <div className="card-body h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                            <p className="font-medium text-gray-800">{data.fullName}</p>
                            <p className="text-sm text-blue-600">
                              流速: {data.velocity.toFixed(3)} m/s
                            </p>
                            <p className="text-sm text-orange-600">
                              雷诺数: {data.reynolds.toFixed(0)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="velocity"
                    name="流速 (m/s)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="reynolds"
                    name="雷诺数"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {sensitivityData.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning-500" />
            参数敏感性分析 (以第一个方案为基准)
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      方案
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      管径变化
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      流量变化
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      压降变化
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      敏感度
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sensitivityData.map((row) => (
                    <tr key={row.name}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800" title={row.fullName}>
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {row.diameterChange > 0 ? '+' : ''}{row.diameterChange}%
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {row.flowChange > 0 ? '+' : ''}{row.flowChange}%
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-mono font-medium ${
                          row.pressureDropChange < 0 ? 'text-green-600' : row.pressureDropChange > 0 ? 'text-red-600' : 'text-gray-600'
                        }`}
                      >
                        {row.pressureDropChange > 0 ? '+' : ''}{row.pressureDropChange}%
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {Math.abs(row.pressureDropChange) > Math.abs(row.flowChange) * 1.5
                          ? '高'
                          : Math.abs(row.pressureDropChange) > Math.abs(row.flowChange) * 0.5
                          ? '中'
                          : '低'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
