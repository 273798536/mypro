import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, FileCheck, AlertTriangle, GitMerge, MapPin, Download } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useStore } from '../store';
import { ChangeHistoryList } from '../components/common/ChangeHistoryList';
import type { BoxStatus, CityStatus } from '../types';

const PIE_COLORS: Record<BoxStatus, string> = {
  pending: '#9CA3AF',
  transit: '#4173B4',
  arrived: '#F59E0B',
  signed: '#2ECC71',
};

const STATUS_LABELS: Record<BoxStatus, string> = {
  pending: '待发货',
  transit: '运输中',
  arrived: '已到达',
  signed: '已签收',
};

const CITY_STATUS_COLORS: Record<CityStatus, string> = {
  scheduled: '#9CA3AF',
  'in-progress': '#4173B4',
  completed: '#2ECC71',
};

export function Dashboard() {
  const boxes = useStore((s) => s.boxes);
  const shipments = useStore((s) => s.shipments);
  const alerts = useStore((s) => s.alerts);
  const conflicts = useStore((s) => s.conflicts);
  const cities = useStore((s) => s.cities);
  const changeHistory = useStore((s) => s.changeHistory);

  const arrivedCount = useMemo(
    () => shipments.filter((s) => s.status === 'arrived').length,
    [shipments],
  );

  const activeAlertCount = useMemo(
    () => alerts.filter((a) => a.status === 'active').length,
    [alerts],
  );

  const pendingConflictCount = useMemo(
    () => conflicts.filter((c) => c.status === 'pending').length,
    [conflicts],
  );

  const pieData = useMemo(() => {
    const counts: Record<BoxStatus, number> = { pending: 0, transit: 0, arrived: 0, signed: 0 };
    boxes.forEach((b) => { counts[b.status]++; });
    return (Object.entries(counts) as [BoxStatus, number][]).map(([status, value]) => ({
      name: STATUS_LABELS[status],
      value,
      status,
    }));
  }, [boxes]);

  const barData = useMemo(() => {
    return cities.map((city) => {
      const cityShipments = shipments.filter((s) => s.cityId === city.id);
      const signedCount = cityShipments.filter((s) => s.status === 'signed').length;
      return {
        name: city.name,
        完成: signedCount,
        fill: CITY_STATUS_COLORS[city.status],
      };
    });
  }, [cities, shipments]);

  const recentChanges = useMemo(
    () => changeHistory.slice(0, 5),
    [changeHistory],
  );

  const statCards = [
    { label: '物资总数', value: boxes.length, icon: Package, bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: '待签收', value: arrivedCount, icon: FileCheck, bg: 'bg-yellow-50', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' },
    { label: '活跃预警', value: activeAlertCount, icon: AlertTriangle, bg: 'bg-red-50', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
    { label: '待处理冲突', value: pendingConflictCount, icon: GitMerge, bg: 'bg-orange-50', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-primary-800">仪表盘</h1>

      <div className="grid grid-cols-4 gap-5">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className="bg-white rounded-lg shadow-card p-5 flex items-center gap-4 animate-slide-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className={`w-12 h-12 rounded-full ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
              <card.icon size={22} className={card.iconColor} />
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-text">{card.value}</div>
              <div className="text-sm text-gray-500">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-lg shadow-card p-5">
          <h2 className="text-lg font-semibold text-primary-800 mb-4">物资状态分布</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => value > 0 ? `${name} ${value}` : ''}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.status} fill={PIE_COLORS[entry.status]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-card p-5">
          <h2 className="text-lg font-semibold text-primary-800 mb-4">城市场次进度</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 13 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="完成" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card p-5">
        <h2 className="text-lg font-semibold text-primary-800 mb-4">最近变更</h2>
        <ChangeHistoryList records={recentChanges} />
      </div>

      <div className="flex gap-4">
        <Link
          to="/boxes/new"
          className="flex items-center gap-2 px-5 py-3 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Package size={18} />
          添加物资
        </Link>
        <Link
          to="/cities/new"
          className="flex items-center gap-2 px-5 py-3 bg-accent-warning text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <MapPin size={18} />
          新增场次
        </Link>
        <Link
          to="/reports/export"
          className="flex items-center gap-2 px-5 py-3 bg-accent-success text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Download size={18} />
          导出报告
        </Link>
      </div>
    </div>
  );
}
