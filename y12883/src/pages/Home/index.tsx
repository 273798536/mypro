import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wind,
  Waves,
  Eye,
  CalendarClock,
  Calculator,
  Database,
  Edit3,
  Camera,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import DataCard from '@/components/DataCard';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime, formatWindDirection, getRelativeTime } from '@/utils/formatters';

export default function HomePage() {
  const { buoyData, windWindowResults, correctionRecords, inspectionPhotos, isFirstVisit } = useAppStore();
  const [latestData, setLatestData] = useState<typeof buoyData[0] | null>(null);
  const [latestWindow, setLatestWindow] = useState<typeof windWindowResults[0] | null>(null);

  useEffect(() => {
    if (buoyData.length > 0) {
      const sorted = [...buoyData].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setLatestData(sorted[0]);
    }
  }, [buoyData]);

  useEffect(() => {
    if (windWindowResults.length > 0) {
      const sorted = [...windWindowResults].sort(
        (a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
      );
      setLatestWindow(sorted[0]);
    }
  }, [windWindowResults]);

  const quickLinks = [
    {
      path: '/calculator',
      title: '风浪窗口计算',
      description: '输入参数计算换班窗口期',
      icon: Calculator,
      color: 'from-ocean-500 to-ocean-600',
    },
    {
      path: '/buoy-data',
      title: '浮标数据管理',
      description: `${buoyData.length}条数据记录`,
      icon: Database,
      color: 'from-blue-500 to-blue-600',
    },
    {
      path: '/corrections',
      title: '修正记录',
      description: `${correctionRecords.filter((r) => r.status === 'pending').length}条待确认`,
      icon: Edit3,
      color: 'from-amber-500 to-amber-600',
    },
    {
      path: '/photos',
      title: '巡检照片',
      description: `${inspectionPhotos.length}张照片记录`,
      icon: Camera,
      color: 'from-purple-500 to-purple-600',
    },
  ];

  const stats = [
    {
      label: '数据总量',
      value: buoyData.length,
      unit: '条',
      icon: <Database size={20} />,
      status: 'normal' as const,
    },
    {
      label: '待修正',
      value: correctionRecords.filter((r) => r.status === 'pending').length,
      unit: '条',
      icon: <Edit3 size={20} />,
      status: 'warning' as const,
    },
    {
      label: '问题照片',
      value: inspectionPhotos.filter((p) => p.hasIssue).length,
      unit: '张',
      icon: <AlertTriangle size={20} />,
      status: 'danger' as const,
    },
  ];

  if (isFirstVisit) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display mb-1">水质预警 · 概览</h1>
          <p className="text-gray-400 text-sm">船员换班风浪窗口日常入口</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">最后更新</span>
          {latestData && (
            <span className="text-sm text-gray-300">{getRelativeTime(latestData.timestamp)}</span>
          )}
        </div>
      </div>

      {latestWindow && (
        <div
          className="relative overflow-hidden rounded-2xl border border-ocean-500/20 bg-gradient-to-r from-ocean-500/10 via-deep-600/50 to-deep-600/50 p-6"
          style={{
            opacity: 0,
            animation: 'fadeInUp 0.6s ease-out 0.1s forwards',
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-ocean-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <CalendarClock size={24} className="text-ocean-400" />
                <h2 className="text-lg font-semibold text-white font-display">最新风浪窗口</h2>
                <StatusBadge type="safety" status={latestWindow.safetyLevel} />
              </div>
              <p className="text-gray-300 text-sm mb-4 max-w-xl">{latestWindow.description}</p>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">开始时间</p>
                  <p className="text-sm font-medium text-white">{formatDateTime(latestWindow.startTime)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">结束时间</p>
                  <p className="text-sm font-medium text-white">{formatDateTime(latestWindow.endTime)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">安全指数</p>
                  <p className="text-sm font-medium text-ocean-400">
                    {(latestWindow.safetyScore * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/calculator"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ocean-500/20 border border-ocean-500/30 text-ocean-300 text-sm hover:bg-ocean-500/30 transition-colors"
            >
              重新计算
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {latestData && (
          <>
            <DataCard
              title="最新风速"
              value={latestData.windSpeed.toFixed(1)}
              unit="m/s"
              icon={<Wind size={22} />}
              trend={latestData.windSpeed > 8 ? 'up' : 'down'}
              trendValue={formatWindDirection(latestData.windDirection)}
              status={latestData.windSpeed > 10.8 ? 'danger' : latestData.windSpeed > 8 ? 'warning' : 'normal'}
              delay={100}
            />
            <DataCard
              title="最新浪高"
              value={latestData.waveHeight.toFixed(2)}
              unit="m"
              icon={<Waves size={22} />}
              subtitle={`周期 ${latestData.wavePeriod.toFixed(1)}s`}
              status={latestData.waveHeight > 1.5 ? 'danger' : latestData.waveHeight > 1.0 ? 'warning' : 'normal'}
              delay={150}
            />
            <DataCard
              title="能见度"
              value={latestData.visibility}
              unit="m"
              icon={<Eye size={22} />}
              subtitle={latestData.stationName}
              status={latestData.visibility < 1000 ? 'danger' : latestData.visibility < 1500 ? 'warning' : 'normal'}
              delay={200}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white font-display">快捷入口</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5
                           hover:bg-white/10 hover:border-white/20 transition-all duration-300
                           hover:shadow-lg hover:shadow-black/20"
                  style={{
                    opacity: 0,
                    animation: `fadeInUp 0.5s ease-out ${300 + index * 100}ms forwards`,
                  }}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${link.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${link.color} shadow-lg`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1 group-hover:text-ocean-300 transition-colors">
                        {link.title}
                      </h4>
                      <p className="text-sm text-gray-400">{link.description}</p>
                    </div>
                    <ChevronRight size={20} className="text-gray-600 group-hover:text-ocean-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white font-display">数据统计</h3>
            <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5
                         hover:bg-white/10 transition-colors"
                style={{
                  opacity: 0,
                  animation: `fadeInUp 0.5s ease-out ${400 + index * 100}ms forwards`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5 text-gray-400">
                    {stat.icon}
                  </div>
                  <span className="text-sm text-gray-300">{stat.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-bold font-display ${
                    stat.status === 'danger' ? 'text-red-400' :
                    stat.status === 'warning' ? 'text-amber-400' : 'text-white'
                  }`}>
                    {stat.value}
                  </span>
                  <span className="text-xs text-gray-500">{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white font-display">最近浮标数据</h3>
          <Link to="/buoy-data" className="text-sm text-ocean-400 hover:text-ocean-300 flex items-center gap-1">
            查看全部 <ChevronRight size={14} />
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">站点</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">风速</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">浪高</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">能见度</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
              </tr>
            </thead>
            <tbody>
              {buoyData.slice(0, 5).map((data, index) => (
                <tr
                  key={data.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  style={{
                    opacity: 0,
                    animation: `fadeInUp 0.4s ease-out ${500 + index * 80}ms forwards`,
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm text-white font-medium">{data.stationName}</p>
                    <p className="text-xs text-gray-500">{data.dataSource}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatDateTime(data.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${
                      data.windSpeed > 10.8 ? 'text-red-400' :
                      data.windSpeed > 8 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {data.windSpeed.toFixed(1)} m/s
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${
                      data.waveHeight > 1.5 ? 'text-red-400' :
                      data.waveHeight > 1.0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {data.waveHeight.toFixed(2)} m
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${
                      data.visibility < 1000 ? 'text-red-400' :
                      data.visibility < 1500 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {data.visibility} m
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge type="buoy" status={data.status} size="sm" />
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
