import { X, AlertTriangle, CheckCircle, Clock, Download, Layers, Users, Activity, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNetworkStore } from '../../store/networkStore';

export const ReportModal = () => {
  const { showReport, setShowReport, getStats, nodes, anomalies, auditTrails, exportJSON } = useNetworkStore();
  const stats = getStats();

  const statusData = [
    { name: '未处理', value: stats.untreated, color: '#6b7280' },
    { name: '已修正', value: stats.corrected, color: '#00ff88' },
    { name: '待确认', value: stats.pending, color: '#ffcc00' },
  ];

  const anomalyData = [
    { name: '循环转账', value: anomalies.filter(a => a.type === 'cycle').length },
    { name: '交易所中转', value: anomalies.filter(a => a.type === 'exchange_hub').length },
    { name: '标签冲突', value: anomalies.filter(a => a.type === 'tag_conflict').length },
  ];

  const handleExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {showReport && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowReport(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl max-h-[90vh] bg-glass-bg backdrop-blur-xl rounded-3xl border border-glass-border overflow-hidden"
          >
            <div className="p-6 border-b border-glass-border flex items-center justify-between">
              <div>
                <h2 className="font-orbitron text-2xl font-bold text-white">分析报告</h2>
                <p className="text-gray-400 text-sm mt-1">交易网络调查分析概览</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-space-blue/50 border border-glass-border rounded-xl text-gray-300 hover:text-white hover:border-neon-cyan transition-all"
                >
                  <Download className="w-4 h-4" />
                  导出报告
                </button>
                <button
                  onClick={() => setShowReport(false)}
                  className="p-2 rounded-xl hover:bg-space-blue/50 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard
                  icon={<Layers className="w-5 h-5" />}
                  label="总节点数"
                  value={stats.totalNodes}
                  color="text-neon-cyan"
                />
                <StatCard
                  icon={<Activity className="w-5 h-5" />}
                  label="总连接数"
                  value={stats.totalEdges}
                  color="text-neon-purple"
                />
                <StatCard
                  icon={<Users className="w-5 h-5" />}
                  label="交易所地址"
                  value={stats.exchanges}
                  color="text-neon-cyan"
                />
                <StatCard
                  icon={<AlertTriangle className="w-5 h-5" />}
                  label="可疑地址"
                  value={stats.suspicious}
                  color="text-neon-red"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <StatusCard
                  icon={<Clock className="w-6 h-6" />}
                  label="未处理"
                  value={stats.untreated}
                  total={stats.totalNodes}
                  color="bg-gray-500"
                  bgColor="bg-gray-500/10"
                  borderColor="border-gray-500/30"
                />
                <StatusCard
                  icon={<CheckCircle className="w-6 h-6" />}
                  label="已修正"
                  value={stats.corrected}
                  total={stats.totalNodes}
                  color="bg-neon-green"
                  bgColor="bg-neon-green/10"
                  borderColor="border-neon-green/30"
                />
                <StatusCard
                  icon={<AlertTriangle className="w-6 h-6" />}
                  label="需人工确认"
                  value={stats.pending}
                  total={stats.totalNodes}
                  color="bg-neon-yellow"
                  bgColor="bg-neon-yellow/10"
                  borderColor="border-neon-yellow/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-space-blue/30 rounded-2xl border border-glass-border">
                  <h3 className="font-orbitron font-bold text-white mb-4">状态分布</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a3a',
                          border: '1px solid rgba(0, 245, 255, 0.2)',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-4">
                    {statusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-gray-400">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-space-blue/30 rounded-2xl border border-glass-border">
                  <h3 className="font-orbitron font-bold text-white mb-4">异常类型分布</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={anomalyData}>
                      <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a3a',
                          border: '1px solid rgba(0, 245, 255, 0.2)',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="value" fill="#00f5ff" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-neon-red" />
                  <h3 className="font-orbitron font-bold text-white">未解决异常 ({anomalies.filter(a => !a.resolved).length})</h3>
                </div>
                <div className="space-y-3">
                  {anomalies.filter(a => !a.resolved).slice(0, 5).map(anomaly => (
                    <div
                      key={anomaly.id}
                      className={`p-4 rounded-xl border ${
                        anomaly.severity === 'high'
                          ? 'bg-neon-red/10 border-neon-red/30'
                          : anomaly.severity === 'medium'
                          ? 'bg-neon-yellow/10 border-neon-yellow/30'
                          : 'bg-space-blue/30 border-glass-border'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-xs font-mono mr-2 ${
                            anomaly.severity === 'high' ? 'bg-neon-red text-white' :
                            anomaly.severity === 'medium' ? 'bg-neon-yellow text-space-black' :
                            'bg-gray-500 text-white'
                          }`}>
                            {anomaly.severity === 'high' ? '高危' : anomaly.severity === 'medium' ? '中危' : '低危'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {anomaly.type === 'cycle' ? '循环转账' : 
                             anomaly.type === 'exchange_hub' ? '交易所中转' : '标签冲突'}
                          </span>
                          <p className="text-sm text-gray-300 mt-2">{anomaly.description}</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {anomaly.relatedEntities.length} 个相关实体
                        </span>
                      </div>
                    </div>
                  ))}
                  {anomalies.filter(a => !a.resolved).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-neon-green/50" />
                      <p>暂无未解决的异常</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-neon-purple" />
                  <h3 className="font-orbitron font-bold text-white">修正痕迹记录</h3>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {auditTrails.slice(0, 10).map(trail => (
                    <div key={trail.id} className="flex items-center gap-4 p-3 bg-space-blue/30 rounded-xl">
                      <div className={`w-2 h-2 rounded-full ${
                        trail.action === 'create' ? 'bg-neon-green' :
                        trail.action === 'update' ? 'bg-neon-cyan' : 'bg-neon-red'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white">{trail.field}</span>
                          <span className="text-xs text-gray-500">
                            {trail.action === 'create' ? '创建' : trail.action === 'update' ? '更新' : '删除'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {String(trail.oldValue)} → {String(trail.newValue)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-neon-cyan">{trail.source}</div>
                        <div className="text-xs text-gray-600">
                          {trail.timestamp.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) => (
  <div className="p-4 bg-space-blue/30 rounded-2xl border border-glass-border">
    <div className={`${color} mb-2`}>{icon}</div>
    <div className={`font-mono text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-sm text-gray-400">{label}</div>
  </div>
);

const StatusCard = ({
  icon,
  label,
  value,
  total,
  color,
  bgColor,
  borderColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  color: string;
  bgColor: string;
  borderColor: string;
}) => (
  <div className={`p-6 rounded-2xl border ${bgColor} ${borderColor}`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} text-white`}>{icon}</div>
      <span className="text-xs text-gray-400">
        {total > 0 ? ((value / total) * 100).toFixed(1) : 0}%
      </span>
    </div>
    <div className="font-mono text-3xl font-bold text-white mb-1">{value}</div>
    <div className="text-sm text-gray-400">{label}</div>
    <div className="mt-4 h-2 bg-black/30 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all`}
        style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}
      />
    </div>
  </div>
);
