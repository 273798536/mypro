import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { FlaskConical, TrendingUp, Clock, Send, Upload, BarChart3, FileDown, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { useSampleStore } from '@/store/sampleStore';
import { useQCStore } from '@/store/qcStore';
import { useUIStore } from '@/store/uiStore';
import { SampleStatus, QualityLevel } from '@/types';
import StatusBadge from '@/components/common/StatusBadge';
import { cn } from '@/lib/utils';

interface StatCardProps { title: string; value: string | number; icon: React.ElementType; color: string; trend?: string; }

function StatCard({ title, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && <p className="mt-1 text-xs text-gray-500">{trend}</p>}
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

interface QuickActionProps { icon: React.ElementType; label: string; onClick: () => void; variant?: 'primary' | 'secondary'; }

function QuickAction({ icon: Icon, label, onClick, variant = 'primary' }: QuickActionProps) {
  return (
    <button onClick={onClick} className={cn('flex items-center gap-3 rounded-xl px-5 py-4 font-medium transition-colors', variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
      <Icon className="h-5 w-5" />{label}
    </button>
  );
}

export default function Dashboard() {
  const { samples, manualCorrections, currentUser } = useSampleStore();
  const { getQualityStats } = useQCStore();
  const { showNotification } = useUIStore();
  const qualityStats = getQualityStats();

  const stats = useMemo(() => {
    const highQuality = samples.filter(s => s.qualityLevel === QualityLevel.A).length;
    const reviewing = samples.filter(s => s.status === SampleStatus.REVIEWING).length;
    const thisMonth = new Date(); thisMonth.setDate(1);
    const transferredThisMonth = manualCorrections.filter(c => new Date(c.correctedAt) >= thisMonth).length;
    return {
      total: samples.length,
      highQuality: highQuality > 0 ? `${((highQuality / samples.length) * 100).toFixed(1)}%` : '0%',
      reviewing, transferredThisMonth,
    };
  }, [samples, manualCorrections]);

  const trendChartOption = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }); });
    const qcScores = last7Days.map(() => 30 + Math.random() * 20);
    const passRates = last7Days.map(() => 60 + Math.random() * 35);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['质控平均分', '通过率'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: last7Days },
      yAxis: [{ type: 'value', name: '质控分', min: 0, max: 60 }, { type: 'value', name: '通过率(%)', min: 0, max: 100 }],
      series: [
        { name: '质控平均分', type: 'line', smooth: true, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59, 130, 246, 0.3)' }, { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }] } }, lineStyle: { color: '#3B82F6', width: 2 }, itemStyle: { color: '#3B82F6' }, data: qcScores },
        { name: '通过率', type: 'line', yAxisIndex: 1, smooth: true, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16, 185, 129, 0.3)' }, { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }] } }, lineStyle: { color: '#10B981', width: 2 }, itemStyle: { color: '#10B981' }, data: passRates },
      ],
    };
  }, []);

  const recentActivities = useMemo(() => [
    { id: '1', type: 'import', icon: Upload, title: '批量导入样本', description: '导入了15个新样本', time: new Date(Date.now() - 1000 * 60 * 30), user: currentUser },
    { id: '2', type: 'qc', icon: CheckCircle, title: '质控筛选完成', description: '筛选出3个低质量样本', time: new Date(Date.now() - 1000 * 60 * 60 * 2), user: '系统' },
    { id: '3', type: 'review', icon: AlertCircle, title: '样本待复核', description: 'S003样本病理备注存在冲突', time: new Date(Date.now() - 1000 * 60 * 60 * 4), user: '李医师' },
    { id: '4', type: 'analysis', icon: BarChart3, title: '差异分析完成', description: '光照胁迫分析已生成8个显著差异结果', time: new Date(Date.now() - 1000 * 60 * 60 * 8), user: currentUser },
  ], [currentUser]);

  const handleQuickAction = (action: string) => showNotification('info', `${action}功能开发中...`);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">仪表盘</h1><p className="mt-1 text-sm text-gray-500">查看实验室数据概览和最近活动</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="总样本数" value={stats.total} icon={FlaskConical} color="bg-blue-500" trend={`质控平均分: ${qualityStats.avgScore.toFixed(1)}`} />
        <StatCard title="高质量占比" value={stats.highQuality} icon={TrendingUp} color="bg-green-500" trend={`通过: ${qualityStats.passed} / 失败: ${qualityStats.failed}`} />
        <StatCard title="待复核数" value={stats.reviewing} icon={Clock} color="bg-yellow-500" trend="需要人工确认" />
        <StatCard title="本月转交数" value={stats.transferredThisMonth} icon={Send} color="bg-purple-500" trend="人工修正记录" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickAction icon={Upload} label="导入样本" onClick={() => handleQuickAction('导入样本')} />
        <QuickAction icon={BarChart3} label="运行差异分析" onClick={() => handleQuickAction('运行差异分析')} variant="secondary" />
        <QuickAction icon={FileDown} label="导出报告" onClick={() => handleQuickAction('导出报告')} variant="secondary" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">质控趋势</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500"><Activity className="h-4 w-4" />最近7天</div>
          </div>
          <ReactECharts option={trendChartOption} style={{ height: '300px' }} />
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h2>
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100"><Icon className="h-4 w-4 text-gray-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.user} · {new Date(activity.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {activity.type === 'review' && <StatusBadge status={SampleStatus.REVIEWING} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
