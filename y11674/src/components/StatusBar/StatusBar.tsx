import { AlertTriangle, Users, GitBranch, Database, HelpCircle } from 'lucide-react';
import { useNetworkStore } from '../../store/useNetworkStore';

export function StatusBar() {
  const { nodes, edges, anomalies } = useNetworkStore();

  const stats = [
    {
      icon: <Users size={14} />,
      label: '节点',
      value: nodes.length,
      color: 'text-blue-400',
    },
    {
      icon: <GitBranch size={14} />,
      label: '关系',
      value: edges.length,
      color: 'text-green-400',
    },
    {
      icon: <AlertTriangle size={14} />,
      label: '异常',
      value: anomalies.length,
      color: anomalies.length > 0 ? 'text-red-400' : 'text-slate-400',
    },
    {
      icon: <Database size={14} />,
      label: '黑名单',
      value: nodes.filter(n => n.isBlacklist).length,
      color: 'text-red-400',
    },
  ];

  return (
    <div className="h-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className={stat.color}>{stat.icon}</span>
            <span className="text-slate-400 text-xs">{stat.label}:</span>
            <span className={`font-mono text-sm font-bold ${stat.color}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <HelpCircle size={14} className="text-slate-500" />
        <span className="text-slate-500 text-xs">
          提示：点击节点查看详情，拖动节点调整位置，滚轮缩放视图
        </span>
      </div>
    </div>
  );
}
