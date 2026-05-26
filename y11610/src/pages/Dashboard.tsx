import { useEffect, useState } from 'react';
import { DollarSign, TrendingDown, AlertTriangle, Clock } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { DashboardStats } from '../types';
import StatCard from '../components/ui/StatCard';
import LossTrendChart from '../components/charts/LossTrendChart';
import CurrencyPieChart from '../components/charts/CurrencyPieChart';
import AnomalyBarChart from '../components/charts/AnomalyBarChart';
import { formatCurrency, formatNumber } from '../utils/currency';

export default function Dashboard() {
  const { loadAllData, isLoaded, orders, losses } = useDataStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      loadAllData();
    }
  }, [isLoaded, loadAllData]);

  useEffect(() => {
    if (isLoaded) {
      calculateStats();
    }
  }, [isLoaded, orders, losses]);

  const calculateStats = () => {
    const totalReceipts = orders.reduce((sum, o) => sum + o.amount, 0);
    const totalLoss = losses.reduce((sum, l) => sum + l.lossAmount, 0);
    const anomalyCount = losses.filter((l) => l.anomalyType !== 'none').length;
    const pendingCount = losses.filter((l) => l.status === 'pending').length;

    const lossByDate = new Map<string, number>();
    losses.forEach((loss) => {
      const date = loss.calculationDate;
      lossByDate.set(date, (lossByDate.get(date) || 0) + loss.lossAmount);
    });

    const sortedDates = Array.from(lossByDate.keys()).sort();
    const lossTrend = sortedDates.map((date) => ({
      date,
      amount: lossByDate.get(date) || 0,
    }));

    const currencyMap = new Map<string, number>();
    orders.forEach((order) => {
      currencyMap.set(order.currency, (currencyMap.get(order.currency) || 0) + order.amount);
    });
    const currencyDistribution = Array.from(currencyMap.entries()).map(([currency, amount]) => ({
      currency,
      amount,
    }));

    const anomalyMap = new Map<string, number>();
    losses.forEach((loss) => {
      if (loss.anomalyType !== 'none') {
        anomalyMap.set(loss.anomalyType, (anomalyMap.get(loss.anomalyType) || 0) + 1);
      }
    });
    const anomalyDistribution = Array.from(anomalyMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    setStats({
      totalReceipts,
      totalLoss,
      anomalyCount,
      pendingCount,
      lossTrend,
      currencyDistribution,
      anomalyDistribution,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">概览看板</h1>
        <p className="text-sm text-gray-500">
          共 {orders.length} 笔订单，{losses.length} 笔汇损记录
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总收款金额"
          value={formatNumber(stats?.totalReceipts || 0, 0)}
          icon={DollarSign}
          color="primary"
        />
        <StatCard
          title="累计汇损"
          value={formatCurrency(stats?.totalLoss || 0, 'CNY')}
          icon={TrendingDown}
          color="danger"
        />
        <StatCard
          title="异常笔数"
          value={stats?.anomalyCount || 0}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="待确认"
          value={stats?.pendingCount || 0}
          icon={Clock}
          color="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats && <LossTrendChart data={stats.lossTrend} />}
        {stats && <CurrencyPieChart data={stats.currencyDistribution} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats && <AnomalyBarChart data={stats.anomalyDistribution} />}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">操作指南</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-primary-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium text-gray-800">导入数据</p>
                <p className="text-sm text-gray-500">点击右上角「造数」生成测试数据，或手动导入订单、水单、账单</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-success-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-success-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium text-gray-800">执行匹配</p>
                <p className="text-sm text-gray-500">点击「匹配」按钮，系统自动匹配订单与到账记录</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-warning-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-warning-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium text-gray-800">计算汇损</p>
                <p className="text-sm text-gray-500">点击「计算」按钮，系统自动计算汇损并标记异常</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-danger-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-danger-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                4
              </div>
              <div>
                <p className="font-medium text-gray-800">查看明细</p>
                <p className="text-sm text-gray-500">在汇损明细中查看详情，处理异常记录，导出报表</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
