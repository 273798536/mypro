import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import { PeriodTimeline } from './components/PeriodTimeline';
import { OrderList } from './components/OrderList';
import { CashFlowForecast } from './components/CashFlowForecast';
import { FeeBreakdown } from './components/FeeBreakdown';
import { PendingArea } from './components/PendingArea';
import { AdFeeModal } from './components/AdFeeModal';
import { PlusCircle, LayoutDashboard, Download } from 'lucide-react';
import { mockPeriods, mockOrders, mockCashFlow, mockPendingItems, mockFeeBreakdown } from './data/mockData';

function App() {
  const {
    setPeriods,
    setOrders,
    setCashFlow,
    setPendingItems,
    setFeeBreakdown,
    selectedPeriodId,
    periods,
    setSelectedPeriodId,
  } = useAppStore();
  const [showAdFeeModal, setShowAdFeeModal] = useState(false);

  useEffect(() => {
    setPeriods(mockPeriods);
    setOrders(mockOrders);
    setCashFlow(mockCashFlow);
    setPendingItems(mockPendingItems);
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      const period = periods.find((p) => p.id === selectedPeriodId);
      if (period) {
        const breakdown = mockFeeBreakdown(period);
        setFeeBreakdown(breakdown);
      }
    } else {
      setFeeBreakdown(null);
    }
  }, [selectedPeriodId, periods]);

  const handleAdFeeSubmit = (records: Array<{ campaignName: string; amount: number }) => {
    console.log('补录广告扣费:', records);
  };

  const handleExport = () => {
    console.log('导出数据');
    alert('数据导出功能已触发！');
  };

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-primary-800 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard size={24} />
            <div>
              <h1 className="text-xl font-bold">电商账期收款预测</h1>
              <p className="text-primary-200 text-sm">账期归集 · 现金流预测 · 扣费拆解</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => selectedPeriodId && setShowAdFeeModal(true)}
              disabled={!selectedPeriodId}
              className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle size={18} />
              补录广告扣费
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-accent-orange hover:bg-opacity-90 rounded-lg transition-colors"
            >
              <Download size={18} />
              导出报表
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 bg-white border-r border-gray-200 overflow-hidden">
          <PeriodTimeline />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedPeriod && (
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {selectedPeriod.periodName}</h2>
                  <p className="text-sm text-gray-500">
                    结算日: {new Date(selectedPeriod.settlementDate).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ¥{selectedPeriod.netAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">净收入</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-gray-700">
                      {selectedPeriod.totalOrders}</div>
                    <div className="text-xs text-gray-500">订单数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-orange-600">
                      ¥{(selectedPeriod.platformFee + selectedPeriod.adFee).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">总费用</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <OrderList />
          </div>
        </main>

        <aside className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto p-4 space-y-4">
          <CashFlowForecast />
          <FeeBreakdown />
          <PendingArea />
        </aside>
      </div>

      {showAdFeeModal && selectedPeriod && (
        <AdFeeModal
          periodId={selectedPeriod.id}
          periodName={selectedPeriod.periodName}
          onClose={() => setShowAdFeeModal(false)}
          onSubmit={handleAdFeeSubmit}
        />
      )}
    </div>
  );
}

export default App;
