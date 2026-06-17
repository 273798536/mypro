import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { TideChart } from '../components/TideChart';
import { DataTable } from '../components/DataTable';
import { QualityCard } from '../components/QualityCard';
import { StatusBadge } from '../components/StatusBadge';
import { useTideStore } from '../store/useTideStore';
import { DataStatus } from '../types/common';
import { Play, RefreshCw, Eye, EyeOff, ChevronRight, AlertTriangle, Clock, Info } from 'lucide-react';

export const TideCalculationPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const {
    calculatedRecords,
    chartData,
    highLowTides,
    calculationResult,
    isLoading,
    showOriginalTimezone,
    loadTideData,
    runCalculation,
    toggleTimezoneDisplay,
  } = useTideStore();

  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

  useEffect(() => {
    if (taskId) {
      loadTideData(taskId);
    }
  }, [taskId, loadTideData]);

  const handleRunCalculation = () => {
    if (taskId) {
      runCalculation(taskId);
    }
  };

  const statusCounts = calculatedRecords.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<DataStatus, number>);

  const timezoneIssues = calculationResult?.timezoneCorrectedCount || 0;

  return (
    <AppLayout
      title="潮汐计算"
      subtitle="明珠海珍品 · 2026年6月巡检 · 潮位数据处理"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/')}
            className="text-slate-500 hover:text-ocean-600 transition-colors text-sm flex items-center gap-1"
          >
            ← 返回任务队列
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 text-sm">潮汐计算</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <QualityCard
            title="数据质量"
            value={calculationResult?.qualityScore || 0}
            unit="/100"
            description="潮汐数据综合质量评分，基于完整性、准确性、一致性计算"
            type="score"
            delay={0}
          />
          <QualityCard
            title="空值补全"
            value={calculationResult?.interpolatedCount || 0}
            unit="条"
            description="使用相邻记录线性插值补全的缺失值"
            type="null"
            delay={100}
          />
          <QualityCard
            title="重复记录"
            value={statusCounts[DataStatus.PENDING] || 0}
            unit="条"
            description="已识别的重复上报记录，保留最新版本"
            type="duplicate"
            delay={200}
          />
          <QualityCard
            title="时区校正"
            value={timezoneIssues}
            unit="处"
            description="原始时区与标准东八区不符，已自动校正"
            type="timezone"
            delay={300}
          />
          <QualityCard
            title="超范围值"
            value={statusCounts[DataStatus.RECOLLECT] || 0}
            unit="处"
            description="潮位超出合理范围（0-4m），建议重新采集"
            type="range"
            delay={400}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleRunCalculation}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {calculationResult ? '重新计算' : '运行潮汐计算'}
          </button>

          <button
            onClick={toggleTimezoneDisplay}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
              showOriginalTimezone
                ? 'bg-status-review/10 border-status-review/30 text-status-review'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showOriginalTimezone ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showOriginalTimezone ? '显示原始时区' : '显示校正时区'}
          </button>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>共 {calculatedRecords.length} 条记录</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'chart'
                  ? 'bg-ocean-100 text-ocean-700'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              曲线视图
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'table'
                  ? 'bg-ocean-100 text-ocean-700'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              数据表格
            </button>
          </div>
        </div>

        {calculationResult && (
          <div className="bg-ocean-50 border border-ocean-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-ocean-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-ocean-800">
                  <span className="font-medium">计算说明：</span>
                  {calculationResult.explanation}
                </p>
                {highLowTides.length > 0 && (
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                    <span className="text-ocean-600">
                      识别到 <span className="font-bold">{highLowTides.filter(t => t.type === 'high').length}</span> 个高潮位，
                      <span className="font-bold"> {highLowTides.filter(t => t.type === 'low').length}</span> 个低潮位
                    </span>
                    {highLowTides.slice(0, 3).map((tide, i) => (
                      <span key={i} className="text-ocean-500">
                        {tide.type === 'high' ? '🌊' : '📉'} {tide.time.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} {tide.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}: {tide.tideLevel.toFixed(2)}m
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showOriginalTimezone && timezoneIssues > 0 && (
          <div className="bg-status-review/10 border border-status-review/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-status-review flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-status-review">
                  ⚠️ 发现 {timezoneIssues} 条时区异常记录
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  原始记录使用了东九区时间，已自动校正为东八区北京时间。当前显示为原始时区数据，
                  请点击"显示校正时区"查看处理后的结果，或展开记录查看详细校正说明。
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chart' && (
          <TideChart
            data={chartData}
            title="2026年6月1-3日 潮位变化曲线"
            explanation="基于调和分析法计算，包含M2、S2、K1、O1四个主要分潮的影响。黄色三角标记为插值补全的数据点。"
          />
        )}

        {activeTab === 'table' && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">潮汐数据明细</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={DataStatus.AVAILABLE} size="sm" />
                  <span className="text-slate-500">可用 {statusCounts[DataStatus.AVAILABLE] || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={DataStatus.PENDING} size="sm" />
                  <span className="text-slate-500">暂缓 {statusCounts[DataStatus.PENDING] || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={DataStatus.NEED_REVIEW} size="sm" />
                  <span className="text-slate-500">复核 {statusCounts[DataStatus.NEED_REVIEW] || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={DataStatus.RECOLLECT} size="sm" />
                  <span className="text-slate-500">重采 {statusCounts[DataStatus.RECOLLECT] || 0}</span>
                </div>
              </div>
            </div>
            <DataTable
              records={calculatedRecords}
              showTimezoneToggle
              showOriginalTimezone={showOriginalTimezone}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            onClick={() => navigate(`/tasks/${taskId}/risk`)}
            className="flex items-center gap-2 px-6 py-2.5 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-all shadow-sm hover:shadow-md"
          >
            下一步：风险评估
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </AppLayout>
  );
};
