import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import WeightAnalysisCard from '../components/WeightAnalysisCard';
import RuleTimeline from '../components/RuleTimeline';
import RankingList from '../components/RankingList';
import { Download, RefreshCw, Database } from 'lucide-react';
import { saveAs } from 'file-saver';

const Dashboard = () => {
  const { calculationResult, loadMockData, athletes, exportResults, calculateRankings, pendingItems } = useAppStore();

  useEffect(() => {
    if (athletes.length === 0) {
      loadMockData();
    }
  }, [athletes.length, loadMockData]);

  const handleExport = () => {
    const data = exportResults();
    if (data) {
      const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
      saveAs(blob, '排名结果.json');
    }
  };

  const handleRecalculate = () => {
    calculateRankings();
  };

  const unreviewedCount = pendingItems.filter((p) => !p.reviewed).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">赛事分析看板</h2>
          <p className="text-dark-400 text-sm mt-1">
            {calculationResult
              ? `数据更新于 ${new Date(calculationResult.timestamp).toLocaleString()}`
              : '等待计算'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreviewedCount > 0 && (
            <div className="px-3 py-2 bg-warning/20 text-warning rounded-lg text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-warning rounded-full animate-pulse" />
              {unreviewedCount} 项待复核
            </div>
          )}
          <button
            onClick={handleRecalculate}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            重新计算
          </button>
          <button
            onClick={handleExport}
            className="btn-primary flex items-center gap-2"
            disabled={!calculationResult}
          >
            <Download className="w-4 h-4" />
            导出结果
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 space-y-6">
          <WeightAnalysisCard />
          
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-primary-500" />
              <h3 className="font-display font-semibold text-white">数据概览</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-dark-700/50 rounded-lg">
                <p className="text-2xl font-display font-bold text-primary-400">
                  {athletes.length}
                </p>
                <p className="text-xs text-dark-400">参赛选手</p>
              </div>
              <div className="text-center p-3 bg-dark-700/50 rounded-lg">
                <p className="text-2xl font-display font-bold text-success">
                  {calculationResult?.results.filter((r) => r.steps.length === 0).length || 0}
                </p>
                <p className="text-xs text-dark-400">无同分</p>
              </div>
              <div className="text-center p-3 bg-dark-700/50 rounded-lg">
                <p className="text-2xl font-display font-bold text-warning">
                  {calculationResult?.results.filter((r) => r.steps.length > 0 && r.tieBreakRule !== '卡壳').length || 0}
                </p>
                <p className="text-xs text-dark-400">已同分</p>
              </div>
              <div className="text-center p-3 bg-dark-700/50 rounded-lg">
                <p className="text-2xl font-display font-bold text-danger">
                  {calculationResult?.results.filter((r) => r.tieBreakRule === '卡壳').length || 0}
                </p>
                <p className="text-xs text-dark-400">卡壳</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-5">
          <RuleTimeline />
        </div>

        <div className="col-span-4">
          <RankingList />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
