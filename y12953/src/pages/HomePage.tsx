import { useNavigate } from 'react-router-dom';
import {
  Database,
  AlertTriangle,
  Clock,
  GitBranch,
  ArrowRight,
  Zap,
  FlaskConical,
  BarChart3,
  GitCompare,
} from 'lucide-react';
import { useBackupStore } from '@/store/backupStore';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';

export default function HomePage() {
  const navigate = useNavigate();
  const backups = useBackupStore((state) => state.backups);
  const indexSuggestions = useBackupStore((state) => state.indexSuggestions);
  const corrections = useBackupStore((state) => state.corrections);

  const totalBackups = backups.length;
  const driftCount = backups.filter((b) => b.driftCount > 0).length;
  const pendingCorrections = backups.reduce((acc, b) => acc + b.driftCount, 0);
  const totalCorrections = corrections.length;

  const pendingSuggestions = indexSuggestions.filter((s) => s.status === 'pending');

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white font-mono">索引建议</h1>
        <p className="text-navy-300 mt-1 text-sm">
          日常巡检入口 — 查看索引优化建议与备份概览
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="备份总数"
          value={totalBackups}
          icon={Database}
          trend="较昨日 +1"
          trendUp={true}
          color="default"
          delay={100}
        />
        <StatCard
          title="异常备份"
          value={driftCount}
          icon={AlertTriangle}
          trend="字段漂移"
          trendUp={false}
          color="amber"
          delay={200}
        />
        <StatCard
          title="待修正字段"
          value={pendingCorrections}
          icon={Clock}
          trend="需人工确认"
          trendUp={false}
          color="red"
          delay={300}
        />
        <StatCard
          title="累计修正"
          value={totalCorrections}
          icon={GitBranch}
          trend="历史记录数"
          trendUp={true}
          color="emerald"
          delay={400}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="px-5 py-4 border-b border-navy-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold text-white">索引优化建议</h2>
              <span className="text-xs text-navy-400">({pendingSuggestions.length} 条待处理)</span>
            </div>
            <button
              onClick={() => navigate('/backups')}
              className="text-xs text-navy-300 hover:text-white transition-colors flex items-center gap-1"
            >
              查看全部 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-navy-700/30 max-h-96 overflow-y-auto scrollbar-thin">
            {indexSuggestions.map((suggestion, idx) => (
              <div
                key={suggestion.id}
                className="px-5 py-4 hover:bg-navy-700/30 transition-colors cursor-pointer"
                style={{ animation: 'fadeInUp 0.4s ease-out forwards', animationDelay: `${600 + idx * 100}ms`, opacity: 0 }}
                onClick={() => {
                  if (suggestion.relatedBackupId) {
                    navigate(`/backups/${suggestion.relatedBackupId}`);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-white font-medium">
                        {suggestion.indexName}
                      </span>
                      <StatusBadge status={suggestion.impact} size="sm">
                        {suggestion.impact === 'high' ? '高影响' : suggestion.impact === 'medium' ? '中影响' : '低影响'}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-navy-200">{suggestion.suggestion}</p>
                    <p className="mt-1 text-xs text-navy-400 font-mono">
                      表: {suggestion.tableName} · 列: {suggestion.columns.join(', ')}
                    </p>
                  </div>
                  <StatusBadge status={suggestion.status} size="sm">
                    {suggestion.status === 'pending' ? '待处理' : suggestion.status === 'applied' ? '已应用' : '已拒绝'}
                  </StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5 hover:border-navy-600/50 transition-all duration-300 cursor-pointer group animate-fade-in-up" style={{ animationDelay: '600ms' }} onClick={() => navigate('/schema-compare')}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-navy-400 to-navy-600 shadow-lg">
                <GitCompare className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-navy-200 transition-colors">Schema 对比</h3>
                <p className="text-xs text-navy-400 mt-0.5">月底审计 · 课前检查</p>
              </div>
              <ArrowRight className="w-5 h-5 text-navy-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </div>

          <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5 hover:border-amber-500/30 transition-all duration-300 cursor-pointer group animate-fade-in-up" style={{ animationDelay: '700ms' }} onClick={() => navigate('/test-suite')}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                <FlaskConical className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-navy-200 transition-colors">测试路径</h3>
                <p className="text-xs text-navy-400 mt-0.5">重复导入场景验证</p>
              </div>
              <ArrowRight className="w-5 h-5 text-navy-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </div>

          <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5 hover:border-emerald-500/30 transition-all duration-300 cursor-pointer group animate-fade-in-up" style={{ animationDelay: '800ms' }} onClick={() => navigate('/reports')}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-navy-200 transition-colors">指标报表</h3>
                <p className="text-xs text-navy-400 mt-0.5">质量分析 · 可跳转结论</p>
              </div>
              <ArrowRight className="w-5 h-5 text-navy-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '900ms' }}>
        <div className="px-5 py-4 border-b border-navy-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-navy-300" />
            <h2 className="font-semibold text-white">最近备份记录</h2>
          </div>
          <button
            onClick={() => navigate('/backups')}
            className="text-xs text-navy-300 hover:text-white transition-colors flex items-center gap-1"
          >
            查看全部 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700/50 bg-navy-900/30">
                <th className="text-left px-5 py-3 font-medium text-navy-300">表名</th>
                <th className="text-left px-5 py-3 font-medium text-navy-300">备份时间</th>
                <th className="text-left px-5 py-3 font-medium text-navy-300">来源</th>
                <th className="text-left px-5 py-3 font-medium text-navy-300">记录数</th>
                <th className="text-left px-5 py-3 font-medium text-navy-300">漂移字段</th>
                <th className="text-left px-5 py-3 font-medium text-navy-300">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/30">
              {backups.slice(0, 5).map((backup, idx) => (
                <tr
                  key={backup.id}
                  className="hover:bg-navy-700/30 transition-colors cursor-pointer"
                  style={{ animation: 'fadeInUp 0.4s ease-out forwards', animationDelay: `${1000 + idx * 100}ms`, opacity: 0 }}
                  onClick={() => navigate(`/backups/${backup.id}`)}
                >
                  <td className="px-5 py-3">
                    <span className="font-mono text-white">{backup.tableName}</span>
                  </td>
                  <td className="px-5 py-3 text-navy-200 font-mono text-xs">
                    {new Date(backup.backupTime).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-5 py-3 text-navy-300 font-mono text-xs">{backup.source}</td>
                  <td className="px-5 py-3 text-navy-200 font-mono">
                    {backup.recordCount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    {backup.driftCount > 0 ? (
                      <span className="text-amber-400 font-mono font-medium animate-pulse-slow">
                        {backup.driftCount} 个
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-mono">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={backup.status} size="sm">
                      {backup.status === 'normal' ? '正常' : backup.status === 'warning' ? '警告' : '异常'}
                    </StatusBadge>
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
