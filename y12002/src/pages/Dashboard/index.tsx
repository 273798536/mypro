import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Coins,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  PieChart,
  BarChart3,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  Eye,
  ArrowRight,
  Bell,
  History,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { StatusTag } from '@/components/ui/StatusTag';
import { formatCurrency, formatMiles } from '@/utils/number';
import { formatDate, formatDateTime, isDateExpiringSoon, daysUntilExpire } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { LiabilityRecord, BadRecord, OperationLog } from '@/types';

const COLORS = ['#1E3A5F', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const memberAccounts = useAppStore((state) => state.memberAccounts);
  const liabilityRecords = useAppStore((state) => state.liabilityRecords);
  const badRecords = useAppStore((state) => state.badRecords);
  const operationLogs = useAppStore((state) => state.operationLogs);
  const getExpiredRecords = useAppStore((state) => state.getExpiredRecords);

  const stats = useMemo(() => {
    const totalMembers = memberAccounts.length;
    const totalMiles = memberAccounts.reduce((sum, m) => sum + m.remainingMiles, 0);
    const totalLiability = liabilityRecords.reduce((sum, r) => sum + r.estimatedLiability, 0);
    const pendingReview = liabilityRecords.filter(r => r.reviewStatus === '未复核').length;
    const expiredCount = getExpiredRecords().length;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const newThisMonth = liabilityRecords.filter(r => {
      const createDate = new Date(r.createTime);
      return createDate.getMonth() === thisMonth && createDate.getFullYear() === thisYear;
    }).length;

    return {
      totalMembers,
      totalMiles,
      totalLiability,
      pendingReview,
      expiredCount,
      newThisMonth,
    };
  }, [memberAccounts, liabilityRecords, getExpiredRecords]);

  const liabilityTrendData = useMemo(() => {
    const months: { name: string; value: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = formatDate(date, 'yyyy-MM');

      const monthLiability = liabilityRecords
        .filter(r => {
          const createDate = new Date(r.createTime);
          return createDate <= date;
        })
        .reduce((sum, r) => sum + r.estimatedLiability, 0);

      months.push({
        name: monthName,
        value: Number(monthLiability.toFixed(2)),
      });
    }

    return months;
  }, [liabilityRecords]);

  const businessTypeData = useMemo(() => {
    const categories = ['正常', '升舱退回', '活动双倍', '里程过期'];
    return categories.map(cat => ({
      name: cat,
      value: liabilityRecords.filter(r => r.businessCategory === cat).length,
    }));
  }, [liabilityRecords]);

  const accountTypeData = useMemo(() => {
    const types = ['普通', '银卡', '金卡', '白金卡'];
    return types.map(type => ({
      name: type,
      会员数: memberAccounts.filter(m => m.accountType === type).length,
      总里程: memberAccounts.filter(m => m.accountType === type).reduce((sum, m) => sum + m.remainingMiles, 0) / 10000,
    }));
  }, [memberAccounts]);

  const pendingRecords = useMemo(() => {
    return liabilityRecords
      .filter(r => r.reviewStatus === '未复核' && !r.isExpired)
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
      .slice(0, 5);
  }, [liabilityRecords]);

  const expiringSoonRecords = useMemo(() => {
    return liabilityRecords
      .filter(r => !r.isExpired && r.expireDate && isDateExpiringSoon(r.expireDate, 30))
      .sort((a, b) => {
        const daysA = daysUntilExpire(a.expireDate!);
        const daysB = daysUntilExpire(b.expireDate!);
        return daysA - daysB;
      })
      .slice(0, 5);
  }, [liabilityRecords]);

  const unprocessedBadRecords = useMemo(() => {
    return badRecords
      .filter(b => !b.isProcessed)
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
      .slice(0, 5);
  }, [badRecords]);

  const testMemberRecord = useMemo(() => {
    return liabilityRecords.find(r => r.memberNo === 'TEST-2024-EXPIRE');
  }, [liabilityRecords]);

  const recentLogs = useMemo(() => {
    return operationLogs.slice(0, 8);
  }, [operationLogs]);

  const quickActions = [
    { label: '数据导入', icon: Upload, path: '/import', color: 'bg-emerald-500' },
    { label: '批量复核', icon: CheckCircle2, path: '/liability', color: 'bg-blue-500' },
    { label: '特殊业务', icon: AlertTriangle, path: '/review', color: 'bg-amber-500' },
    { label: '数据导出', icon: FileText, path: '/liability', color: 'bg-purple-500' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">
            仪表盘
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            欢迎回来，实时监控里程负债业务状况
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            上次更新: {formatDateTime(new Date())}
          </div>
        </div>
      </div>

      {testMemberRecord && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-yellow-800">测试会员过期记录提醒</span>
              <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full font-medium">
                TEST-2024-EXPIRE
              </span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              测试会员 <span className="font-mono font-medium">TEST-2024-EXPIRE</span> 有
              <span className="font-semibold"> {formatMiles(testMemberRecord.remainingMiles)} </span>
              里程已过期，对应负债
              <span className="font-semibold"> {formatCurrency(testMemberRecord.estimatedLiability)}</span>。
              请前往
              <button
                onClick={() => navigate('/review')}
                className="mx-1 text-yellow-800 underline hover:text-yellow-900 font-medium"
              >
                特殊业务复核中心
              </button>
              处理该测试记录。
            </p>
            <div className="mt-2 flex items-center gap-2">
              <StatusTag status={testMemberRecord.businessCategory} type="business" />
              <StatusTag status={testMemberRecord.reviewStatus} type="review" />
              <span className="text-xs text-yellow-600">
                过期日期: {formatDate(testMemberRecord.expireDate)}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate(`/liability/${testMemberRecord.id}`)}
            className="btn btn-sm btn-warning gap-1"
          >
            <Eye className="w-4 h-4" />
            查看详情
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="总会员数"
          value={stats.totalMembers.toLocaleString()}
          icon={Users}
          color="from-blue-500 to-blue-600"
          suffix="人"
        />
        <StatCard
          title="总剩余里程"
          value={formatMiles(stats.totalMiles)}
          icon={Coins}
          color="from-emerald-500 to-emerald-600"
          suffix="里程"
        />
        <StatCard
          title="总估算负债"
          value={formatCurrency(stats.totalLiability).replace('¥', '')}
          icon={DollarSign}
          color="from-amber-500 to-amber-600"
          prefix="¥"
        />
        <StatCard
          title="待复核记录"
          value={stats.pendingReview.toLocaleString()}
          icon={Clock}
          color="from-purple-500 to-purple-600"
          suffix="条"
          highlight={stats.pendingReview > 0}
        />
        <StatCard
          title="过期记录"
          value={stats.expiredCount.toLocaleString()}
          icon={XCircle}
          color="from-red-500 to-red-600"
          suffix="条"
          highlight={stats.expiredCount > 0}
        />
        <StatCard
          title="本月新增"
          value={stats.newThisMonth.toLocaleString()}
          icon={TrendingUp}
          color="from-cyan-500 to-cyan-600"
          suffix="条"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#1E3A5F]" />
              <h3 className="font-semibold text-gray-900">近12个月负债趋势</h3>
            </div>
            <span className="text-xs text-gray-500">单位：万元</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={liabilityTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#9CA3AF"
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#9CA3AF"
                  tickFormatter={(value) => (value / 10000).toFixed(0)}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), '估算负债']}
                  labelFormatter={(label) => `${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1E3A5F"
                  strokeWidth={3}
                  dot={{ fill: '#1E3A5F', r: 4 }}
                  activeDot={{ r: 6, fill: '#2C5282' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-[#1E3A5F]" />
            <h3 className="font-semibold text-gray-900">业务类型分布</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={businessTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {businessTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} 条`, '数量']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#1E3A5F]" />
            <h3 className="font-semibold text-gray-900">账户类型分布</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountTypeData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="会员数" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="总里程" fill="#10B981" radius={[4, 4, 0, 0]} label="万" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900">快捷入口</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className={cn(
                    'p-4 rounded-xl border border transition-all duration-200 hover:-translate-y-0.5',
                    'animate-fade-in',
                    `stagger-${idx + 1}`
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', action.color)}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{action.label}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TodoSection
          title="待复核记录"
          icon={Clock}
          iconColor="text-blue-500"
          iconBg="bg-blue-50"
          records={pendingRecords}
          type="pending"
          onViewAll={() => {
            navigate('/liability');
          }}
          onViewRecord={(id) => navigate(`/liability/${id}`)}
          emptyText="暂无待复核记录"
        />

        <TodoSection
          title="即将过期（30天内）"
          icon={AlertTriangle}
          iconColor="text-amber-500"
          iconBg="bg-amber-50"
          records={expiringSoonRecords}
          type="expiring"
          onViewAll={() => navigate('/review')}
          onViewRecord={(id) => navigate(`/liability/${id}`)}
          emptyText="30天内无即将过期记录"
        />

        <TodoSection
          title="未处理坏行"
          icon={XCircle}
          iconColor="text-red-500"
          iconBg="bg-red-50"
          records={unprocessedBadRecords}
          type="badRecords"
          onViewAll={() => navigate('/bad-records')}
          onViewRecord={() => navigate('/bad-records')}
          emptyText="暂无未处理坏行"
        />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#1E3A5F]" />
            <h3 className="font-semibold text-gray-900">最近操作日志</h3>
          </div>
          <button
            onClick={() => navigate('/trace')}
            className="text-sm text-[#1E3A5F] hover:underline flex items-center gap-1"
          >
            查看全部
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>暂无操作日志</p>
            </div>
          ) : (
            recentLogs.map((log, idx) => (
              <LogItem key={log.id} log={log} index={idx} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  prefix?: string;
  suffix?: string;
  highlight?: boolean;
}> = ({ title, value, icon: Icon, color, prefix, suffix, highlight }) => {
  return (
    <div className={cn(
      'stat-card-secondary card-hover animate-fade-in',
      highlight && 'ring-2 ring-red-200'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            {prefix && <span className="text-lg font-medium text-gray-500">{prefix}</span>}
            <span className={cn(
              'text-2xl font-bold',
              highlight ? 'text-red-600' : 'text-gray-900'
            )}>
              {value}
            </span>
            {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
          </div>
        </div>
        <div className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br',
          color
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

interface TodoSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  records: LiabilityRecord[] | BadRecord[];
  type: 'pending' | 'expiring' | 'badRecords';
  onViewAll: () => void;
  onViewRecord: (id: string) => void;
  emptyText: string;
}

const TodoSection: React.FC<TodoSectionProps> = ({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  records,
  type,
  onViewAll,
  onViewRecord,
  emptyText,
}) => {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconBg)}>
            <Icon className={cn('w-4 h-4', iconColor)} />
          </div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="badge bg-gray-100 text-gray-600">{records.length}</span>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-[#1E3A5F] hover:underline flex items-center gap-1"
        >
          全部
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2">
        {records.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          records.map((record, idx) => (
            <TodoItem
              key={record.id}
              record={record}
              type={type}
              onView={() => onViewRecord(record.id)}
              index={idx}
            />
          ))
        )}
      </div>
    </div>
  );
};

const TodoItem: React.FC<{
  record: LiabilityRecord | BadRecord;
  type: 'pending' | 'expiring' | 'badRecords';
  onView: () => void;
  index: number;
}> = ({ record, type, onView, index }) => {
  const isLiability = 'memberNo' in record;
  const isTestAccount = isLiability && record.memberNo === 'TEST-2024-EXPIRE';

  if (type === 'badRecords') {
    const badRecord = record as BadRecord;
    return (
      <div
        className={cn(
          'p-3 border border rounded-lg border border hover:bg-gray-50 cursor-pointer transition-colors animate-fade-in',
          `stagger-${index + 1}`
        )}
        onClick={onView}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusTag status={badRecord.errorType} type="error" />
              <span className="text-xs text-gray-500 truncate">{badRecord.sourceType}</span>
            </div>
            <p className="text-sm text-gray-900 truncate">{badRecord.errorDescription}</p>
            <p className="text-xs text-gray-500 mt-1">
              {badRecord.sourceFile} · 第{badRecord.rowNumber}行
            </p>
          </div>
          <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    );
  }

  const liability = record as LiabilityRecord;
  const days = liability.expireDate ? daysUntilExpire(liability.expireDate) : 0;

  return (
    <div
      className={cn(
        'p-3 border border rounded-lg border border hover:bg-gray-50 cursor-pointer transition-colors animate-fade-in',
        isTestAccount && 'bg-yellow-50/50 border-yellow-200',
        `stagger-${index + 1}`
      )}
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'font-mono text-sm',
              isTestAccount && 'text-yellow-700 font-semibold'
            )}>
              {liability.memberNo}
            </span>
            {isTestAccount && (
              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded">
                测试
              </span>
            )}
            {type === 'expiring' && (
              <span className={cn(
                'px-1.5 py-0.5 text-[10px] rounded',
                days <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              )}>
                {days <= 0 ? '已过期' : `${days}天后过期`}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-900 truncate">{liability.memberName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">
              {formatMiles(liability.remainingMiles)} 里程
            </span>
            <span className="text-xs text-gray-300">|</span>
            <span className="text-xs text-[#1E3A5F] font-medium">
              {formatCurrency(liability.estimatedLiability)}
            </span>
          </div>
          {type === 'expiring' && liability.expireDate && (
            <p className="text-xs text-gray-500 mt-1">
              过期日期: {formatDate(liability.expireDate)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusTag status={liability.businessCategory} type="business" />
          <Eye className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
};

const LogItem: React.FC<{ log: OperationLog; index: number }> = ({ log, index }) => {
  const getOperationIcon = () => {
    switch (log.operationType) {
      case '导入': return <Upload className="w-4 h-4 text-emerald-500" />;
      case '复核': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case '冲回': return <XCircle className="w-4 h-4 text-red-500" />;
      case '导出': return <FileText className="w-4 h-4 text-purple-500" />;
      case '刷新': return <TrendingUp className="w-4 h-4 text-amber-500" />;
      default: return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  const getOperationColor = () => {
    switch (log.operationType) {
      case '导入': return 'bg-emerald-50 text-emerald-700';
      case '复核': return 'bg-blue-50 text-blue-700';
      case '冲回': return 'bg-red-50 text-red-700';
      case '导出': return 'bg-purple-50 text-purple-700';
      case '刷新': return 'bg-amber-50 text-amber-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors animate-fade-in',
        `stagger-${(index % 4) + 1}`
      )}
    >
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        {getOperationIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">{log.operator}</span>
          <span className={cn('px-2 py-0.5 text-xs rounded-full', getOperationColor())}>
            {log.operationType}
          </span>
          <span className="text-xs text-gray-500">{log.targetType}</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">{log.detail}</p>
        <p className="text-xs text-gray-400 mt-1">{log.createTime}</p>
      </div>
    </div>
  );
};
