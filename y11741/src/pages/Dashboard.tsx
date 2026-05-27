import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Tags,
  Calculator,
  BarChart3,
  Upload,
  FileSpreadsheet,
  Download,
  ChevronRight,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAmortizationStore } from '@/store/amortizationStore';
import type { Anomaly } from '@/types';

const formatCurrency = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN')}`;
};

const formatMonth = (period: string): string => {
  const [year, month] = period.split('-');
  return `${year.slice(2)}年${month}月`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { amortizationRecords, anomalies, cloudBills } = useAmortizationStore();

  const costTrendData = useMemo(() => {
    const periodMap = new Map<string, number>();
    amortizationRecords.forEach((record) => {
      const current = periodMap.get(record.period) || 0;
      periodMap.set(record.period, current + record.totalAmount);
    });
    return Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([period, total]) => ({
        month: formatMonth(period),
        总成本: total,
      }));
  }, [amortizationRecords]);

  const unresolvedAnomalies = useMemo(() => {
    return anomalies.filter((a) => !a.resolved);
  }, [anomalies]);

  const pendingStats = useMemo(() => {
    return {
      missingTags: unresolvedAnomalies.filter((a) => a.type === 'missing_tag').length,
      deductionErrors: unresolvedAnomalies.filter((a) => a.type === 'deduction_error').length,
      peakCosts: unresolvedAnomalies.filter((a) => a.type === 'peak_cost').length,
    };
  }, [unresolvedAnomalies]);

  const peakAnomalies = useMemo(() => {
    return unresolvedAnomalies
      .filter((a) => a.type === 'peak_cost')
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
      .slice(0, 3);
  }, [unresolvedAnomalies]);

  const totalCost = useMemo(() => {
    return cloudBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  }, [cloudBills]);

  const currentMonthCost = useMemo(() => {
    const latestPeriod = costTrendData[costTrendData.length - 1];
    return latestPeriod ? latestPeriod.总成本 : 0;
  }, [costTrendData]);

  const costChange = useMemo(() => {
    if (costTrendData.length < 2) return 0;
    const current = costTrendData[costTrendData.length - 1].总成本;
    const previous = costTrendData[costTrendData.length - 2].总成本;
    return ((current - previous) / previous) * 100;
  }, [costTrendData]);

  const getAnomalyIcon = (type: Anomaly['type']) => {
    switch (type) {
      case 'missing_tag':
        return <Tags className="w-4 h-4" />;
      case 'deduction_error':
        return <Calculator className="w-4 h-4" />;
      case 'peak_cost':
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  return (
    <PageContainer
      breadcrumbs={[{ label: '仪表盘' }]}
      userName="管理员"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">本月总成本</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(currentMonthCost)}</p>
                <div className="flex items-center mt-2 text-blue-100 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>较上月 {costChange >= 0 ? '+' : ''}{costChange.toFixed(1)}%</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <BarChart3 className="w-8 h-8" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">累计总成本</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(totalCost)}</p>
                <div className="flex items-center mt-2 text-emerald-100 text-sm">
                  <span>共 {cloudBills.length} 个月账单</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">待处理异常</p>
                <p className="text-3xl font-bold mt-2">{unresolvedAnomalies.length}</p>
                <div className="flex items-center mt-2 text-amber-100 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  <span>需要及时处理</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card
            title="成本趋势"
            subtitle="近6个月总成本变化"
            className="lg:col-span-2"
            actions={
              <button
                onClick={() => navigate('/amortization')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                查看详情 <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            }
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), '总成本']}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="总成本"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="待处理事项" subtitle="需要您关注的问题">
            <div className="space-y-3">
              <button
                onClick={() => navigate('/anomalies?type=missing_tag')}
                className="w-full flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <div className="bg-amber-500 text-white rounded-lg p-2 mr-3">
                    <Tags className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-neutral-900">标签缺失</p>
                    <p className="text-xs text-neutral-500">资源标签不完整</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {pendingStats.missingTags}
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-400 ml-2" />
                </div>
              </button>

              <button
                onClick={() => navigate('/anomalies?type=deduction_error')}
                className="w-full flex items-center justify-between p-3 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <div className="bg-rose-500 text-white rounded-lg p-2 mr-3">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-neutral-900">抵扣异常</p>
                    <p className="text-xs text-neutral-500">抵扣金额计算有误</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {pendingStats.deductionErrors}
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-400 ml-2" />
                </div>
              </button>

              <button
                onClick={() => navigate('/anomalies?type=peak_cost')}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <div className="bg-blue-500 text-white rounded-lg p-2 mr-3">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-neutral-900">峰值异常</p>
                    <p className="text-xs text-neutral-500">成本异常波动</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {pendingStats.peakCosts}
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-400 ml-2" />
                </div>
              </button>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card
            title="异常峰值提醒"
            subtitle="近期成本异常波动"
            className="lg:col-span-2"
          >
            {peakAnomalies.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无峰值异常</p>
              </div>
            ) : (
              <div className="space-y-3">
                {peakAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="relative bg-amber-50 border border-amber-200 rounded-lg p-4 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-amber-400 opacity-10 animate-pulse" />
                    <div className="relative flex items-start">
                      <div className="bg-amber-500 text-white rounded-lg p-2 mr-3 flex-shrink-0">
                        {getAnomalyIcon(anomaly.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge severity={anomaly.severity} label={anomaly.severity === 'error' ? '严重' : anomaly.severity === 'warning' ? '警告' : '提示'} />
                          <span className="text-xs text-neutral-500">
                            {new Date(anomaly.detectedAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-900 font-medium">{anomaly.description}</p>
                        {anomaly.amount && (
                          <p className="text-sm text-amber-600 mt-1 font-medium">
                            涉及金额: {formatCurrency(anomaly.amount)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/anomalies/${anomaly.id}`)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex-shrink-0 ml-3"
                      >
                        处理
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="快速入口" subtitle="常用操作快捷访问">
            <div className="space-y-3">
              <button
                onClick={() => navigate('/import')}
                className="w-full flex items-center p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors group"
              >
                <div className="bg-blue-500 text-white rounded-lg p-2 mr-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-neutral-900">导入数据</p>
                  <p className="text-xs text-neutral-500">上传账单或预留实例</p>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>

              <button
                onClick={() => navigate('/amortization/new')}
                className="w-full flex items-center p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors group"
              >
                <div className="bg-emerald-500 text-white rounded-lg p-2 mr-3 group-hover:scale-110 transition-transform">
                  <Calculator className="w-4 h-4" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-neutral-900">新建摊销</p>
                  <p className="text-xs text-neutral-500">创建新的摊销记录</p>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>

              <button
                onClick={() => navigate('/reports')}
                className="w-full flex items-center p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors group"
              >
                <div className="bg-purple-500 text-white rounded-lg p-2 mr-3 group-hover:scale-110 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-neutral-900">导出报告</p>
                  <p className="text-xs text-neutral-500">生成成本分析报告</p>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
