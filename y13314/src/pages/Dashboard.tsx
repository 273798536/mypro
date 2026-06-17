import { PageSummaryBar } from '@/components/PageSummaryBar';
import { FilterPanel } from '@/components/FilterPanel';
import { MetricCard } from '@/components/MetricCard';
import { ScoreDistributionChart, StatusPieChart, PassRateTrendChart } from '@/components/ScoreCharts';
import { SampleList } from '@/components/SampleList';
import { useAppStore } from '@/store/useAppStore';
import { Users, CheckCircle2, Gauge, AlertTriangle, TrendingUp, FileText } from 'lucide-react';

export const CreditDashboard = () => {
  const { pageSummary, filteredSamples } = useAppStore();

  const approvedCount = filteredSamples.filter(s => s.status === 'approved').length;
  const rejectedCount = filteredSamples.filter(s => s.status === 'rejected').length;
  const pendingCount = filteredSamples.filter(s => s.status === 'pending').length;
  const suspendedCount = filteredSamples.filter(s => s.isSuspended).length;
  const avgScore = pageSummary?.avgScore ?? 0;
  const passRate = pageSummary?.passRate ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-navy-50">
      <PageSummaryBar />
      
      <div className="flex flex-1">
        <FilterPanel />
        
        <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
          <div id="dashboard-content">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <h2 className="font-serif text-xl font-bold text-navy-800">
                  指标概览
                </h2>
              </div>
              <p className="text-sm text-navy-500">
                基于当前筛选条件的实时统计数据，导出文件将包含此页面完整内容
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="样本总数"
                value={filteredSamples.length}
                subtitle="当前筛选条件下"
                icon={Users}
                color="navy"
                delay={1}
              />
              <MetricCard
                title="平均评分"
                value={avgScore.toFixed(0)}
                subtitle="300-900分区间"
                icon={Gauge}
                color="amber"
                delay={2}
              />
              <MetricCard
                title="通过率"
                value={`${(passRate * 100).toFixed(1)}%`}
                subtitle={`${approvedCount} 通过 / ${rejectedCount} 拒绝`}
                icon={CheckCircle2}
                color="moss"
                trend={2.3}
                delay={3}
              />
              <MetricCard
                title="待处理/挂起"
                value={`${pendingCount + suspendedCount}`}
                subtitle={`${pendingCount} 待处理 / ${suspendedCount} 挂起`}
                icon={AlertTriangle}
                color={suspendedCount > 0 ? 'rust' : 'sky'}
                delay={4}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <ScoreDistributionChart />
              <StatusPieChart />
            </div>

            <div className="mb-6">
              <PassRateTrendChart />
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <h2 className="font-serif text-xl font-bold text-navy-800">
                  样本明细
                </h2>
              </div>
              <p className="text-sm text-navy-500 mb-4">
                点击「查看详情」可查看样本完整审计链路、模型对比和附件管理
              </p>
            </div>

            <SampleList />

            <div className="mt-6 p-4 border border-dashed border-amber-300 bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800 mb-1">重要说明</p>
                  <ul className="text-amber-700 space-y-1">
                    <li>• 所有导出文件将自动嵌入当前页面的筛选口径和数据完整性状态</li>
                    <li>• 引用缺失的样本已自动标记，可手动挂起等待同事确认</li>
                    <li>• 晚到附件需与最终结论关联后才可解除挂起状态</li>
                    <li>• 样本 MISJUDGE001 为旧模型误判测试样本，可进入详情查看改判解释</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditDashboard;
