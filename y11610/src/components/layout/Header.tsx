import { Bell, Settings, Download, Database, Play } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { generateMockData, clearAllData, getDatabaseStats } from '../../mock/seed';
import { runAutoMatching } from '../../services/matchingService';
import { calculateAllExchangeLosses } from '../../services/exchangeService';
import { useDataStore } from '../../store/useDataStore';
import { useState } from 'react';
import { formatDate } from '../../utils/date';

export default function Header() {
  const { showToast, setLoading } = useUIStore();
  const { refreshData } = useDataStore();
  const [stats, setStats] = useState<{
    orderCount: number;
    statementCount: number;
    billCount: number;
    rateCount: number;
    matchingCount: number;
    lossCount: number;
  } | null>(null);

  const handleGenerateMockData = async () => {
    if (!confirm('确定要生成测试数据吗？这将清空现有数据。')) return;

    setLoading(true, '正在生成测试数据...');
    try {
      await generateMockData(30);
      await refreshData();
      showToast('success', '测试数据生成成功');
      updateStats();
    } catch (error) {
      showToast('error', '生成失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复。')) return;

    setLoading(true, '正在清空数据...');
    try {
      await clearAllData();
      await refreshData();
      showToast('success', '数据已清空');
      updateStats();
    } catch (error) {
      showToast('error', '清空失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMatching = async () => {
    setLoading(true, '正在进行自动匹配...');
    try {
      const result = await runAutoMatching();
      await refreshData();
      showToast(
        'success',
        `匹配完成：完全匹配${result.matched}条，部分匹配${result.partial}条，未匹配${result.unmatched}条`
      );
      updateStats();
    } catch (error) {
      showToast('error', '匹配失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateLoss = async () => {
    setLoading(true, '正在计算汇损...');
    try {
      const result = await calculateAllExchangeLosses();
      await refreshData();
      showToast('success', `汇损计算完成：成功${result.success}条，失败${result.failed}条`);
      updateStats();
    } catch (error) {
      showToast('error', '计算失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = async () => {
    const s = await getDatabaseStats();
    setStats(s);
  };

  return (
    <header className="fixed top-0 right-0 left-0 h-16 bg-white border-b border-gray-100 z-20 shadow-sm">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {formatDate(new Date(), 'yyyy年MM月dd日')}
          </h2>
          {stats && (
            <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
              <span>订单:{stats.orderCount}</span>
              <span>水单:{stats.statementCount}</span>
              <span>匹配:{stats.matchingCount}</span>
              <span>汇损:{stats.lossCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateMockData}
            className="btn btn-secondary text-sm"
            title="生成测试数据"
          >
            <Database size={16} />
            <span className="hidden sm:inline">造数</span>
          </button>

          <button
            onClick={handleRunMatching}
            className="btn btn-primary text-sm"
            title="执行自动匹配"
          >
            <Play size={16} />
            <span className="hidden sm:inline">匹配</span>
          </button>

          <button
            onClick={handleCalculateLoss}
            className="btn btn-success text-sm"
            title="计算汇损"
          >
            <Download size={16} />
            <span className="hidden sm:inline">计算</span>
          </button>

          <button
            onClick={handleClearData}
            className="btn btn-danger text-sm"
            title="清空数据"
          >
            <span className="hidden sm:inline">清空</span>
          </button>

          <button className="btn btn-ghost p-2" title="通知">
            <Bell size={20} />
          </button>

          <button className="btn btn-ghost p-2" title="设置">
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
