import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  Droplets,
  Thermometer,
  Wind,
  Activity,
  Clock,
  MapPin,
  Bell,
  BellOff,
  CheckCircle,
  ArrowRight,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  X,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, getStatistics } from '../mock/data';
import { WaterQualityData, WATER_QUALITY_PARAMS, WATER_QUALITY_THRESHOLDS, SEVERITY_LABELS } from '../types';
import StatCard from '../components/StatCard';
import ActionableErrorCard from '../components/ActionableErrorCard';

const PARAM_ICONS = {
  ph: Activity,
  temperature: Thermometer,
  salinity: Droplets,
  dissolved_oxygen: Wind,
  turbidity: Activity,
};

const PARAM_COLORS = {
  ph: '#3E92CC',
  temperature: '#F39C12',
  salinity: '#2ECC71',
  dissolved_oxygen: '#9B59B6',
  turbidity: '#E74C3C',
};

export default function WaterQualityCenter() {
  const { waterQualityData, reviewTasks, actionableErrors, addNotification } = useAppStore();
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [selectedParam, setSelectedParam] = useState<keyof typeof WATER_QUALITY_PARAMS | 'all'>('all');
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const stats = useMemo(() => getStatistics(), []);

  const stations = useMemo(() => {
    const stationSet = new Set(waterQualityData.map(d => d.stationId));
    return Array.from(stationSet).map(id => ({
      id,
      name: waterQualityData.find(d => d.stationId === id)?.stationName || '',
    }));
  }, [waterQualityData]);

  const latestData = useMemo(() => {
    const latestMap = new Map<string, WaterQualityData>();
    waterQualityData.forEach(d => {
      const existing = latestMap.get(d.stationId);
      if (!existing || d.timestamp > existing.timestamp) {
        latestMap.set(d.stationId, d);
      }
    });
    return Array.from(latestMap.values());
  }, [waterQualityData]);

  const activeAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      data: WaterQualityData;
      param: keyof typeof WATER_QUALITY_PARAMS;
      value: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    latestData.forEach(data => {
      (Object.keys(WATER_QUALITY_PARAMS) as Array<keyof typeof WATER_QUALITY_PARAMS>).forEach(param => {
        const value = data[param];
        const thresholds = WATER_QUALITY_THRESHOLDS[param];
        
        if (value < thresholds.min || value > thresholds.max) {
          const deviation = Math.abs(value - (thresholds.min + thresholds.max) / 2);
          const range = Math.abs(thresholds.max - thresholds.min);
          const severity = 
            deviation > range * 0.75
              ? 'critical'
              : deviation > range * 0.5
              ? 'high'
              : 'medium';
          
          alerts.push({
            id: `${data.id}-${param}`,
            data,
            param,
            value,
            severity,
          });
        }
      });
    });

    return alerts.filter(a => !dismissedAlerts.has(a.id));
  }, [latestData, dismissedAlerts]);

  const chartData = useMemo(() => {
    let filtered = waterQualityData;
    
    if (selectedStation !== 'all') {
      filtered = filtered.filter(d => d.stationId === selectedStation);
    }
    
    filtered = filtered.sort((a, b) => a.timestamp - b.timestamp);
    
    return filtered.map(d => ({
      time: formatDateTime(d.timestamp).slice(11, 16),
      date: formatDateTime(d.timestamp).slice(5, 10),
      ph: d.ph,
      temperature: d.temperature,
      salinity: d.salinity,
      dissolved_oxygen: d.dissolved_oxygen,
      turbidity: d.turbidity,
      stationName: d.stationName,
    }));
  }, [waterQualityData, selectedStation]);

  const paramList = (Object.keys(WATER_QUALITY_PARAMS) as Array<keyof typeof WATER_QUALITY_PARAMS>);

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const handleAcknowledge = (alertId: string) => {
    handleDismissAlert(alertId);
    addNotification('已确认该预警，已创建复核任务', 'success');
  };

  const handleRefresh = () => {
    addNotification('水质数据已刷新', 'info');
  };

  return (
    <div className="min-h-screen bg-ocean-gradient bg-grid-pattern bg-grid p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-ocean-100">水质预警中心</h1>
            <p className="text-sm text-ocean-400 mt-1">实时监测海洋碳汇样地水质参数，异常自动预警</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新数据
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出报告
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <StatCard
            title="监测站点"
            value={stats.waterQuality.stations}
            icon={MapPin}
            color="default"
          />
          <StatCard
            title="PH 值"
            value="8.1"
            icon={Activity}
            color="available"
            subtitle="正常范围"
          />
          <StatCard
            title="水温"
            value="14.2°C"
            icon={Thermometer}
            color="suspended"
            trend="up"
            trendValue="+0.3°C"
          />
          <StatCard
            title="溶解氧"
            value="7.8 mg/L"
            icon={Wind}
            color="available"
          />
          <StatCard
            title="活跃预警"
            value={activeAlerts.length}
            icon={AlertTriangle}
            color={activeAlerts.length > 0 ? 'recollect' : 'available'}
          />
        </div>

        {actionableErrors.filter(e => e.code.startsWith('WQ')).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-ocean-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              水质相关问题
            </h3>
            {actionableErrors.filter(e => e.code.startsWith('WQ')).slice(0, 1).map(error => (
              <ActionableErrorCard key={error.id} error={error} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 space-y-4">
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-ocean-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  水质趋势分析
                </h3>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    className="input-field text-xs py-1.5 w-40"
                  >
                    <option value="all">全部监测站</option>
                    {stations.map(station => (
                      <option key={station.id} value={station.id}>{station.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedParam}
                    onChange={(e) => setSelectedParam(e.target.value as any)}
                    className="input-field text-xs py-1.5 w-32"
                  >
                    <option value="all">全部参数</option>
                    {paramList.map(param => (
                      <option key={param} value={param}>{WATER_QUALITY_PARAMS[param]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      {paramList.map(param => (
                        <linearGradient key={param} id={`color-${param}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PARAM_COLORS[param]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={PARAM_COLORS[param]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#4a6fa5" 
                      tick={{ fill: '#7faed6', fontSize: 11 }}
                    />
                    <YAxis stroke="#4a6fa5" tick={{ fill: '#7faed6', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a1929',
                        border: '1px solid #1e3a5f',
                        borderRadius: '8px',
                        color: '#e8f4fc',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: '#7faed6' }}
                    />
                    {(selectedParam === 'all' ? paramList : [selectedParam]).map(param => (
                      <Area
                        key={param}
                        type="monotone"
                        dataKey={param}
                        name={WATER_QUALITY_PARAMS[param]}
                        stroke={PARAM_COLORS[param]}
                        fillOpacity={1}
                        fill={`url(#color-${param})`}
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 mt-4">
                {(selectedParam === 'all' ? paramList : [selectedParam]).map(param => (
                  <div key={param} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: PARAM_COLORS[param] }}
                    />
                    <span className="text-xs text-ocean-300">{WATER_QUALITY_PARAMS[param]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-ocean-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  监测站点实时数据
                </h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-ocean-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyAlerts}
                      onChange={(e) => setShowOnlyAlerts(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-ocean-600 bg-ocean-800 text-ocean-400 focus:ring-ocean-500"
                    />
                    仅显示异常
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {latestData.map(data => {
                  const hasAlert = activeAlerts.some(a => a.data.id === data.id);
                  if (showOnlyAlerts && !hasAlert) return null;

                  return (
                    <div
                      key={data.id}
                      className={`p-4 bg-ocean-900/50 rounded-lg border transition-all ${
                        hasAlert 
                          ? 'border-data-recollect/50 bg-data-recollect/10' 
                          : 'border-ocean-700/30 hover:border-ocean-600/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-medium text-ocean-100">{data.stationName}</h4>
                          <p className="text-xs text-ocean-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(data.timestamp).slice(11, 16)} 更新
                          </p>
                        </div>
                        {hasAlert && (
                          <StatusBadge status="critical" type="severity" />
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {paramList.slice(0, 4).map(param => {
                          const Icon = PARAM_ICONS[param];
                          const thresholds = WATER_QUALITY_THRESHOLDS[param];
                          const value = data[param];
                          const isNormal = value >= thresholds.min && value <= thresholds.max;

                          return (
                            <div key={param} className="p-2 bg-ocean-800/30 rounded">
                              <div className="flex items-center gap-1 mb-1">
                                <Icon className="w-3 h-3 text-ocean-400" />
                                <span className="text-[10px] text-ocean-400">{WATER_QUALITY_PARAMS[param]}</span>
                              </div>
                              <p className={`text-sm font-mono font-bold ${
                                isNormal ? 'text-ocean-200' : 'text-data-recollect'
                              }`}>
                                {value.toFixed(1)}
                              </p>
                              <p className="text-[10px] text-ocean-500">
                                {thresholds.min}-{thresholds.max}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="col-span-4 space-y-4">
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-ocean-100 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-data-recollect" />
                  实时预警
                  {activeAlerts.length > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-data-recollect/20 text-data-recollect rounded-full">
                      {activeAlerts.length}
                    </span>
                  )}
                </h3>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {activeAlerts.length === 0 ? (
                  <div className="text-center py-8 text-ocean-400">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无预警信息</p>
                    <p className="text-xs">所有监测数据正常</p>
                  </div>
                ) : (
                  activeAlerts.map(alert => {
                    const thresholds = WATER_QUALITY_THRESHOLDS[alert.param];
                    const isBelow = alert.value < thresholds.min;

                    return (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border ${
                          alert.severity === 'critical'
                            ? 'bg-data-recollect/10 border-data-recollect/50'
                            : 'bg-data-suspended/10 border-data-suspended/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={alert.severity} type="severity" />
                            <span className="text-xs text-ocean-300">{alert.data.stationName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDismissAlert(alert.id)}
                              className="p-1 hover:bg-ocean-700/50 rounded transition-colors"
                              title="忽略"
                            >
                              <BellOff className="w-3.5 h-3.5 text-ocean-400" />
                            </button>
                            <button
                              onClick={() => handleDismissAlert(alert.id)}
                              className="p-1 hover:bg-ocean-700/50 rounded transition-colors"
                              title="关闭"
                            >
                              <X className="w-3.5 h-3.5 text-ocean-400" />
                            </button>
                          </div>
                        </div>

                        <p className="text-sm text-ocean-100 mb-1">
                          {WATER_QUALITY_PARAMS[alert.param]} {isBelow ? '低于' : '高于'}阈值
                        </p>
                        <p className="text-xs text-ocean-400 mb-2">
                          当前值: <span className={alert.severity === 'critical' ? 'text-data-recollect font-mono font-bold' : 'text-data-suspended font-mono font-bold'}>
                            {alert.value.toFixed(2)}
                          </span>
                          , 正常范围: {thresholds.min}-{thresholds.max}
                        </p>
                        <p className="text-[10px] text-ocean-500 mb-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(alert.data.timestamp)}
                        </p>

                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="w-full btn-primary text-xs py-1.5 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          确认并创建复核任务
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="glass-panel p-4">
              <h3 className="font-medium text-ocean-100 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                待复核任务
              </h3>
              <div className="space-y-2">
                {reviewTasks.filter(t => t.status === 'pending').slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-ocean-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={task.status} type="review" />
                      <div>
                        <p className="text-sm text-ocean-100">{task.title}</p>
                        <p className="text-xs text-ocean-400">{task.type}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-ocean-400" />
                  </div>
                ))}
                {reviewTasks.filter(t => t.status === 'pending').length === 0 && (
                  <div className="text-center py-4 text-ocean-400 text-sm">
                    暂无待复核任务
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel p-4 bg-gradient-to-br from-ocean-600/20 to-ocean-800/20">
              <h3 className="font-medium text-ocean-100 mb-2">预警说明</h3>
              <p className="text-xs text-ocean-300 leading-relaxed">
                系统每5分钟自动检测各监测站水质参数。当PH值、水温、溶解氧等指标超出阈值时，
                将自动触发预警并推送至海事安全员。确认后的预警将创建复核任务，
                经海事处审批后可标记为已处理。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
