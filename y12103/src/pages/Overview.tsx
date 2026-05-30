import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Package,
  BarChart3,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import GaugeChart from '@/components/charts/GaugeChart';
import StockStatusChart from '@/components/charts/StockStatusChart';
import StatusBadge from '@/components/common/StatusBadge';
import { generateAnomalySummary } from '@/utils/anomaly';
import { exportFullReport } from '@/utils/export';
import { roundTo } from '@/utils/statistics';

export default function Overview() {
  const navigate = useNavigate();
  const {
    replenishmentSuggestions,
    anomalyRecords,
    skus,
    skuMap,
    getHealthScore,
    getSkuStockStatus,
    forecastResults,
    promotionCalendar,
    importState,
    parameters,
    updateParameters,
    isCalculating,
  } = useAppStore();
  
  const healthScore = getHealthScore();
  const stockStatusMap = getSkuStockStatus();
  const anomalySummary = useMemo(() => generateAnomalySummary(anomalyRecords), [anomalyRecords]);
  
  const stockStatusData = useMemo(() => {
    const counts = {
      healthy: 0,
      warning: 0,
      shortage: 0,
      overstock: 0,
    };
    
    for (const status of Object.values(stockStatusMap)) {
      counts[status]++;
    }
    
    return [
      { name: '健康', value: counts.healthy, color: '#10B981' },
      { name: '预警', value: counts.warning, color: '#F59E0B' },
      { name: '缺货', value: counts.shortage, color: '#EF4444' },
      { name: '积压', value: counts.overstock, color: '#0F3B5F' },
    ];
  }, [stockStatusMap]);
  
  const keyMetrics = useMemo(() => {
    if (replenishmentSuggestions.length === 0) {
      return [
        { label: '库存周转天数', value: '-', icon: TrendingUp, change: null, changeType: null },
        { label: '库销比', value: '-', icon: BarChart3, change: null, changeType: null },
        { label: '动销率', value: '-', icon: Package, change: null, changeType: null },
        { label: '缺货率', value: '-', icon: AlertTriangle, change: null, changeType: null },
      ];
    }
    
    let totalStockValue = 0;
    let totalSalesValue = 0;
    let activeSkus = 0;
    let shortageSkus = 0;
    
    for (const s of replenishmentSuggestions) {
      const sku = skuMap[s.skuId];
      const unitCost = sku?.unitCost ?? 0;
      const sellingPrice = sku?.sellingPrice ?? 0;
      
      totalStockValue += s.currentStock * unitCost;
      totalSalesValue += s.forecastedDemand * sellingPrice;
      
      if (s.forecastedDemand > 0) activeSkus++;
      if (s.currentStock < s.safetyStock * 0.5) shortageSkus++;
    }
    
    const avgDailyDemand = replenishmentSuggestions.reduce((sum, s) => sum + s.forecastedDemand, 0) / replenishmentSuggestions.length / 7;
    const avgStock = replenishmentSuggestions.reduce((sum, s) => sum + s.currentStock, 0) / replenishmentSuggestions.length;
    
    const turnoverDays = avgDailyDemand > 0 ? roundTo(avgStock / avgDailyDemand, 1) : 0;
    const stockSalesRatio = totalSalesValue > 0 ? roundTo(totalStockValue / totalSalesValue, 2) : 0;
    const activeRate = replenishmentSuggestions.length > 0 ? roundTo((activeSkus / replenishmentSuggestions.length) * 100, 1) : 0;
    const shortageRate = replenishmentSuggestions.length > 0 ? roundTo((shortageSkus / replenishmentSuggestions.length) * 100, 1) : 0;
    
    return [
      {
        label: '库存周转天数',
        value: `${turnoverDays}天`,
        icon: TrendingUp,
        change: turnoverDays < 30 ? '-12%' : turnoverDays < 60 ? '+5%' : '+25%',
        changeType: turnoverDays < 30 ? 'positive' : turnoverDays < 60 ? 'neutral' : 'negative' as any,
      },
      {
        label: '库销比',
        value: stockSalesRatio.toString(),
        icon: BarChart3,
        change: stockSalesRatio < 1.5 ? '-8%' : stockSalesRatio < 3 ? '+3%' : '+18%',
        changeType: stockSalesRatio < 1.5 ? 'positive' : stockSalesRatio < 3 ? 'neutral' : 'negative' as any,
      },
      {
        label: '动销率',
        value: `${activeRate}%`,
        icon: Package,
        change: activeRate > 85 ? '+5%' : activeRate > 70 ? '持平' : '-10%',
        changeType: activeRate > 85 ? 'positive' : activeRate > 70 ? 'neutral' : 'negative' as any,
      },
      {
        label: '缺货率',
        value: `${shortageRate}%`,
        icon: AlertTriangle,
        change: shortageRate < 5 ? '-3%' : shortageRate < 15 ? '+2%' : '+12%',
        changeType: shortageRate < 5 ? 'positive' : shortageRate < 15 ? 'neutral' : 'negative' as any,
      },
    ];
  }, [replenishmentSuggestions, skuMap]);
  
  const handleExport = () => {
    const versionName = promotionCalendar.length > 0 ? '含促销数据' : '基础数据';
    exportFullReport(
      replenishmentSuggestions,
      anomalyRecords,
      forecastResults,
      skus,
      healthScore,
      versionName
    );
  };
  
  const handleServiceLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParameters({ serviceLevel: parseFloat(e.target.value) });
  };
  
  const handleMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateParameters({ safetyStockMultiplier: parseFloat(e.target.value) });
  };
  
  if (replenishmentSuggestions.length === 0) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
          <h3 className="text-xl font-display font-semibold text-neutral-700 mb-2">
            暂无库存数据
          </h3>
          <p className="text-neutral-500 mb-6">
            请先导入销售历史和库存快照数据，系统将自动计算库存健康度
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            前往数据导入
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">库存概览</h1>
          <p className="text-neutral-500 mt-1">
            库存健康度仪表盘，实时监控整体库存状态
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isCalculating && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <RefreshCw className="w-4 h-4 animate-spin" />
              重新计算中...
            </div>
          )}
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
          >
            <DollarSign className="w-4 h-4" />
            导出完整报告
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <h3 className="text-lg font-display font-semibold text-neutral-800">计算参数</h3>
          <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
            调整参数后系统将实时重算
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              服务水平
            </label>
            <select
              value={parameters.serviceLevel}
              onChange={handleServiceLevelChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value={0.90}>90% - 标准服务</option>
              <option value={0.95}>95% - 优质服务（推荐）</option>
              <option value={0.97}>97% - 高服务水平</option>
              <option value={0.99}>99% - 极致服务</option>
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              服务水平越高，安全库存越多，缺货概率越低
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              安全库存乘数: {parameters.safetyStockMultiplier.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={parameters.safetyStockMultiplier}
              onChange={handleMultiplierChange}
              className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-neutral-500 mt-1">
              <span>保守 0.5x</span>
              <span>标准 1.0x</span>
              <span>激进 2.0x</span>
            </div>
          </div>
          
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm font-medium text-neutral-700 mb-2">数据状态</p>
            <div className="space-y-1 text-xs text-neutral-600">
              <p>销售记录: {importState.salesRowCount} 条</p>
              <p>库存记录: {importState.inventoryRowCount} 条</p>
              <p>促销日历: {importState.promotionImported ? `${importState.promotionRowCount} 条` : '未导入'}</p>
              <p>服务水平: {(parameters.serviceLevel * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {keyMetrics.map((metric, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-card p-5 hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-500">{metric.label}</p>
                <p className="text-2xl font-bold font-mono text-neutral-900 mt-2">
                  {metric.value}
                </p>
              </div>
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <metric.icon className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            {metric.change && (
              <div className="mt-3 flex items-center gap-1">
                {metric.changeType === 'positive' ? (
                  <TrendingDown className="w-4 h-4 text-success-500" />
                ) : metric.changeType === 'negative' ? (
                  <TrendingUp className="w-4 h-4 text-danger-500" />
                ) : (
                  <div className="w-4 h-4" />
                )}
                <span
                  className={`text-sm font-medium ${
                    metric.changeType === 'positive'
                      ? 'text-success-600'
                      : metric.changeType === 'negative'
                      ? 'text-danger-600'
                      : 'text-neutral-500'
                  }`}
                >
                  {metric.change}
                </span>
                <span className="text-xs text-neutral-400">vs 行业均值</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="text-lg font-display font-semibold text-neutral-800 mb-4">
            库存健康度
          </h3>
          <GaugeChart value={healthScore.overall} title="综合评分" />
          
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="text-center">
              <p className="text-xs text-neutral-500">缺货风险</p>
              <p className={`text-lg font-bold font-mono ${
                healthScore.stockoutRisk >= 80 ? 'text-success-600' :
                healthScore.stockoutRisk >= 60 ? 'text-warning-600' : 'text-danger-600'
              }`}>
                {healthScore.stockoutRisk}分
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-500">积压风险</p>
              <p className={`text-lg font-bold font-mono ${
                healthScore.overstockRisk >= 80 ? 'text-success-600' :
                healthScore.overstockRisk >= 60 ? 'text-warning-600' : 'text-danger-600'
              }`}>
                {healthScore.overstockRisk}分
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-500">资金效率</p>
              <p className={`text-lg font-bold font-mono ${
                healthScore.capitalEfficiency >= 80 ? 'text-success-600' :
                healthScore.capitalEfficiency >= 60 ? 'text-warning-600' : 'text-danger-600'
              }`}>
                {healthScore.capitalEfficiency}分
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-500">周转评分</p>
              <p className={`text-lg font-bold font-mono ${
                healthScore.turnoverScore >= 80 ? 'text-success-600' :
                healthScore.turnoverScore >= 60 ? 'text-warning-600' : 'text-danger-600'
              }`}>
                {healthScore.turnoverScore}分
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="text-lg font-display font-semibold text-neutral-800 mb-4">
            SKU库存状态分布
          </h3>
          <StockStatusChart data={stockStatusData} />
          
          <div className="grid grid-cols-4 gap-2 mt-4">
            {stockStatusData.map((item) => (
              <div key={item.name} className="text-center">
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-1"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-xs text-neutral-500">{item.name}</p>
                <p className="text-sm font-bold font-mono text-neutral-800">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="text-lg font-display font-semibold text-neutral-800 mb-4">
            异常告警
          </h3>
          
          {anomalySummary.total === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-success-600" />
              </div>
              <p className="text-neutral-700 font-medium">一切正常</p>
              <p className="text-sm text-neutral-500 mt-1">未检测到异常</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-danger-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-danger-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-danger-800">严重异常</p>
                    <p className="text-xs text-danger-600">{anomalySummary.bySeverity.critical} 个SKU</p>
                  </div>
                </div>
                <StatusBadge status="critical" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-800">高风险</p>
                    <p className="text-xs text-orange-600">{anomalySummary.bySeverity.high} 个SKU</p>
                  </div>
                </div>
                <StatusBadge status="high" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-warning-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-warning-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-warning-800">中风险</p>
                    <p className="text-xs text-warning-600">{anomalySummary.bySeverity.medium} 个SKU</p>
                  </div>
                </div>
                <StatusBadge status="medium" />
              </div>
              
              <button
                onClick={() => navigate('/anomaly')}
                className="w-full flex items-center justify-center gap-2 mt-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                查看异常详情
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
