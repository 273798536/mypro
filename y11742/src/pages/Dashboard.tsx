import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Banknote,
  Upload,
  Calculator,
  Download,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  Clock,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/calculationEngine';
import type { RefundStatus, Anomaly } from '../types';

const STATUS_LABEL: Record<RefundStatus, string> = {
  draft: '草稿',
  calculating: '计算中',
  pending_approval: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  completed: '已完成',
};

const STATUS_COLOR: Record<RefundStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  calculating: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const PIE_COLORS = ['#165DFF', '#F59E0B', '#EF4444'];

export default function Dashboard() {
  const contracts = useStore((s) => s.contracts);
  const refundRequests = useStore((s) => s.refundRequests);
  const treatmentRecords = useStore((s) => s.treatmentRecords);
  const installmentBills = useStore((s) => s.installmentBills);
  const gifts = useStore((s) => s.gifts);
  const anomalies = useStore((s) => s.anomalies);

  const totalContracts = contracts.length;

  const pendingRefundAmount = useMemo(() => {
    return refundRequests
      .filter((r) => r.status !== 'completed' && r.status !== 'rejected')
      .reduce((sum, r) => sum + (r.calculation?.actualRefund ?? 0), 0);
  }, [refundRequests]);

  const anomalyCount = anomalies.filter((a) => !a.isResolved).length;
  const completedRefundCount = refundRequests.filter((r) => r.status === 'completed').length;

  const pieData = useMemo(() => {
    const totalVerified = refundRequests.reduce((s, r) => s + (r.calculation?.verifiedTotal ?? 0), 0);
    const totalFee = refundRequests.reduce((s, r) => s + (r.calculation?.customerFeeShare ?? 0), 0);
    const totalGiftDeduction = refundRequests.reduce((s, r) => s + (r.calculation?.giftDeduction ?? 0), 0);
    return [
      { name: '已核销金额', value: totalVerified },
      { name: '手续费', value: totalFee },
      { name: '赠品扣回', value: totalGiftDeduction },
    ];
  }, [refundRequests]);

  const barData = useMemo(() => {
    const counts: Record<RefundStatus, number> = {
      draft: 0,
      calculating: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };
    refundRequests.forEach((r) => {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({
        name: STATUS_LABEL[status as RefundStatus],
        count,
      }))
      .filter((d) => d.count > 0);
  }, [refundRequests]);

  const recentContracts = useMemo(() => {
    return [...contracts]
      .sort((a, b) => b.importTime - a.importTime)
      .slice(0, 5)
      .map((c) => {
        const req = refundRequests.find((r) => r.contractId === c.id);
        const treatments = treatmentRecords.filter((t) => t.contractId === c.id);
        const giftCount = gifts.filter((g) => g.contractId === c.id).length;
        return {
          id: c.id,
          contractNo: c.contractNo,
          customerName: c.customerName,
          totalAmount: c.totalAmount,
          treatmentCount: treatments.length,
          giftCount,
          status: req?.status,
        };
      });
  }, [contracts, refundRequests, treatmentRecords, gifts]);

  const criticalAnomalies = useMemo(() => {
    return anomalies
      .filter((a) => !a.isResolved)
      .sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 } as Record<string, number>;
        return order[a.severity] - order[b.severity];
      })
      .slice(0, 4);
  }, [anomalies]);

  const handleNavigate = (path: string) => {
    window.history.pushState({}, '', path);
  };

  const getSeverityStyle = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-700',
          label: '严重',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          badge: 'bg-orange-100 text-orange-700',
          label: '警告',
        };
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-500" />,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-700',
          label: '提示',
        };
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">退款计算仪表盘</h1>
          <p className="text-sm text-gray-500 mt-1">医疗美容退款管理数据概览</p>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>更新于 {new Date().toLocaleString('zh-CN')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-[#165DFF] transition-all cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-[#165DFF]/10">
              <FileText className="w-6 h-6 text-[#165DFF]" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div className="mt-3">
            <p className="text-sm text-gray-500">合同总数</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalContracts}</p>
            <p className="text-xs text-gray-400 mt-1">共 {refundRequests.length} 份退款申请</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-orange-400 transition-all cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-orange-100">
              <Banknote className="w-6 h-6 text-orange-500" />
            </div>
            <TrendingDown className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-3">
            <p className="text-sm text-gray-500">待退款金额</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(pendingRefundAmount)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              含 {refundRequests.filter((r) => r.status !== 'completed' && r.status !== 'rejected').length} 笔处理中
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-red-400 transition-all cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
              需关注
            </span>
          </div>
          <div className="mt-3">
            <p className="text-sm text-gray-500">异常数量</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{anomalyCount}</p>
            <p className="text-xs text-gray-400 mt-1">
              其中严重 {anomalies.filter((a) => !a.isResolved && a.severity === 'critical').length} 项
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-green-400 transition-all cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div className="mt-3">
            <p className="text-sm text-gray-500">已完成退款</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{completedRefundCount}</p>
            <p className="text-xs text-gray-400 mt-1">
              共 {refundRequests.filter((r) => r.status === 'completed').reduce((s, r) => s + (r.calculation?.actualRefund ?? 0), 0).toLocaleString('zh-CN')} 元
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">退款金额构成</h2>
            <span className="text-xs text-gray-400">按类别统计</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  paddingAngle={2}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[index] }}
                />
                <span className="text-gray-600">{item.name}</span>
                <span className="font-medium text-gray-900">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">退款申请状态</h2>
            <span className="text-xs text-gray-400">近 {refundRequests.length} 笔</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#165DFF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最近合同</h2>
            <button
              onClick={() => handleNavigate('/import')}
              className="text-sm text-[#165DFF] hover:text-[#0E42CC] flex items-center gap-1"
            >
              查看全部
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentContracts.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无合同数据</p>
              </div>
            ) : (
              recentContracts.map((c) => (
                <div
                  key={c.id}
                  className="py-3 flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 transition-colors cursor-pointer"
                  onClick={() => handleNavigate(`/contract/${c.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#165DFF]/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#165DFF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.contractNo}</p>
                      <p className="text-xs text-gray-500">
                        {c.customerName} · {c.treatmentCount} 次治疗 · {c.giftCount} 项赠品
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(c.totalAmount)}</p>
                    </div>
                    {c.status ? (
                      <span
                        className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[c.status as RefundStatus]}`}
                      >
                        {STATUS_LABEL[c.status as RefundStatus]}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">
                        未发起
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
          <div className="space-y-3">
            <button
              onClick={() => handleNavigate('/import')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#165DFF] hover:bg-[#165DFF]/5 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#165DFF]/10 flex items-center justify-center group-hover:bg-[#165DFF]/20">
                <Upload className="w-5 h-5 text-[#165DFF]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">数据导入</p>
                <p className="text-xs text-gray-500">导入合同、治疗、赠品等数据</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            <button
              onClick={() => handleNavigate('/calculator')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center group-hover:bg-orange-200">
                <Calculator className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">退款计算</p>
                <p className="text-xs text-gray-500">精准核算退款金额</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            <button
              onClick={() => handleNavigate('/export')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">导出文档</p>
                <p className="text-xs text-gray-500">导出退款结算单及审批记录</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">数据统计</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-lg bg-gray-50">
                  <p className="text-lg font-bold text-gray-900">{treatmentRecords.length}</p>
                  <p className="text-xs text-gray-500">治疗记录</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-gray-50">
                  <p className="text-lg font-bold text-gray-900">{gifts.length}</p>
                  <p className="text-xs text-gray-500">赠品记录</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-gray-50">
                  <p className="text-lg font-bold text-gray-900">{installmentBills.length}</p>
                  <p className="text-xs text-gray-500">分期账单</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-gray-50">
                  <p className="text-lg font-bold text-gray-900">{anomalies.length}</p>
                  <p className="text-xs text-gray-500">异常预警</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">异常预警</h2>
            {anomalyCount > 0 && (
              <span className="text-xs font-medium text-white bg-red-500 px-2 py-0.5 rounded-full">
                {anomalyCount} 项待处理
              </span>
            )}
          </div>
          <button
            onClick={() => handleNavigate('/anomalies')}
            className="text-sm text-[#165DFF] hover:text-[#0E42CC] flex items-center gap-1"
          >
            查看全部
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {criticalAnomalies.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-70" />
            <p>当前无异常预警</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {criticalAnomalies.map((a) => {
              const style = getSeverityStyle(a.severity);
              return (
                <div
                  key={a.id}
                  className={`p-4 rounded-lg border ${style.border} ${style.bg} hover:shadow-sm transition-shadow cursor-pointer`}
                  onClick={() => handleNavigate('/calculator')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${style.badge}`}
                          >
                            {style.label}
                          </span>
                          <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{a.description}</p>
                        {a.suggestion && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            建议：{a.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
