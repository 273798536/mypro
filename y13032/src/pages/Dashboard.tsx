import { useReconciliationStore } from '@/store/useReconciliationStore';
import {
  calculateDashboardStats,
  getCaliberDistribution,
} from '@/utils/reconciliation';
import StatsCards from '@/components/Dashboard/StatsCards';
import CaliberPieChart from '@/components/Dashboard/CaliberPieChart';
import AnomalyList from '@/components/Dashboard/AnomalyList';
import { AlertOctagon, Info } from 'lucide-react';

export default function Dashboard() {
  const { transactions } = useReconciliationStore();
  const stats = calculateDashboardStats(transactions);
  const distribution = getCaliberDistribution(transactions);

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto">
      <div className="card p-5 bg-gradient-to-r from-amber/8 to-transparent border-l-4 border-l-amber animate-fade-up opacity-0">
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-amber-dark shrink-0 mt-0.5" strokeWidth={2} />
          <div className="flex-1">
            <div className="font-serif text-base font-semibold text-navy-700">
              小林，本次复核要点
            </div>
            <div className="mt-1 text-sm text-navy-600 leading-relaxed">
              这次"供应链预付款口径对账"不是换系统，是把银行流水里
              <span className="text-amber-dark font-medium"> 同一笔钱被两个口径同时认走 </span>
              的记录捋顺。
              图表服务复核——点击异常时会跳回对应的
              <span className="underline decoration-dotted decoration-navy-400"> 银行流水 </span>
              和
              <span className="underline decoration-dotted decoration-navy-400"> 本次计算口径 </span>
              。
            </div>
          </div>
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-2">
          <CaliberPieChart data={distribution} />
          <div className="mt-4 card p-4 bg-cream/50 animate-fade-up opacity-0" style={{ animationDelay: '350ms' }}>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-navy-500 shrink-0 mt-0.5" strokeWidth={2} />
              <div className="text-xs text-navy-600 leading-relaxed">
                <span className="font-medium">图例说明：</span>
                双口径重复认领（琥珀）为需重点复核项；单口径认领（海军蓝）建议抽查；正常（翡翠绿）可批量通过。
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-3">
          <AnomalyList transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
