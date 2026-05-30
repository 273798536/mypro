import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Download,
  ChevronRight,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/common/StatusBadge';
import { exportComparisonReport } from '@/utils/export';
import { roundTo } from '@/utils/statistics';
import type { DataVersion, StockStatus } from '@/types';

export default function Compare() {
  const navigate = useNavigate();
  const {
    versions,
    compareVersions,
    replenishmentSuggestions,
    skuMap,
    getHealthScore,
  } = useAppStore();
  
  const [leftVersionId, setLeftVersionId] = useState<string | null>(versions[0]?.id || null);
  const [rightVersionId, setRightVersionId] = useState<string | null>(versions[1]?.id || null);
  
  const currentHealthScore = getHealthScore();
  
  const comparisonResult = useMemo(() => {
    if (!leftVersionId || !rightVersionId) return null;
    return compareVersions(leftVersionId, rightVersionId);
  }, [leftVersionId, rightVersionId, compareVersions]);
  
  const leftVersion = useMemo(() => {
    return versions.find(v => v.id === leftVersionId) || null;
  }, [versions, leftVersionId]);
  
  const rightVersion = useMemo(() => {
    return versions.find(v => v.id === rightVersionId) || null;
  }, [versions, rightVersionId]);
  
  const getChangeIcon = (changed: number) => {
    if (changed > 0) return <ArrowUpRight className="w-4 h-4 text-primary-600" />;
    if (changed < 0) return <ArrowDownRight className="w-4 h-4 text-danger-600" />;
    return <Minus className="w-4 h-4 text-neutral-400" />;
  };
  
  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-primary-600';
    if (value < 0) return 'text-danger-600';
    return 'text-neutral-400';
  };
  
  const getStatusForStock = (current: number, safety: number): StockStatus => {
    const ratio = current / safety;
    if (ratio < 0.5) return 'shortage';
    if (ratio < 1.0) return 'warning';
    if (ratio > 2.0) return 'overstock';
    return 'healthy';
  };
  
  if (versions.length < 2) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <GitCompare className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
          <h3 className="text-xl font-display font-semibold text-neutral-700 mb-2">
            需要至少两个版本才能对比
          </h3>
          <p className="text-neutral-500 mb-6">
            请先导入数据并创建版本。建议先导入销售历史和库存快照创建版本1，
            再补充促销日历创建版本2，然后对比两者差异。
          </p>
          
          <div className="max-w-md mx-auto text-left bg-neutral-50 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-neutral-700 mb-2">操作指引：</p>
            <ol className="text-sm text-neutral-600 space-y-1 list-decimal list-inside">
              <li>在「数据导入」页面加载示例数据</li>
              <li>点击「保存版本并运行预测」创建版本1</li>
              <li>在同页面点击「加载示例促销数据」</li>
              <li>点击「保存版本并重新计算」创建版本2</li>
              <li>返回此页面选择两个版本进行对比</li>
            </ol>
          </div>
          
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
          <h1 className="text-2xl font-display font-bold text-neutral-900">版本对比</h1>
          <p className="text-neutral-500 mt-1">
            对比不同版本的补货建议，清晰展示促销日历对安全库存的影响
          </p>
        </div>
        
        {comparisonResult && (
          <button
            onClick={() => {
              if (leftVersion && rightVersion && comparisonResult) {
                exportComparisonReport(comparisonResult, leftVersion.name, rightVersion.name);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            导出对比报告
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="grid grid-cols-11 gap-4">
          <div className="col-span-5">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              基线版本
            </label>
            <select
              value={leftVersionId || ''}
              onChange={(e) => setLeftVersionId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="">请选择版本...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} - {new Date(v.createdAt).toLocaleString('zh-CN')}
                </option>
              ))}
            </select>
            {leftVersion && (
              <p className="mt-2 text-xs text-neutral-500">{leftVersion.description}</p>
            )}
          </div>
          
          <div className="col-span-1 flex items-center justify-center">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-primary-600" />
            </div>
          </div>
          
          <div className="col-span-5">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              对比版本
            </label>
            <select
              value={rightVersionId || ''}
              onChange={(e) => setRightVersionId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="">请选择版本...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} - {new Date(v.createdAt).toLocaleString('zh-CN')}
                </option>
              ))}
            </select>
            {rightVersion && (
              <p className="mt-2 text-xs text-neutral-500">{rightVersion.description}</p>
            )}
          </div>
        </div>
      </div>
      
      {comparisonResult && leftVersion && rightVersion && (
        <>
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">综合库存健康度</p>
                  <div className="flex items-end gap-2 mt-2">
                    <p className="text-2xl font-bold font-mono text-neutral-900">
                      {comparisonResult.healthScoreChange.rightOverall}
                    </p>
                    <span className={`text-sm font-mono ${getChangeColor(
                      comparisonResult.healthScoreChange.rightOverall - comparisonResult.healthScoreChange.leftOverall
                    )}`}>
                      {comparisonResult.healthScoreChange.rightOverall - comparisonResult.healthScoreChange.leftOverall >= 0 ? '+' : ''}
                      {comparisonResult.healthScoreChange.rightOverall - comparisonResult.healthScoreChange.leftOverall}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">总补货量变化</p>
                  <div className="flex items-end gap-2 mt-2">
                    <p className="text-2xl font-bold font-mono text-neutral-900">
                      {comparisonResult.totalOrderQuantityChange.right}
                    </p>
                    <span className={`text-sm font-mono ${getChangeColor(
                      comparisonResult.totalOrderQuantityChange.change
                    )}`}>
                      {comparisonResult.totalOrderQuantityChange.change >= 0 ? '+' : ''}
                      {comparisonResult.totalOrderQuantityChange.change}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-info-50 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-info-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">总补货金额变化</p>
                  <div className="flex items-end gap-2 mt-2">
                    <p className="text-lg font-bold font-mono text-neutral-900">
                      ¥{comparisonResult.totalOrderValueChange.right.toLocaleString()}
                    </p>
                    <span className={`text-sm font-mono ${getChangeColor(
                      comparisonResult.totalOrderValueChange.change
                    )}`}>
                      {comparisonResult.totalOrderValueChange.change >= 0 ? '+' : ''}
                      ¥{comparisonResult.totalOrderValueChange.change.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">受促销影响SKU</p>
                  <p className="text-2xl font-bold font-mono text-info-600 mt-2">
                    {comparisonResult.affectedByPromotionCount}
                  </p>
                </div>
                <div className="w-10 h-10 bg-info-50 rounded-lg flex items-center justify-center">
                  <Tag className="w-5 h-5 text-info-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">状态变化SKU</p>
                  <p className="text-2xl font-bold font-mono text-warning-600 mt-2">
                    {comparisonResult.statusChangedCount}
                  </p>
                </div>
                <div className="w-10 h-10 bg-warning-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning-600" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">
                <div className="col-span-2">SKU</div>
                <div className="col-span-2 text-right">安全库存 (基线)</div>
                <div className="col-span-2 text-right">安全库存 (对比)</div>
                <div className="col-span-1 text-center">变化</div>
                <div className="col-span-2 text-right">补货量变化</div>
                <div className="col-span-2 text-center">状态变化</div>
                <div className="col-span-1 text-center">促销影响</div>
              </div>
            </div>
            
            <div className="divide-y divide-neutral-100">
              {comparisonResult.skuComparisons.map((compare) => {
                const sku = skuMap[compare.skuId];
                const leftStatus = getStatusForStock(compare.left.currentStock, compare.left.safetyStock);
                const rightStatus = getStatusForStock(compare.right.currentStock, compare.right.safetyStock);
                const safetyStockChange = compare.right.safetyStock - compare.left.safetyStock;
                const orderQtyChange = compare.right.suggestedOrderQuantity - compare.left.suggestedOrderQuantity;
                
                return (
                  <div
                    key={compare.skuId}
                    className={`px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-neutral-50 transition-colors ${
                      compare.promotionImpact ? 'bg-info-50/50' : ''
                    }`}
                  >
                    <div className="col-span-2">
                      <p className="font-mono text-sm font-medium text-neutral-900">
                        {compare.skuId}
                      </p>
                      <p className="text-xs text-neutral-500">{sku?.name}</p>
                    </div>
                    
                    <div className="col-span-2 text-right">
                      <span className="font-mono text-sm text-neutral-700">
                        {roundTo(compare.left.safetyStock, 0)}
                      </span>
                    </div>
                    
                    <div className="col-span-2 text-right">
                      <span className="font-mono text-sm font-medium text-neutral-900">
                        {roundTo(compare.right.safetyStock, 0)}
                      </span>
                    </div>
                    
                    <div className="col-span-1 flex items-center justify-center gap-1">
                      {getChangeIcon(safetyStockChange)}
                      <span className={`font-mono text-xs ${getChangeColor(safetyStockChange)}`}>
                        {safetyStockChange > 0 ? '+' : ''}
                        {roundTo(safetyStockChange, 0)}
                      </span>
                    </div>
                    
                    <div className="col-span-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getChangeIcon(orderQtyChange)}
                        <span className={`font-mono text-sm ${getChangeColor(orderQtyChange)}`}>
                          {orderQtyChange > 0 ? '+' : ''}
                          {orderQtyChange}
                        </span>
                      </div>
                    </div>
                    
                    <div className="col-span-2 flex items-center justify-center gap-2">
                      <StatusBadge status={leftStatus} />
                      <ArrowUpRight className="w-3 h-3 text-neutral-400" />
                      <StatusBadge status={rightStatus} />
                    </div>
                    
                    <div className="col-span-1 flex justify-center">
                      {compare.promotionImpact ? (
                        <div className="group relative">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-info-100 text-info-700">
                            <Tag className="w-3 h-3 mr-1" />
                            是
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            安全库存 {roundTo(compare.promotionImpact.fieldChanges.find(f => f.field === 'safetyStock')?.oldValue ?? 0, 0)} → {roundTo(compare.promotionImpact.fieldChanges.find(f => f.field === 'safetyStock')?.newValue ?? 0, 0)} (+{compare.promotionImpact.impactPercentage.toFixed(1)}%)
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-display font-semibold text-neutral-800 mb-4">
              版本信息
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="border border-neutral-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-neutral-600" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">{leftVersion.name}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(leftVersion.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-neutral-600 mb-3">{leftVersion.description}</p>
                <div className="space-y-1 text-xs text-neutral-500">
                  <p>• 服务水平: {(leftVersion.parameters.serviceLevel * 100).toFixed(0)}%</p>
                  <p>• 安全库存乘数: {leftVersion.parameters.safetyStockMultiplier}x</p>
                  <p>• 数据哈希: {leftVersion.inputDataHash.slice(0, 16)}...</p>
                </div>
              </div>
              
              <div className="border border-primary-200 bg-primary-50/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-primary-900">{rightVersion.name}</p>
                    <p className="text-xs text-primary-600">
                      {new Date(rightVersion.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-primary-700 mb-3">{rightVersion.description}</p>
                <div className="space-y-1 text-xs text-primary-600">
                  <p>• 服务水平: {(rightVersion.parameters.serviceLevel * 100).toFixed(0)}%</p>
                  <p>• 安全库存乘数: {rightVersion.parameters.safetyStockMultiplier}x</p>
                  <p>• 数据哈希: {rightVersion.inputDataHash.slice(0, 16)}...</p>
                  <p className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success-500" />
                    促销日历: 已导入 ({rightVersion.data.promotionCalendar?.length || 0} 条)
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-info-50 border border-info-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-info-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Tag className="w-6 h-6 text-info-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-info-900 mb-2">促销影响分析</h4>
                <p className="text-sm text-info-700 mb-4">
                  在对比的 {comparisonResult.skuComparisons.length} 个SKU中，共有
                  <span className="font-bold text-info-800"> {comparisonResult.affectedByPromotionCount} </span>
                  个SKU的安全库存计算受到促销日历的影响。
                </p>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 mb-1">平均安全库存提升</p>
                    <p className="text-xl font-bold font-mono text-info-700">
                      +{comparisonResult.affectedByPromotionCount > 0 
                        ? roundTo(
                            comparisonResult.skuComparisons
                              .filter(s => s.promotionImpact)
                              .reduce((sum, s) => sum + (s.promotionImpact?.impactPercentage || 0), 0) / comparisonResult.affectedByPromotionCount,
                            1
                          )
                        : 0}%
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 mb-1">最大安全库存提升</p>
                    <p className="text-xl font-bold font-mono text-info-700">
                      +{comparisonResult.affectedByPromotionCount > 0 
                        ? Math.max(
                            ...comparisonResult.skuComparisons
                              .filter(s => s.promotionImpact)
                              .map(s => s.promotionImpact?.impactPercentage || 0)
                          ).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 mb-1">新增补货金额</p>
                    <p className="text-xl font-bold font-mono text-info-700">
                      ¥{comparisonResult.totalOrderValueChange.change.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
