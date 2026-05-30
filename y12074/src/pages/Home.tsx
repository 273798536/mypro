import { Link } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  Gauge,
  Layers,
  FileText,
  ArrowRight,
  Database,
  Play,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getAnomalyTypeLabel, getAnomalyTypeColor } from '@/utils/anomalyDetector';
import { cn } from '@/lib/utils';

export default function Home() {
  const { luggageData, anomalies, chuteModels, badRows } = useAppStore();

  const heightMismatchCount = anomalies.filter((a) => a.type === 'height_mismatch').length;
  const speedOverCount = anomalies.filter((a) => a.type === 'speed_over').length;
  const stackedCount = anomalies.filter((a) => a.type === 'stacked').length;
  const unreviewedCount = anomalies.filter((a) => !a.reviewed).length;

  const stats = [
    {
      label: '行李总数',
      value: luggageData.length,
      icon: <Package size={24} />,
      color: '#165DFF',
      bgColor: '#165DFF20',
    },
    {
      label: '异常总数',
      value: anomalies.length,
      icon: <AlertTriangle size={24} />,
      color: '#F53F3F',
      bgColor: '#F53F3F20',
    },
    {
      label: '滑槽模型',
      value: chuteModels.length,
      icon: <Layers size={24} />,
      color: '#00B42A',
      bgColor: '#00B42A20',
    },
    {
      label: '待复核',
      value: unreviewedCount,
      icon: <FileText size={24} />,
      color: '#FF7D00',
      bgColor: '#FF7D0020',
    },
  ];

  const quickActions = [
    {
      title: '数据导入',
      description: '上传CSV或Excel数据文件',
      icon: <Database size={20} />,
      path: '/import',
      color: '#165DFF',
    },
    {
      title: '滑槽仿真',
      description: '查看3D模型和动画播放',
      icon: <Play size={20} />,
      path: '/simulation',
      color: '#722ED1',
    },
    {
      title: '异常分析',
      description: '筛选和复核异常事件',
      icon: <AlertTriangle size={20} />,
      path: '/anomalies',
      color: '#F53F3F',
    },
    {
      title: '报告导出',
      description: '生成带截图的分析报告',
      icon: <FileText size={20} />,
      path: '/report',
      color: '#00B42A',
    },
  ];

  const anomalyBreakdown = [
    { type: 'height_mismatch' as const, count: heightMismatchCount },
    { type: 'speed_over' as const, count: speedOverCount },
    { type: 'stacked' as const, count: stackedCount },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">机场行李滑槽仿真系统</h1>
          <p className="text-gray-400 mt-1">实时监控行李传输状态，自动检测异常事件</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-gray-400 text-sm">数据已加载</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: stat.bgColor, color: stat.color }}
              >
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">异常类型分布</h2>
          <div className="space-y-4">
            {anomalyBreakdown.map((item, index) => {
              const percentage = anomalies.length > 0 ? (item.count / anomalies.length) * 100 : 0;
              const color = getAnomalyTypeColor(item.type);
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-gray-300 text-sm">
                        {getAnomalyTypeLabel(item.type)}
                      </span>
                    </div>
                    <span className="text-white font-mono text-sm">
                      {item.count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {badRows.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-400 font-medium">坏行记录</p>
                  <p className="text-gray-400 text-sm mt-1">
                    共发现 {badRows.length} 条异常数据行
                  </p>
                </div>
                <Link
                  to="/import"
                  className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1"
                >
                  查看详情 <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">快捷操作</h2>
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.path}
                className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
              >
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${action.color}20`, color: action.color }}
                >
                  {action.icon}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{action.title}</p>
                  <p className="text-gray-500 text-xs">{action.description}</p>
                </div>
                <ArrowRight
                  size={16}
                  className="text-gray-500 group-hover:text-white transition-colors"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">最近异常事件</h2>
          <Link
            to="/anomalies"
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
          >
            查看全部 <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {anomalies.slice(0, 4).map((anomaly) => {
            const color = getAnomalyTypeColor(anomaly.type);
            return (
              <div
                key={anomaly.id}
                className={cn(
                  'bg-gray-800/50 rounded-lg p-4 border-l-4',
                  anomaly.reviewed ? 'border-gray-600' : ''
                )}
                style={!anomaly.reviewed ? { borderLeftColor: color } : {}}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-medium"
                        style={{ color }}
                      >
                        {getAnomalyTypeLabel(anomaly.type)}
                      </span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          anomaly.reviewed
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        )}
                      >
                        {anomaly.reviewed ? '已复核' : '待复核'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-2 line-clamp-2">
                      {anomaly.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-mono text-sm">
                      {anomaly.position.toFixed(2)}m
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {anomaly.luggageIds.length}件
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
