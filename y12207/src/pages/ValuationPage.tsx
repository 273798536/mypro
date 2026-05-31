import { useState } from 'react';
import { TrendingUp, BarChart3, AlertTriangle, FileCheck } from 'lucide-react';
import { useValuationStore } from '@/store/valuationStore';
import FilterPanel from '@/components/FilterPanel';
import ValuationChart from '@/components/ValuationChart';
import ValuationTable from '@/components/ValuationTable';
import ConflictAlert from '@/components/ConflictAlert';
import StatCard from '@/components/StatCard';
import { formatCurrency } from '@/utils/format';

export default function ValuationPage() {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const getFilteredValuations = useValuationStore((state) => state.getFilteredValuations);
  const conflicts = useValuationStore((state) => state.conflicts);
  const valuationLogs = useValuationStore((state) => state.valuationLogs);
  
  const filteredValuations = getFilteredValuations();
  
  const totalValuation = filteredValuations.reduce((sum, v) => sum + v.valuationAmount, 0);
  const avgValuation = filteredValuations.length > 0 ? totalValuation / filteredValuations.length : 0;
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved).length;
  const manualChanges = valuationLogs.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">估值工作台</h1>
        <p className="text-slate-500 mt-1">多维度筛选估值数据，实时同步图表与明细</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="估值总金额"
          value={formatCurrency(totalValuation)}
          icon={TrendingUp}
          trend={5.2}
          color="blue"
        />
        <StatCard
          title="平均估值"
          value={formatCurrency(avgValuation)}
          icon={BarChart3}
          color="green"
          subtitle={`${filteredValuations.length} 个项目`}
        />
        <StatCard
          title="待处理冲突"
          value={unresolvedConflicts}
          icon={AlertTriangle}
          color="amber"
          subtitle="需要人工确认"
        />
        <StatCard
          title="人工变更记录"
          value={manualChanges}
          icon={FileCheck}
          color="blue"
          subtitle="可追溯修改历史"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <FilterPanel />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <ConflictAlert />

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">估值趋势</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    chartType === 'line'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  折线图
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    chartType === 'bar'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  柱状图
                </button>
              </div>
            </div>
            <ValuationChart type={chartType} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">估值明细</h3>
              <p className="text-sm text-slate-500">
                点击「对比修正」进入手动调整模式
              </p>
            </div>
            <ValuationTable />
          </div>
        </div>
      </div>
    </div>
  );
}
