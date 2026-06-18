import { useVersionStore } from '@/store/useVersionStore';
import Timeline from '@/components/Timeline';
import MetricCard from '@/components/MetricCard';
import MetricTrend from '@/components/Chart/MetricTrend';
import { AlertTriangle, TrendingUp, Database } from 'lucide-react';

export default function Dashboard() {
  const { versions, selectedTargetVersionId } = useVersionStore();

  const currentVersion = versions.find((v) => v.id === selectedTargetVersionId) || versions[0];
  const activeVersions = versions.filter((v) => v.status === 'active');
  const abnormalVersions = versions.filter(
    (v) => v.status === 'abnormal' || v.metrics.some((m) => m.isAbnormal)
  );
  const totalLeakRecords = versions.reduce((sum, v) => sum + v.leakRecords.length, 0);

  const coreMetrics = currentVersion.metrics.slice(0, 4);
  const trendMetrics = ['准确率', '召回率', 'F1分数'];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            商品属性灰度对比
          </h1>
          <p className="text-gray-400">
            当前基准版本：<span className="text-accent-blue font-mono">v2.3.1</span>{' '}
            → 对比版本：<span className="text-accent-green font-mono">{currentVersion.versionNumber}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-accent-orange/10 border border-accent-orange/30 flex items-center gap-2">
            <AlertTriangle size={16} className="text-accent-orange" />
            <span className="text-sm text-accent-orange font-medium">
              {abnormalVersions.length} 个异常版本待处理
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-bg-secondary rounded-lg border border-border-color p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
              <Database size={20} className="text-accent-blue" />
            </div>
            <span className="text-gray-400 text-sm">总版本数</span>
          </div>
          <p className="font-display text-3xl font-bold text-white">{versions.length}</p>
          <p className="text-xs text-gray-500 mt-1">其中 {activeVersions.length} 个正常运行</p>
        </div>

        <div className="bg-bg-secondary rounded-lg border border-border-color p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent-red/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-accent-red" />
            </div>
            <span className="text-gray-400 text-sm">样本泄漏记录</span>
          </div>
          <p className="font-display text-3xl font-bold text-accent-red">{totalLeakRecords}</p>
          <p className="text-xs text-gray-500 mt-1">已全部标记并剔除</p>
        </div>

        <div className="bg-bg-secondary rounded-lg border border-border-color p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent-orange/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-accent-orange" />
            </div>
            <span className="text-gray-400 text-sm">异常指标</span>
          </div>
          <p className="font-display text-3xl font-bold text-accent-orange">
            {currentVersion.metrics.filter((m) => m.isAbnormal).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">需要关注</p>
        </div>

        <div className="bg-bg-secondary rounded-lg border border-border-color p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent-green/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-accent-green" />
            </div>
            <span className="text-gray-400 text-sm">整体 F1 分数</span>
          </div>
          <p className="font-display text-3xl font-bold text-white">
            {currentVersion.metrics.find((m) => m.name === 'F1分数')?.value || 0}%
          </p>
          <p className="text-xs text-accent-green mt-1">
            +{currentVersion.metrics.find((m) => m.name === 'F1分数')?.delta || 0}% 对比上个版本
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="font-display text-xl font-semibold text-white mb-4">版本时间线</h2>
          <div className="bg-bg-secondary rounded-lg border border-border-color p-6 max-h-[600px] overflow-auto">
            <Timeline
              versions={versions}
              selectedId={selectedTargetVersionId}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-white mb-4">
              当前版本核心指标
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {coreMetrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>
          </div>

          <MetricTrend versions={versions} metricNames={trendMetrics} />
        </div>
      </div>
    </div>
  );
}
