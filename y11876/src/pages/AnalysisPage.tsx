import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAnalysisResult,
  useAppStore,
  useSelectedCategory,
  useAnomalyFilters,
  useIsAnalyzing,
} from '@/store/useAppStore';
import { GroupType, ANOMALY_TYPE_LABELS, GROUP_LABELS } from '@/types';
import CoverageDonut from '@/components/charts/CoverageDonut';
import CategoryCoverageChart from '@/components/charts/CategoryCoverageChart';
import GroupCalibrationCard from '@/components/GroupCalibrationCard';
import AnomalyItemCard from '@/components/AnomalyItemCard';
import AnomalySidebar from '@/components/AnomalySidebar';
import BadExampleCard from '@/components/BadExampleCard';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Download,
  Settings,
  BarChart3,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { formatPercent, formatNumber } from '@/utils/statistics';
import { getImprovementText, getCoverageStatus } from '@/utils/analysisService';

export default function AnalysisPage() {
  const navigate = useNavigate();
  const analysisResult = useAnalysisResult();
  const isAnalyzing = useIsAnalyzing();
  const selectedCategory = useSelectedCategory();
  const anomalyFilters = useAnomalyFilters();
  const { setSelectedCategory, setConfig, config } = useAppStore();
  const [showConfig, setShowConfig] = useState(false);

  const categoryGroups = useMemo(() => {
    const map = new Map<string, GroupType>();
    if (analysisResult) {
      analysisResult.groupResults.forEach(g => {
        g.categories.forEach(cat => map.set(cat, g.group));
      });
    }
    return map;
  }, [analysisResult]);

  const filteredAnomalies = useMemo(() => {
    if (!analysisResult) return [];
    if (anomalyFilters.size === 0) return analysisResult.anomalies;
    return analysisResult.anomalies.filter(a => anomalyFilters.has(a.type));
  }, [analysisResult, anomalyFilters]);

  if (!analysisResult && !isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
          <BarChart3 className="text-neutral-400" size={40} />
        </div>
        <h2 className="text-xl font-semibold text-neutral-700 mb-2">暂无分析数据</h2>
        <p className="text-neutral-500 mb-6">请先上传数据文件或使用演示数据</p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary"
        >
          前往数据上传
        </button>
      </div>
    );
  }

  if (!analysisResult) return null;

  const {
    overallCoverage,
    targetCoverage,
    overallCalibratedCoverage,
    categoryResults,
    groupResults,
    badExamples,
    totalRows,
    validRowCount,
    dirtyRowCount,
    calibrationCoefficients,
  } = analysisResult;

  const improvement = overallCalibratedCoverage - overallCoverage;
  const status = getCoverageStatus(overallCoverage, targetCoverage);
  const calibratedStatus = getCoverageStatus(overallCalibratedCoverage, targetCoverage);

  const hotGroup = groupResults.find(g => g.group === 'hot');
  const normalGroup = groupResults.find(g => g.group === 'normal');
  const coldGroup = groupResults.find(g => g.group === 'cold');

  const anomalyCounts = {
    promotion: analysisResult.anomalies.filter(a => a.type === 'promotion').length,
    low_sample: analysisResult.anomalies.filter(a => a.type === 'low_sample').length,
    under_coverage: analysisResult.anomalies.filter(a => a.type === 'under_coverage').length,
    bad_forecast: analysisResult.anomalies.filter(a => a.type === 'bad_forecast').length,
    logic_error: analysisResult.anomalies.filter(a => a.type === 'logic_error').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">校准分析</h1>
          <p className="text-neutral-500">
            分析时间：{analysisResult.processedAt.toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
          >
            <Settings size={18} />
            <span className="text-sm font-medium">参数配置</span>
          </button>
          <button
            onClick={() => navigate('/export')}
            className="btn-primary flex items-center gap-2"
          >
            <Download size={18} />
            <span>导出结果</span>
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="card animate-slide-up">
          <h3 className="font-semibold text-neutral-800 mb-4">分析参数配置</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1">
                目标覆盖率
              </label>
              <input
                type="number"
                min="0.5"
                max="0.99"
                step="0.05"
                value={config.targetCoverage}
                onChange={(e) => setConfig({ targetCoverage: parseFloat(e.target.value) })}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1">
                热门品类分位数
              </label>
              <input
                type="number"
                min="0.5"
                max="0.95"
                step="0.05"
                value={config.hotThresholdPercentile}
                onChange={(e) => setConfig({ hotThresholdPercentile: parseFloat(e.target.value) })}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1">
                冷门品类分位数
              </label>
              <input
                type="number"
                min="0.05"
                max="0.5"
                step="0.05"
                value={config.coldThresholdPercentile}
                onChange={(e) => setConfig({ coldThresholdPercentile: parseFloat(e.target.value) })}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1">
                最小样本量
              </label>
              <input
                type="number"
                min="10"
                max="100"
                step="5"
                value={config.minCategorySampleSize}
                onChange={(e) => setConfig({ minCategorySampleSize: parseInt(e.target.value) })}
                className="input-field text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setShowConfig(false);
                useAppStore.getState().runAnalysis();
              }}
              className="btn-primary text-sm"
            >
              重新分析
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-neutral-500 mb-1">总数据量</p>
          <p className="text-2xl font-bold text-neutral-800">{totalRows}</p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-green-600">✓ 有效 {validRowCount}</span>
            <span className="text-neutral-300">|</span>
            <span className="text-red-500">✗ 脏数据 {dirtyRowCount}</span>
          </div>
        </div>

        <div className="card">
          <p className="text-sm text-neutral-500 mb-1">原始覆盖率</p>
          <p className={`text-2xl font-bold ${status.color}`}>
            {formatPercent(overallCoverage)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <span className={`text-xs ${status.status === 'excellent' || status.status === 'good' ? 'text-green-600' : status.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
              {status.label}
            </span>
            <span className="text-xs text-neutral-400">
              目标 {formatPercent(targetCoverage)}
            </span>
          </div>
        </div>

        <div className="card border-l-4 border-l-accent-success">
          <p className="text-sm text-neutral-500 mb-1">校准后覆盖率</p>
          <p className={`text-2xl font-bold ${calibratedStatus.color}`}>
            {formatPercent(overallCalibratedCoverage)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            {improvement > 0.01 ? (
              <><TrendingUp className="text-green-500" size={14} /><span className="text-xs text-green-600">+{formatPercent(improvement)}</span></>
            ) : improvement < -0.01 ? (
              <><TrendingDown className="text-red-500" size={14} /><span className="text-xs text-red-600">{formatPercent(improvement)}</span></>
            ) : (
              <><Minus className="text-neutral-400" size={14} /><span className="text-xs text-neutral-500">基本持平</span></>
            )}
          </div>
        </div>

        <div className="card border-l-4 border-l-accent-danger">
          <p className="text-sm text-neutral-500 mb-1">异常总数</p>
          <p className="text-2xl font-bold text-accent-danger">
            {analysisResult.anomalies.length}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {anomalyCounts.promotion > 0 && (
              <span className="tag-warning">{ANOMALY_TYPE_LABELS.promotion} {anomalyCounts.promotion}</span>
            )}
            {anomalyCounts.bad_forecast > 0 && (
              <span className="tag-danger">坏值 {anomalyCounts.bad_forecast}</span>
            )}
            {anomalyCounts.under_coverage > 0 && (
              <span className="tag-info">覆盖不足 {anomalyCounts.under_coverage}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 space-y-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="text-primary" size={20} />
              <h3 className="font-semibold text-neutral-800">分组校准面板</h3>
            </div>

            <div className="flex items-center justify-center mb-6">
              <CoverageDonut
                coverage={overallCoverage}
                targetCoverage={targetCoverage}
                size={180}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-red-700">{GROUP_LABELS.hot}</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">
                    {hotGroup ? formatPercent(hotGroup.coverage) : '-'}
                  </p>
                  <p className="text-xs text-red-400">
                    {hotGroup ? `校准后 ${formatPercent(hotGroup.calibratedCoverage)}` : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">{GROUP_LABELS.normal}</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">
                    {normalGroup ? formatPercent(normalGroup.coverage) : '-'}
                  </p>
                  <p className="text-xs text-blue-400">
                    {normalGroup ? `校准后 ${formatPercent(normalGroup.calibratedCoverage)}` : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">{GROUP_LABELS.cold}</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-600">
                    {coldGroup ? formatPercent(coldGroup.coverage) : '-'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {coldGroup ? `校准后 ${formatPercent(coldGroup.calibratedCoverage)}` : '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
              <p className="text-xs font-medium text-neutral-500 mb-2">校准系数</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">热门收缩系数</span>
                  <span className="font-mono font-bold text-red-600">
                    {calibrationCoefficients.hotShrinkFactor.toFixed(2)}x
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">普通调整系数</span>
                  <span className="font-mono font-bold text-blue-600">
                    {calibrationCoefficients.normalAdjustFactor.toFixed(2)}x
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">冷门扩展系数</span>
                  <span className="font-mono font-bold text-gray-600">
                    {calibrationCoefficients.coldExpandFactor.toFixed(2)}x
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {hotGroup && (
              <GroupCalibrationCard
                groupResult={hotGroup}
                targetCoverage={targetCoverage}
              />
            )}
            {normalGroup && (
              <GroupCalibrationCard
                groupResult={normalGroup}
                targetCoverage={targetCoverage}
              />
            )}
            {coldGroup && (
              <GroupCalibrationCard
                groupResult={coldGroup}
                targetCoverage={targetCoverage}
              />
            )}
          </div>
        </div>

        <div className="col-span-6 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-primary" size={20} />
                <h3 className="font-semibold text-neutral-800">分品类覆盖率</h3>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-primary hover:text-primary-light"
                >
                  清除选择
                </button>
              )}
            </div>

            <CategoryCoverageChart
              categoryResults={categoryResults}
              targetCoverage={targetCoverage}
              categoryGroups={categoryGroups}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-neutral-500">{GROUP_LABELS.hot}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-neutral-500">{GROUP_LABELS.normal}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-neutral-400" />
                <span className="text-xs text-neutral-500">{GROUP_LABELS.cold}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-red-500 border-t-2 border-dashed border-red-500" />
                <span className="text-xs text-neutral-500">目标覆盖率</span>
              </div>
            </div>
          </div>

          {badExamples.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-accent-danger" size={20} />
                <h3 className="font-semibold text-neutral-800">
                  严重坏值样例 ({badExamples.length})
                </h3>
                <span className="tag-danger">需优先处理</span>
              </div>
              <div className="grid gap-4">
                {badExamples.slice(0, 3).map((example, idx) => (
                  <BadExampleCard
                    key={example.id}
                    example={example}
                    rank={idx + 1}
                  />
                ))}
              </div>
              {badExamples.length > 3 && (
                <p className="text-center text-sm text-neutral-400 mt-4">
                  还有 {badExamples.length - 3} 个严重坏值，请在右侧异常列表中查看
                </p>
              )}
            </div>
          )}

          {selectedCategory && (
            <div className="card animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-800">品类详情 - {selectedCategory}</h3>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              </div>
              {(() => {
                const cat = categoryResults.find(c => c.category === selectedCategory);
                if (!cat) return null;
                return (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <p className="text-xs text-neutral-400 mb-1">覆盖率</p>
                      <p className={`text-2xl font-bold ${cat.coverage >= targetCoverage ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(cat.coverage)}
                      </p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <p className="text-xs text-neutral-400 mb-1">样本量</p>
                      <p className="text-2xl font-bold text-neutral-700">{cat.validSampleSize}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <p className="text-xs text-neutral-400 mb-1">中位数销量</p>
                      <p className="text-2xl font-bold text-primary">{formatNumber(cat.medianSales)}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <p className="text-xs text-neutral-400 mb-1">平均预测值</p>
                      <p className="text-lg font-bold text-neutral-700">{formatNumber(cat.avgForecast)}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <p className="text-xs text-neutral-400 mb-1">平均真实销量</p>
                      <p className="text-lg font-bold text-neutral-700">{formatNumber(cat.avgActual)}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <p className="text-xs text-neutral-400 mb-1">平均区间宽度</p>
                      <p className="text-lg font-bold text-neutral-700">{formatNumber(cat.avgIntervalWidth)}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="col-span-3">
          <div className="card h-full">
            <AnomalySidebar anomalies={analysisResult.anomalies} />
          </div>

          <div className="card mt-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-accent-danger" size={20} />
              <h3 className="font-semibold text-neutral-800">
                异常列表
                {anomalyFilters.size > 0 && (
                  <span className="tag-info ml-2">已筛选</span>
                )}
              </h3>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
              {filteredAnomalies.length > 0 ? (
                filteredAnomalies.slice(0, 20).map(anomaly => (
                  <AnomalyItemCard key={anomaly.id} anomaly={anomaly} />
                ))
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>{anomalyFilters.size > 0 ? '没有符合筛选条件的异常' : '暂无异常数据'}</p>
                </div>
              )}
              {filteredAnomalies.length > 20 && (
                <p className="text-center text-sm text-neutral-400 py-2">
                  还有 {filteredAnomalies.length - 20} 条异常，请前往导出页查看完整列表
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
