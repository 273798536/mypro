import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Activity, AlertOctagon, ArrowUpRight, ArrowDownRight, Scale, Building2 } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { Panel } from '../ui/Panel';
import { Badge } from '../ui/Badge';
import { getRiskColor } from '../../utils/color';
import { getAssetAnomalies } from '../../engine/anomalyDetector';
import { getAssetCategory } from '../../engine/classifier';
import type { RiskLevel } from '../../types/asset';

const RISK_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const CHANGE_LABELS: Record<string, string> = {
  return: '收益率',
  volatility: '波动率',
  drawdown: '最大回撤',
  position: '位置',
};

export function InfoPanel() {
  const selectedAssetId = useUIStore(s => s.selectedAssetId);
  const hoveredAssetId = useUIStore(s => s.hoveredAssetId);
  const setSelectedAssetId = useUIStore(s => s.setSelectedAssetId);
  const activeRun = useUIStore(s => s.activeRun);
  const selectedIndustries = useUIStore(s => s.selectedIndustries);
  const highlightRisk = useUIStore(s => s.highlightRisk);
  
  const firstRunResult = useDataStore(s => s.firstRunResult);
  const secondRunResult = useDataStore(s => s.secondRunResult);
  
  const result = activeRun === 'first' || activeRun === 'comparison'
    ? firstRunResult
    : secondRunResult;
  
  const displayAssetId = selectedAssetId || hoveredAssetId;
  
  const asset = result?.assets.find(a => a.id === displayAssetId);
  
  const changes = secondRunResult?.changes || [];
  const assetChanges = changes.filter(c => c.assetId === displayAssetId);
  
  const handleClose = () => {
    setSelectedAssetId(null);
  };
  
  if (!result) {
    return (
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="absolute right-4 top-4 w-80 z-10"
      >
        <Panel title="统计信息" className="w-full">
          <div className="space-y-4 text-sm text-slate-400">
            <p className="text-center py-8">
              点击「生成样本数据」开始分析
            </p>
          </div>
        </Panel>
      </motion.div>
    );
  }
  
  const totalAssets = result.assets.length;
  const visibleAssets = result.assets.filter(a => a.weight !== 0).length;
  
  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="absolute right-4 top-4 w-80 z-10"
    >
      <AnimatePresence mode="wait">
        {asset ? (
          <motion.div
            key="asset-detail"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Panel
              title="资产详情"
              icon={
                <button onClick={handleClose} className="hover:text-slate-200 transition-colors">
                  <X size={14} />
                </button>
              }
              className="w-full"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold text-slate-100 font-mono">
                      {asset.code}
                    </div>
                    <div className="text-sm text-slate-400">{asset.name}</div>
                  </div>
                  <Badge
                    variant="category"
                    category={getAssetCategory(asset, result.anomalies)}
                  >
                    {getAssetCategory(asset, result.anomalies) === 'ready' && '可直接用'}
                    {getAssetCategory(asset, result.anomalies) === 'needReview' && '需确认'}
                    {getAssetCategory(asset, result.anomalies) === 'filterFailed' && '筛选失效'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-slate-500" />
                  <span className="text-sm text-slate-400">{asset.industry}</span>
                  <span className="text-slate-600">|</span>
                  <Scale size={14} className="text-slate-500" />
                  <span className={`text-sm ${asset.hasWeightAnomaly ? 'text-amber-400' : 'text-slate-400'}`}>
                    权重: {asset.weight.toFixed(2)}
                    {asset.hasWeightAnomaly && ' ⚠️'}
                  </span>
                </div>
                
                <div
                  className="h-1 rounded-full"
                  style={{ backgroundColor: getRiskColor(asset.riskLevel) }}
                />
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-400">
                      <TrendingUp size={12} />
                      <span className="text-xs">收益</span>
                    </div>
                    <div className="text-lg font-semibold text-slate-100 font-mono">
                      {(asset.expectedReturn * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-400">
                      <Activity size={12} />
                      <span className="text-xs">波动</span>
                    </div>
                    <div className="text-lg font-semibold text-slate-100 font-mono">
                      {(asset.volatility * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-red-400">
                      <AlertOctagon size={12} />
                      <span className="text-xs">回撤</span>
                    </div>
                    <div className="text-lg font-semibold text-slate-100 font-mono">
                      {(asset.maxDrawdown * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50">
                  <span className="text-sm text-slate-400">风险等级</span>
                  <Badge
                    variant={asset.riskLevel === 'low' ? 'success' : asset.riskLevel === 'medium' ? 'warning' : 'danger'}
                  >
                    {RISK_LABELS[asset.riskLevel]}
                  </Badge>
                </div>
                
                {assetChanges.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-700/30">
                    <div className="text-xs font-medium text-purple-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      二次运行变化
                    </div>
                    {assetChanges.map((change, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-800/30"
                      >
                        <span className="text-xs text-slate-400">
                          {CHANGE_LABELS[change.field]}
                        </span>
                        <div className={`flex items-center gap-1 text-xs font-mono ${
                          change.direction === 'up' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {change.direction === 'up' ? (
                            <ArrowUpRight size={12} />
                          ) : (
                            <ArrowDownRight size={12} />
                          )}
                          {(Math.abs(change.change) * 100).toFixed(2)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {getAssetAnomalies(asset, result.anomalies).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-700/30">
                    <div className="text-xs font-medium text-amber-400">异常提示</div>
                    {getAssetAnomalies(asset, result.anomalies).map((anomaly, index) => (
                      <div
                        key={index}
                        className="text-xs text-slate-400 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20"
                      >
                        {anomaly.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </motion.div>
        ) : (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Panel title="统计信息" className="w-full">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <div className="text-2xl font-bold text-slate-100">{totalAssets}</div>
                    <div className="text-xs text-slate-500">总资产数</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <div className="text-2xl font-bold text-slate-100">{visibleAssets}</div>
                    <div className="text-xs text-slate-500">有效资产</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-400">风险分布</div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${(result.categories.ready.length / totalAssets) * 100}%` }}
                    />
                    <div
                      className="bg-amber-500"
                      style={{ width: `${(result.categories.needReview.length / totalAssets) * 100}%` }}
                    />
                    <div
                      className="bg-red-500"
                      style={{ width: `${(result.categories.filterFailed.length / totalAssets) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>低风险 {result.assets.filter(a => a.riskLevel === 'low').length}</span>
                    <span>中风险 {result.assets.filter(a => a.riskLevel === 'medium').length}</span>
                    <span>高风险 {result.assets.filter(a => a.riskLevel === 'high').length}</span>
                  </div>
                </div>
                
                {selectedIndustries.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-700/30">
                    <div className="text-xs font-medium text-slate-400">行业筛选</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedIndustries.map(ind => (
                        <Badge key={ind} variant="info">{ind}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {highlightRisk !== 'all' && (
                  <div className="pt-2 border-t border-slate-700/30">
                    <div className="text-xs font-medium text-slate-400">风险高亮</div>
                    <Badge variant={highlightRisk === 'low' ? 'success' : highlightRisk === 'medium' ? 'warning' : 'danger'}>
                      {RISK_LABELS[highlightRisk]}
                    </Badge>
                  </div>
                )}
                
                {result.anomalies.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-700/30">
                    <div className="text-xs font-medium text-amber-400">
                      检测到 {result.anomalies.length} 个异常
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {result.anomalies.slice(0, 3).map((anomaly, index) => (
                        <div
                          key={index}
                          className={`text-xs px-2 py-1 rounded ${
                            anomaly.severity === 'error'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {anomaly.description}
                        </div>
                      ))}
                      {result.anomalies.length > 3 && (
                        <div className="text-xs text-slate-500 text-center">
                          还有 {result.anomalies.length - 3} 个异常...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
