import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, AlertTriangle, Clock, XCircle, ChevronRight, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useApp } from '../store/AppContext';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { calculateDaysToExpiry, formatDate } from '../utils/dateUtils';
import type { LoanStatus } from '../types';

const STATUS_COLORS: Record<LoanStatus, string> = {
  normal: '#16a34a',
  warning: '#f59e0b',
  expiring_soon: '#ea580c',
  expired: '#dc2626',
  abnormal: '#7c3aed'
};

export default function Dashboard() {
  const { state } = useApp();
  
  const stats = useMemo(() => {
    const total = state.customers.length;
    const normal = state.customers.filter(c => c.status === 'normal').length;
    const warning = state.customers.filter(c => c.status === 'warning').length;
    const expiringSoon = state.customers.filter(c => c.status === 'expiring_soon').length;
    const expired = state.customers.filter(c => c.status === 'expired').length;
    const abnormal = state.customers.filter(c => c.status === 'abnormal').length;
    const withAnomalies = state.customers.filter(c => c.anomalies.length > 0).length;
    
    const thisWeekExpiring = state.customers.filter(c => {
      const days = calculateDaysToExpiry(c.expiryDate);
      return days > 0 && days <= 7;
    });
    
    return { total, normal, warning, expiringSoon, expired, abnormal, withAnomalies, thisWeekExpiring };
  }, [state.customers]);
  
  const pieData = useMemo(() => [
    { name: '正常', value: stats.normal, color: STATUS_COLORS.normal },
    { name: '预警', value: stats.warning, color: STATUS_COLORS.warning },
    { name: '即将到期', value: stats.expiringSoon, color: STATUS_COLORS.expiring_soon },
    { name: '已过期', value: stats.expired, color: STATUS_COLORS.expired },
    { name: '异常', value: stats.abnormal, color: STATUS_COLORS.abnormal },
  ].filter(d => d.value > 0), [stats]);
  
  const barData = useMemo(() => {
    const anomalyCounts = {
      guarantee_expired: 0,
      missing_repayment: 0,
      approval_withdrawn: 0,
      expiring_soon: 0
    };
    
    state.customers.forEach(c => {
      c.anomalies.forEach(a => {
        anomalyCounts[a.type] = (anomalyCounts[a.type as keyof typeof anomalyCounts] || 0) + 1;
      });
    });
    
    return [
      { name: '担保过期', value: anomalyCounts.guarantee_expired },
      { name: '流水缺月', value: anomalyCounts.missing_repayment },
      { name: '审批撤回', value: anomalyCounts.approval_withdrawn },
      { name: '即将到期', value: anomalyCounts.expiring_soon },
    ];
  }, [state.customers]);
  
  const urgentCustomers = useMemo(() => {
    return [...state.customers]
      .filter(c => {
        const days = calculateDaysToExpiry(c.expiryDate);
        return days <= 7 || c.anomalies.some(a => a.severity === 'high');
      })
      .sort((a, b) => {
        const daysA = calculateDaysToExpiry(a.expiryDate);
        const daysB = calculateDaysToExpiry(b.expiryDate);
        const hasHighA = a.anomalies.some(an => an.severity === 'high') ? 1 : 0;
        const hasHighB = b.anomalies.some(an => an.severity === 'high') ? 1 : 0;
        if (hasHighA !== hasHighB) return hasHighB - hasHighA;
        return daysA - daysB;
      })
      .slice(0, 5);
  }, [state.customers]);
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">总览看板</h1>
          <p className="text-gray-500 mt-1">实时监控授信状态与风险预警</p>
        </div>
        <div className="text-sm text-gray-500">
          数据更新时间：{new Date().toLocaleString('zh-CN')}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="授信客户总数"
          value={stats.total}
          icon={<Users size={24} />}
          color="blue"
        />
        <StatCard
          title="本周到期预警"
          value={stats.thisWeekExpiring.length}
          icon={<Clock size={24} />}
          color="amber"
        />
        <StatCard
          title="存在异常客户"
          value={stats.withAnomalies}
          icon={<AlertTriangle size={24} />}
          color="red"
        />
        <StatCard
          title="状态异常客户"
          value={stats.abnormal}
          icon={<XCircle size={24} />}
          color="purple"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">状态分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">异常类型统计</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">紧急处理清单</h3>
            <Link to="/loans" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              查看全部 <ChevronRight size={16} />
            </Link>
          </div>
          
          {urgentCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp size={48} className="mx-auto mb-3 text-green-500" />
              <p>暂无需要紧急处理的客户</p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentCustomers.map(customer => {
                const days = calculateDaysToExpiry(customer.expiryDate);
                return (
                  <Link
                    key={customer.id}
                    to={`/loans/${customer.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">
                        {days <= 0 ? `已过期 ${Math.abs(days)} 天` : `剩余 ${days} 天到期`}
                        {customer.anomalies.length > 0 && ` · ${customer.anomalies.length} 项异常`}
                      </div>
                    </div>
                    <StatusBadge status={customer.status} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">本周到期客户明细</h3>
        {stats.thisWeekExpiring.length === 0 ? (
          <p className="text-gray-500 text-center py-8">本周没有即将到期的客户</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">客户名称</th>
                  <th className="table-header">授信额度</th>
                  <th className="table-header">到期日期</th>
                  <th className="table-header">剩余天数</th>
                  <th className="table-header">当前状态</th>
                  <th className="table-header">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.thisWeekExpiring.map(customer => {
                  const days = calculateDaysToExpiry(customer.expiryDate);
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{customer.name}</td>
                      <td className="table-cell">¥{customer.creditAmount.toLocaleString()}</td>
                      <td className="table-cell">{formatDate(customer.expiryDate)}</td>
                      <td className="table-cell">
                        <span className={days <= 3 ? 'text-red-600 font-medium' : 'text-amber-600 font-medium'}>
                          {days} 天
                        </span>
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={customer.status} />
                      </td>
                      <td className="table-cell">
                        <Link
                          to={`/loans/${customer.id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          查看详情
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
