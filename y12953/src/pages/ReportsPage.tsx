import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useBackupStore } from '@/store/backupStore';
import { mockMetricData } from '@/data/mockData';

export default function ReportsPage() {
  const navigate = useNavigate();
  const backups = useBackupStore((state) => state.backups);

  const [selectedMetric, setSelectedMetric] = useState<'drift' | 'correction' | 'success'>('drift');

  const totalBackups = backups.length;
  const driftedBackups = backups.filter((b) => b.driftCount > 0).length;
  const totalDriftFields = backups.reduce((acc, b) => acc + b.driftCount, 0);
  const driftRate = totalBackups > 0 ? ((driftedBackups / totalBackups) * 100).toFixed(1) : '0';
  const normalBackups = backups.filter((b) => b.status === 'normal').length;
  const successRate = totalBackups > 0 ? ((normalBackups / totalBackups) * 100).toFixed(1) : '0';

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const dateStr = data.activeLabel;
      const dayMatch = dateStr.match(/\d+$/);
      if (dayMatch) {
        const day = parseInt(dayMatch[0]);
        const matchingBackup = backups.find((b) => {
          const backupDay = new Date(b.backupTime).getDate();
          return backupDay === day;
        });
        if (matchingBackup) {
          navigate(`/backups/${matchingBackup.id}`);
        }
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white font-mono">指标报表</h1>
        <p className="text-navy-300 mt-1 text-sm">
          备份质量分析 · 点击数据点可跳转至对应结论
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5 cursor-pointer hover:border-navy-500/50 transition-all"
          style={{ animation: 'fadeInUp 0.5s ease-out forwards', animationDelay: '100ms', opacity: 0 }}
          onClick={() => navigate('/backups')}
        >
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-5 h-5 text-navy-400" />
            <ArrowRight className="w-4 h-4 text-navy-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-white">{totalBackups}</p>
          <p className="text-sm text-navy-400 mt-1">备份总数</p>
        </div>

        <div
          className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5 cursor-pointer hover:border-amber-500/30 transition-all"
          style={{ animation: 'fadeInUp 0.5s ease-out forwards', animationDelay: '200ms', opacity: 0 }}
          onClick={() => {
            const drifted = backups.filter((b) => b.driftCount > 0);
            if (drifted.length > 0) {
              navigate(`/backups/${drifted[0].id}`);
            }
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <ArrowRight className="w-4 h-4 text-navy-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-amber-400">{totalDriftFields}</p>
          <p className="text-sm text-navy-400 mt-1">漂移字段数</p>
        </div>

        <div
          className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5 cursor-pointer hover:border-emerald-500/30 transition-all"
          style={{ animation: 'fadeInUp 0.5s ease-out forwards', animationDelay: '300ms', opacity: 0 }}
          onClick={() => {
            const normal = backups.filter((b) => b.status === 'normal');
            if (normal.length > 0) {
              navigate(`/backups/${normal[0].id}`);
            }
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <ArrowRight className="w-4 h-4 text-navy-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-emerald-400">{successRate}%</p>
          <p className="text-sm text-navy-400 mt-1">备份正常率</p>
        </div>

        <div
          className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5 cursor-pointer hover:border-navy-500/50 transition-all"
          style={{ animation: 'fadeInUp 0.5s ease-out forwards', animationDelay: '400ms', opacity: 0 }}
          onClick={() => navigate('/backups')}
        >
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-5 h-5 text-navy-300" />
            <ArrowRight className="w-4 h-4 text-navy-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-white">{driftRate}%</p>
          <p className="text-sm text-navy-400 mt-1">漂移发生率</p>
        </div>
      </div>

      <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl overflow-hidden" style={{ animation: 'fadeInUp 0.5s ease-out forwards', animationDelay: '500ms', opacity: 0 }}>
        <div className="px-5 py-4 border-b border-navy-700/50 flex items-center justify-between">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-navy-300" />
            近 7 天趋势
          </h2>
          <div className="flex items-center gap-1 bg-navy-900/50 rounded-lg p-1">
            <button
              onClick={() => setSelectedMetric('drift')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                selectedMetric === 'drift'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-navy-400 hover:text-white'
              }`}
            >
              漂移数
            </button>
            <button
              onClick={() => setSelectedMetric('correction')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                selectedMetric === 'correction'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-navy-400 hover:text-white'
              }`}
            >
              修正数
            </button>
            <button
              onClick={() => setSelectedMetric('success')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                selectedMetric === 'success'
                  ? 'bg-navy-500/50 text-white'
                  : 'text-navy-400 hover:text-white'
              }`}
            >
              成功率
            </button>
          </div>
        </div>

        <div className="p-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            {selectedMetric === 'success' ? (
              <LineChart data={mockMetricData} onClick={handleBarClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F2A4A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                  formatter={(value: number) => [`${value}%`, '成功率']}
                />
                <Line
                  type="monotone"
                  dataKey="successRate"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={{ fill: '#22C55E', strokeWidth: 2, r: 4, cursor: 'pointer' }}
                  activeDot={{ r: 6, fill: '#22C55E', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              <BarChart data={mockMetricData} onClick={handleBarClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F2A4A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'driftedBackups' ? '漂移备份' : '修正记录',
                  ]}
                />
                <Legend
                  formatter={(value: string) =>
                    value === 'driftedBackups' ? '漂移备份' : '修正记录'
                  }
                />
                <Bar
                  dataKey={selectedMetric === 'drift' ? 'driftedBackups' : 'corrections'}
                  fill={selectedMetric === 'drift' ? '#FF8A3D' : '#22C55E'}
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="px-5 pb-4">
          <p className="text-xs text-navy-400">
            💡 提示：点击图表中的数据点，可以跳转到当天对应的备份记录详情页，复盘时不用再人工查表。
          </p>
        </div>
      </div>

      <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl overflow-hidden" style={{ animation: 'fadeInUp 0.5s ease-out forwards', animationDelay: '600ms', opacity: 0 }}>
        <div className="px-5 py-4 border-b border-navy-700/50">
          <h2 className="font-semibold text-white">备份质量结论</h2>
        </div>
        <div className="divide-y divide-navy-700/30">
          {backups.slice(0, 4).map((backup, idx) => (
            <div
              key={backup.id}
              className="px-5 py-4 hover:bg-navy-700/20 transition-colors cursor-pointer"
              style={{ animation: 'fadeInUp 0.4s ease-out forwards', animationDelay: `${700 + idx * 100}ms`, opacity: 0 }}
              onClick={() => navigate(`/backups/${backup.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      backup.status === 'normal'
                        ? 'bg-emerald-400'
                        : backup.status === 'warning'
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                  />
                  <span className="font-mono text-white">{backup.tableName}</span>
                  <span className="text-xs text-navy-400 font-mono">
                    {backup.schemaVersion}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-navy-400">
                    {backup.driftCount > 0 ? `${backup.driftCount} 个漂移字段` : '状态正常'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-navy-500" />
                </div>
              </div>
              <p className="text-xs text-navy-500 mt-1 ml-5">
                {new Date(backup.backupTime).toLocaleDateString('zh-CN')} · {backup.source} ·{' '}
                {backup.recordCount.toLocaleString()} 条记录
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
