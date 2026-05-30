import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  Filter,
  Download,
  Calendar,
  Package,
  DollarSign,
  BarChart3,
  ChevronRight,
  Tag,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/common/StatusBadge';
import ForecastChart from '@/components/charts/ForecastChart';
import { generateForecastSeries } from '@/utils/forecast';
import { exportFullReport } from '@/utils/export';
import { roundTo } from '@/utils/statistics';
import type { ReplenishmentSuggestion, StockStatus } from '@/types';

type FilterType = 'all' | 'shortage' | 'overstock' | 'warning' | 'healthy';
type SortField = 'skuId' | 'suggestedOrderQuantity' | 'safetyStock' | 'currentStock' | 'impactPercentage';

export default function Replenishment() {
  const navigate = useNavigate();
  const {
    replenishmentSuggestions,
    forecastResults,
    anomalyRecords,
    skus,
    skuMap,
    getSkuStockStatus,
    getHealthScore,
    promotionCalendar,
  } = useAppStore();
  
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('suggestedOrderQuantity');
  const [sortAsc, setSortAsc] = useState(false);
  const [showPromotionOnly, setShowPromotionOnly] = useState(false);
  
  const stockStatusMap = getSkuStockStatus();
  const healthScore = getHealthScore();
  
  const filteredAndSortedSuggestions = useMemo(() => {
    let result = [...replenishmentSuggestions];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((s) => {
        const sku = skuMap[s.skuId];
        return (
          s.skuId.toLowerCase().includes(term) ||
          sku?.name.toLowerCase().includes(term) ||
          sku?.category.toLowerCase().includes(term)
        );
      });
    }
    
    if (filterType !== 'all') {
      result = result.filter((s) => stockStatusMap[s.skuId] === filterType);
    }
    
    if (showPromotionOnly) {
      result = result.filter((s) => s.affectedByPromotion);
    }
    
    result.sort((a, b) => {
      let aVal: number;
      let bVal: number;
      
      if (sortField === 'skuId') {
        return sortAsc ? a.skuId.localeCompare(b.skuId) : b.skuId.localeCompare(a.skuId);
      }
      
      if (sortField === 'impactPercentage') {
        aVal = a.promotionImpact?.impactPercentage ?? 0;
        bVal = b.promotionImpact?.impactPercentage ?? 0;
      } else {
        aVal = a[sortField] ?? 0;
        bVal = b[sortField] ?? 0;
      }
      
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    
    return result;
  }, [replenishmentSuggestions, searchTerm, filterType, sortField, sortAsc, showPromotionOnly, stockStatusMap, skuMap]);
  
  const selectedSuggestion = useMemo(() => {
    if (!selectedSkuId) return null;
    return replenishmentSuggestions.find((s) => s.skuId === selectedSkuId);
  }, [selectedSkuId, replenishmentSuggestions]);
  
  const selectedForecast = useMemo(() => {
    if (!selectedSkuId) return null;
    return forecastResults.find((f) => f.skuId === selectedSkuId);
  }, [selectedSkuId, forecastResults]);
  
  const selectedSku = useMemo(() => {
    if (!selectedSkuId) return null;
    return skuMap[selectedSkuId];
  }, [selectedSkuId, skuMap]);
  
  const forecastSeries = useMemo(() => {
    if (!selectedForecast || !selectedSku) return null;
    return generateForecastSeries(selectedForecast.historicalDemand, selectedSku.leadTimeDays, selectedForecast.modelUsed);
  }, [selectedForecast, selectedSku]);
  
  const totalOrderQuantity = useMemo(() => {
    return replenishmentSuggestions.reduce((sum, s) => sum + s.suggestedOrderQuantity, 0);
  }, [replenishmentSuggestions]);
  
  const totalOrderValue = useMemo(() => {
    return replenishmentSuggestions.reduce((sum, s) => {
      const sku = skuMap[s.skuId];
      return sum + s.suggestedOrderQuantity * (sku?.unitCost ?? 0);
    }, 0);
  }, [replenishmentSuggestions, skuMap]);
  
  const affectedByPromotionCount = useMemo(() => {
    return replenishmentSuggestions.filter((s) => s.affectedByPromotion).length;
  }, [replenishmentSuggestions]);
  
  const getStockStatus = (s: ReplenishmentSuggestion): StockStatus => {
    return stockStatusMap[s.skuId] || 'healthy';
  };
  
  const getStatusIcon = (status: StockStatus) => {
    switch (status) {
      case 'shortage':
        return <ArrowDownRight className="w-4 h-4 text-danger-500" />;
      case 'overstock':
        return <ArrowUpRight className="w-4 h-4 text-primary-500" />;
      case 'warning':
        return <Minus className="w-4 h-4 text-warning-500" />;
      default:
        return <Minus className="w-4 h-4 text-success-500" />;
    }
  };
  
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
  
  if (replenishmentSuggestions.length === 0) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <ShoppingCart className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
          <h3 className="text-xl font-display font-semibold text-neutral-700 mb-2">
            暂无补货建议
          </h3>
          <p className="text-neutral-500 mb-6">
            请先导入销售历史和库存快照数据，系统将自动生成补货建议
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
          <h1 className="text-2xl font-display font-bold text-neutral-900">补货建议</h1>
          <p className="text-neutral-500 mt-1">
            基于概率模型的智能补货建议，支持动态参数调整
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {promotionCalendar.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-info-50 text-info-700 rounded-lg text-xs">
              <Tag className="w-3.5 h-3.5" />
              已标注 {affectedByPromotionCount} 个受促销影响的SKU
            </div>
          )}
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            导出补货清单
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">建议补货总数</p>
              <p className="text-2xl font-bold font-mono text-neutral-900 mt-2">
                {totalOrderQuantity.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-success-600" />
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            共 {replenishmentSuggestions.length} 个SKU
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">补货总金额</p>
              <p className="text-2xl font-bold font-mono text-neutral-900 mt-2">
                ¥{totalOrderValue.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            平均单价 ¥{totalOrderQuantity > 0 ? roundTo(totalOrderValue / totalOrderQuantity, 2) : 0}
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">缺货预警SKU</p>
              <p className="text-2xl font-bold font-mono text-danger-600 mt-2">
                {replenishmentSuggestions.filter((s) => stockStatusMap[s.skuId] === 'shortage').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-danger-50 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-danger-600" />
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            需立即补货
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">积压预警SKU</p>
              <p className="text-2xl font-bold font-mono text-primary-600 mt-2">
                {replenishmentSuggestions.filter((s) => stockStatusMap[s.skuId] === 'overstock').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-600" />
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            建议减少补货
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="搜索SKU编号、名称或分类..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                  className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="all">全部状态</option>
                  <option value="shortage">缺货</option>
                  <option value="overstock">积压</option>
                  <option value="warning">预警</option>
                  <option value="healthy">健康</option>
                </select>
              </div>
              
              {promotionCalendar.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPromotionOnly}
                    onChange={(e) => setShowPromotionOnly(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700">仅显示受促销影响</span>
                </label>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">排序:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="suggestedOrderQuantity">按补货量</option>
                  <option value="safetyStock">按安全库存</option>
                  <option value="currentStock">按当前库存</option>
                  <option value="impactPercentage">按促销影响</option>
                  <option value="skuId">按SKU编号</option>
                </select>
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  {sortAsc ? (
                    <ArrowUpRight className="w-4 h-4 text-neutral-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-neutral-600" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">
                      当前库存
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">
                      安全库存
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">
                      再订货点
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">
                      建议补货
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">
                      缺货概率
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredAndSortedSuggestions.map((suggestion) => {
                    const sku = skuMap[suggestion.skuId];
                    const status = getStockStatus(suggestion);
                    
                    return (
                      <tr
                        key={suggestion.skuId}
                        onClick={() => setSelectedSkuId(suggestion.skuId)}
                        className={`cursor-pointer transition-colors hover:bg-neutral-50 ${
                          selectedSkuId === suggestion.skuId ? 'bg-primary-50' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm font-medium text-neutral-900">
                              {suggestion.skuId}
                            </p>
                            {suggestion.affectedByPromotion && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-info-100 text-info-700">
                                促销
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">{sku?.name}</p>
                          <p className="text-xs text-neutral-400">{sku?.category}</p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-mono text-sm ${
                            suggestion.currentStock < suggestion.safetyStock * 0.5 ? 'text-danger-600 font-medium' : 'text-neutral-700'
                          }`}>
                            {suggestion.currentStock}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono text-sm text-neutral-700">
                            {roundTo(suggestion.safetyStock, 0)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono text-sm text-neutral-700">
                            {roundTo(suggestion.reorderPoint, 0)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-mono font-bold text-sm ${
                            suggestion.suggestedOrderQuantity > 0 ? 'text-primary-600' : 'text-neutral-400'
                          }`}>
                            {suggestion.suggestedOrderQuantity > 0 ? suggestion.suggestedOrderQuantity : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-mono text-sm ${
                            suggestion.stockoutProbability > 0.1 ? 'text-danger-600' : 
                            suggestion.stockoutProbability > 0.05 ? 'text-warning-600' : 'text-success-600'
                          }`}>
                            {(suggestion.stockoutProbability * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {getStatusIcon(status)}
                            <StatusBadge status={status} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredAndSortedSuggestions.length === 0 && (
              <div className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                <p className="text-neutral-500">没有匹配的SKU</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          {selectedSuggestion && selectedSku && selectedForecast && forecastSeries ? (
            <div className="bg-white rounded-xl shadow-card overflow-hidden sticky top-8">
              <div className="p-4 border-b border-neutral-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono font-bold text-neutral-900">{selectedSuggestion.skuId}</p>
                    <p className="text-sm text-neutral-500">{selectedSku.name}</p>
                    <p className="text-xs text-neutral-400">{selectedSku.category}</p>
                  </div>
                  <StatusBadge status={getStockStatus(selectedSuggestion)} />
                </div>
              </div>
              
              <div className="p-4 border-b border-neutral-200">
                <ForecastChart
                  series={forecastSeries}
                  safetyStock={selectedSuggestion.safetyStock}
                />
              </div>
              
              <div className="p-4 space-y-4">
                {selectedSuggestion.affectedByPromotion && selectedSuggestion.promotionImpact && (
                  <div className="bg-info-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-info-600" />
                      <p className="text-sm font-medium text-info-800">促销影响分析</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-neutral-500">原安全库存</p>
                        <p className="font-mono font-bold text-info-700">
                          {roundTo(selectedSuggestion.promotionImpact.fieldChanges.find(f => f.field === 'safetyStock')?.oldValue ?? 0, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">新安全库存</p>
                        <p className="font-mono font-bold text-info-700">
                          {roundTo(selectedSuggestion.promotionImpact.fieldChanges.find(f => f.field === 'safetyStock')?.newValue ?? 0, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">变化幅度</p>
                        <p className="font-mono font-bold text-info-700">
                          +{selectedSuggestion.promotionImpact.impactPercentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <p className="text-xs text-neutral-500">服务水平</p>
                    <p className="font-mono font-bold text-neutral-900 mt-1">
                      {(selectedSuggestion.serviceLevel * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <p className="text-xs text-neutral-500">预测周需求</p>
                    <p className="font-mono font-bold text-neutral-900 mt-1">
                      {roundTo(selectedSuggestion.forecastedDemand, 1)}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <p className="text-xs text-neutral-500">建议下单日</p>
                    <p className="font-mono font-bold text-neutral-900 mt-1 text-xs">
                      {selectedSuggestion.suggestedOrderDate}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <p className="text-xs text-neutral-500">预计到货日</p>
                    <p className="font-mono font-bold text-neutral-900 mt-1 text-xs">
                      {selectedSuggestion.expectedArrivalDate}
                    </p>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-neutral-100">
                  <p className="text-xs font-medium text-neutral-700 mb-2">补货明细</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">当前库存</span>
                      <span className="font-mono text-neutral-700">{selectedSuggestion.currentStock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">安全库存</span>
                      <span className="font-mono text-neutral-700">{roundTo(selectedSuggestion.safetyStock, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">补货周期需求</span>
                      <span className="font-mono text-neutral-700">
                        {roundTo(selectedSuggestion.forecastedDemand, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-neutral-100">
                      <span className="font-medium text-neutral-700">建议补货量</span>
                      <span className="font-mono font-bold text-primary-600">
                        {selectedSuggestion.suggestedOrderQuantity}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-neutral-100">
                  <p className="text-xs font-medium text-neutral-700 mb-2">使用模型</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-primary-50 text-primary-700 text-xs font-mono">
                      {selectedForecast.modelUsed}
                    </span>
                    <span className="text-xs text-neutral-500">
                      预测误差 MAPE: {roundTo(selectedForecast.mape * 100, 1)}%
                    </span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-neutral-100">
                  <p className="text-xs font-medium text-neutral-700 mb-2">计算依据</p>
                  <ul className="text-xs text-neutral-500 space-y-1">
                    <li>• 需求均值: {roundTo(selectedForecast.forecastMean, 2)}</li>
                    <li>• 需求标准差: {roundTo(selectedForecast.forecastStd, 2)}</li>
                    <li>• 补货周期: {selectedSku.leadTimeDays}天</li>
                    <li>• Z值: {roundTo(selectedForecast.zValue, 2)}</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-card p-8 text-center sticky top-8">
              <Calendar className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-500">点击左侧SKU查看详情</p>
              <p className="text-xs text-neutral-400 mt-1">
                包含概率预测图表、促销影响分析、补货明细
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
