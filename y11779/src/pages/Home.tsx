import React, { useEffect, useState } from 'react';
import { useDataStore } from '../store/useDataStore';
import { exportCalibrationReport } from '../utils/export';
import MetricCard from '../components/dashboard/MetricCard';
import CoverageChart from '../components/dashboard/CoverageChart';
import GroupTable from '../components/dashboard/GroupTable';
import AnomalyPanel from '../components/dashboard/AnomalyPanel';
import CorrectionTimeline from '../components/dashboard/CorrectionTimeline';
import ExportButton from '../components/common/ExportButton';
import type { AnomalyRecord, GroupByDimension } from '../types';

const Home: React.FC = () => {
  const {
    records,
    anomalies,
    corrections,
    groupStats,
    metrics,
    groupBy,
    filters,
    highlightedDate,
    targetCoverage,
    loadMockData,
    setGroupBy,
    setFilters,
    highlightDate,
    resolveAnomaly,
    addCorrection
  } = useDataStore();

  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [showQuickStart, setShowQuickStart] = useState(records.length === 0);

  useEffect(() => {
    if (records.length === 0) {
      loadMockData();
      setShowQuickStart(false);
    }
  }, [records.length, loadMockData]);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    exportCalibrationReport(
      records,
      groupStats,
      anomalies,
      corrections,
      metrics,
      format
    );
  };

  const handleSelectAnomaly = (anomaly: AnomalyRecord) => {
    setSelectedAnomalyId(anomaly.id);
    const record = records.find(r => r.id === anomaly.recordId);
    if (record) {
      highlightDate(record.date);
    }
  };

  const handleResolveAnomaly = (anomalyId: string, resolution: string) => {
    resolveAnomaly(anomalyId, resolution);
    addCorrection({
      operator: '当前用户',
      type: 'annotation',
      targetRecordIds: [anomalyId],
      beforeValue: null,
      afterValue: resolution,
      reason: resolution,
      source: '人工校准'
    });
  };

  const handleGroupByChange = (dimension: GroupByDimension) => {
    setGroupBy(dimension);
  };

  const handleDateClick = (date: string) => {
    highlightDate(date === highlightedDate ? null : date);
  };

  const handleRefreshData = () => {
    loadMockData();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">预测区间校准面板</h1>
                <p className="text-xs text-slate-500">销量预测质量监控工具</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefreshData}
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                重新生成数据
              </button>
              <ExportButton onExport={handleExport} disabled={records.length === 0} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <MetricCard
            title="总体覆盖率"
            value={metrics.overallCoverage}
            format="percentage"
            icon="coverage"
            target={targetCoverage}
            subtitle="实际值落在预测区间内的比例"
          />
          <MetricCard
            title="预测记录"
            value={metrics.totalRecords}
            format="number"
            icon="records"
            subtitle="当前分析的数据点数量"
          />
          <MetricCard
            title="待处理异常"
            value={anomalies.filter(a => !a.resolved).length}
            format="number"
            icon="anomalies"
            subtitle="需要关注的异常情况"
          />
          <MetricCard
            title="覆盖品类"
            value={metrics.categoryCount}
            format="number"
            icon="categories"
            subtitle="分析涉及的品类数量"
          />
          <MetricCard
            title="促销记录"
            value={metrics.promotionCount}
            format="number"
            icon="promotion"
            subtitle="包含促销标记的记录数"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <CoverageChart
              records={records}
              highlightedDate={highlightedDate}
              onDateClick={handleDateClick}
            />
          </div>
          <div className="space-y-6">
            <AnomalyPanel
              anomalies={anomalies}
              onSelectAnomaly={handleSelectAnomaly}
              onResolve={handleResolveAnomaly}
              selectedAnomalyId={selectedAnomalyId}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GroupTable
              data={groupStats}
              groupBy={groupBy}
              onGroupByChange={handleGroupByChange}
              targetCoverage={targetCoverage}
            />
          </div>
          <div>
            <CorrectionTimeline records={corrections} />
          </div>
        </div>

        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-semibold text-blue-800 mb-4">📖 快速操作指南</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <div>
                <p className="font-medium text-blue-800">查看趋势</p>
                <p className="text-blue-600">点击图表上的数据点，查看当天预测详情，异常点会自动高亮</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <div>
                <p className="font-medium text-blue-800">处理异常</p>
                <p className="text-blue-600">在右侧异常面板点击条目，图表自动定位，可标记为已处理</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <div>
                <p className="font-medium text-blue-800">导出报告</p>
                <p className="text-blue-600">点击右上角导出按钮，支持PDF、Excel、CSV三种格式</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-amber-50 rounded-xl p-6 border border-amber-100">
          <h3 className="font-semibold text-amber-800 mb-3">⚠️ 异常说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-amber-700"><strong>促销异常:</strong> 促销期间实际销量超出预测上限20%以上</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-amber-700"><strong>覆盖不足:</strong> 实际值落在预测区间外，连续3天以上升级为严重</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span className="text-amber-700"><strong>样本偏少:</strong> 分组样本量少于30，统计结果可能不可靠</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>预测区间校准面板 v1.0</span>
            <span>数据来源可追溯 · 修正记录留痕 · 异常不静默</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
