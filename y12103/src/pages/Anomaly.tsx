import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Minus,
  Search,
  Filter,
  ChevronRight,
  Package,
  FileText,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/common/StatusBadge';
import { generateAnomalySummary } from '@/utils/anomaly';
import { exportFullReport } from '@/utils/export';
import { roundTo } from '@/utils/statistics';
import type { AnomalyRecord, AnomalySeverity, AnomalyType } from '@/types';

type SeverityFilter = 'all' | AnomalySeverity;
type TypeFilter = 'all' | AnomalyType;

export default function Anomaly() {
  const navigate = useNavigate();
  const {
    anomalyRecords,
    replenishmentSuggestions,
    forecastResults,
    skus,
    skuMap,
    getHealthScore,
    promotionCalendar,
  } = useAppStore();
  
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  
  const anomalySummary = useMemo(() => generateAnomalySummary(anomalyRecords), [anomalyRecords]);
  const healthScore = getHealthScore();
  
  const filteredRecords = useMemo(() => {
    let result = [...anomalyRecords];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((a) => {
        const sku = skuMap[a.skuId];
        return (
          a.skuId.toLowerCase().includes(term) ||
          sku?.name.toLowerCase().includes(term) ||
          a.description.toLowerCase().includes(term)
        );
      });
    }
    
    if (severityFilter !== 'all') {
      result = result.filter((a) => a.severity === severityFilter);
    }
    
    if (typeFilter !== 'all') {
      result = result.filter((a) => a.type === typeFilter);
    }
    
    result.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    return result;
  }, [anomalyRecords, searchTerm, severityFilter, typeFilter, skuMap]);
  
  const selectedAnomaly = useMemo(() => {
    if (!selectedAnomalyId) return null;
    return anomalyRecords.find((a) => a.id === selectedAnomalyId);
  }, [selectedAnomalyId, anomalyRecords]);
  
  const selectedSuggestion = useMemo(() => {
    if (!selectedAnomaly) return null;
    return replenishmentSuggestions.find((s) => s.skuId === selectedAnomaly.skuId);
  }, [selectedAnomaly, replenishmentSuggestions]);
  
  const selectedSku = useMemo(() => {
    if (!selectedAnomaly) return null;
    return skuMap[selectedAnomaly.skuId];
  }, [selectedAnomaly, skuMap]);
  
  const getTypeIcon = (type: AnomalyType) => {
    switch (type) {
      case 'demand_surge':
        return <TrendingUp className="w-5 h-5 text-orange-500" />;
      case 'delivery_delay':
        return <Clock className="w-5 h-5 text-warning-500" />;
      case 'negative_stock':
        return <Minus className="w-5 h-5 text-danger-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-warning-500" />;
    }
  };
  
  const getTypeLabel = (type: AnomalyType) => {
    switch (type) {
      case 'demand_surge':
        return '需求突增';
      case 'delivery_delay':
        return '到货延迟';
      case 'negative_stock':
        return '负库存';
      default:
        return '其他异常';
    }
  };
  
  const getSeverityColor = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-danger-50 border-danger-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-warning-50 border-warning-200';
      case 'low':
        return 'bg-success-50 border-success-200';
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
  
  if (anomalyRecords.length === 0) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <TrendingUp className="w-16 h-16 mx-auto text-success-300 mb-4" />
          <h3 className="text-xl font-display font-semibold text-neutral-700 mb-2">
            未检测到异常
          </h3>
          <p className="text-neutral-500 mb-6">
            所有SKU库存状态良好，无需求突增、到货延迟或负库存情况
          </p>
          <button
            onClick={() => navigate('/replenishment')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            查看补货建议
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
          <h1 className="text-2xl font-display font-bold text-neutral-900">异常分析</h1>
          <p className="text-neutral-500 mt-1">
            实时监控需求突增、到货延迟、负库存等异常情况
          </p>
        </div>
        
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
        >
          <FileText className="w-4 h-4" />
          导出异常报告
        </button>
      </div>
      
      <div className="grid grid-cols-5 gap-4">
        <div className={`rounded-xl shadow-card p-5 ${getSeverityColor('critical')}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-danger-500 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-danger-700">
                {anomalySummary.bySeverity.critical}
              </p>
              <p className="text-xs text-danger-600">严重异常</p>
            </div>
          </div>
        </div>
        
        <div className={`rounded-xl shadow-card p-5 ${getSeverityColor('high')}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-orange-700">
                {anomalySummary.bySeverity.high}
              </p>
              <p className="text-xs text-orange-600">高风险</p>
            </div>
          </div>
        </div>
        
        <div className={`rounded-xl shadow-card p-5 ${getSeverityColor('medium')}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-warning-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-warning-700">
                {anomalySummary.bySeverity.medium}
              </p>
              <p className="text-xs text-warning-600">中风险</p>
            </div>
          </div>
        </div>
        
        <div className={`rounded-xl shadow-card p-5 ${getSeverityColor('low')}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-success-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-success-700">
                {anomalySummary.bySeverity.low}
              </p>
              <p className="text-xs text-success-600">低风险</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-neutral-900">
                {anomalySummary.total}
              </p>
              <p className="text-xs text-neutral-500">异常总数</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="搜索SKU编号、名称或异常描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="all">全部严重程度</option>
              <option value="critical">严重</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="all">全部异常类型</option>
              <option value="demand_surge">需求突增</option>
              <option value="delivery_delay">到货延迟</option>
              <option value="negative_stock">负库存</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filteredRecords.map((anomaly) => {
            const sku = skuMap[anomaly.skuId];
            const suggestion = replenishmentSuggestions.find(s => s.skuId === anomaly.skuId);
            
            return (
              <div
                key={anomaly.id}
                onClick={() => setSelectedAnomalyId(anomaly.id)}
                className={`bg-white rounded-xl shadow-card p-5 cursor-pointer transition-all hover:shadow-card-hover ${
                  selectedAnomalyId === anomaly.id ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    anomaly.severity === 'critical' ? 'bg-danger-100' :
                    anomaly.severity === 'high' ? 'bg-orange-100' :
                    anomaly.severity === 'medium' ? 'bg-warning-100' : 'bg-success-100'
                  }`}>
                    {getTypeIcon(anomaly.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-medium text-neutral-900">
                        {anomaly.skuId}
                      </span>
                      <span className="text-xs text-neutral-500">{sku?.name}</span>
                      <span className="text-xs text-neutral-400">|</span>
                      <span className="text-xs text-neutral-500">{getTypeLabel(anomaly.type)}</span>
                      {suggestion?.affectedByPromotion && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-info-100 text-info-700">
                          受促销影响
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-neutral-700 mb-2">
                      {anomaly.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>检测时间: {anomaly.detectedAt}</span>
                      <span>影响评估: {anomaly.impactAssessment}</span>
                    </div>
                    
                    {anomaly.details && (
                      <div className="mt-2 p-2 bg-neutral-50 rounded text-xs text-neutral-600 font-mono">
                        {Object.entries(anomaly.details).map(([key, value]) => (
                          <span key={key} className="inline-block mr-4">
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={anomaly.severity} />
                    {suggestion && (
                      <div className="text-right">
                        <p className="text-xs text-neutral-500">当前库存</p>
                        <p className={`font-mono font-bold ${
                          suggestion.currentStock < 0 ? 'text-danger-600' : 'text-neutral-700'
                        }`}>
                          {suggestion.currentStock}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredRecords.length === 0 && (
            <div className="bg-white rounded-xl shadow-card p-12 text-center">
              <Package className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-500">没有匹配的异常记录</p>
            </div>
          )}
        </div>
        
        <div>
          {selectedAnomaly && selectedSku ? (
            <div className="bg-white rounded-xl shadow-card overflow-hidden sticky top-8">
              <div className="p-4 border-b border-neutral-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    selectedAnomaly.severity === 'critical' ? 'bg-danger-100' :
                    selectedAnomaly.severity === 'high' ? 'bg-orange-100' :
                    selectedAnomaly.severity === 'medium' ? 'bg-warning-100' : 'bg-success-100'
                  }`}>
                    {getTypeIcon(selectedAnomaly.type)}
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">{getTypeLabel(selectedAnomaly.type)}</p>
                    <p className="text-sm text-neutral-500">{selectedAnomaly.skuId}</p>
                  </div>
                  <StatusBadge status={selectedAnomaly.severity} className="ml-auto" />
                </div>
                
                <p className="text-sm text-neutral-500">{selectedSku.name}</p>
                <p className="text-xs text-neutral-400">{selectedSku.category}</p>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-neutral-700 mb-1">异常描述</p>
                  <p className="text-sm text-neutral-800">{selectedAnomaly.description}</p>
                </div>
                
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-neutral-700 mb-1">影响评估</p>
                  <p className="text-sm text-neutral-800">{selectedAnomaly.impactAssessment}</p>
                </div>
                
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-warning-600" />
                    <p className="text-xs font-medium text-warning-800">处理建议</p>
                  </div>
                  <p className="text-sm text-warning-700">{selectedAnomaly.recommendation}</p>
                </div>
                
                {selectedAnomaly.details && (
                  <div className="pt-2 border-t border-neutral-100">
                    <p className="text-xs font-medium text-neutral-700 mb-2">详细数据</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedAnomaly.details).map(([key, value]) => (
                        <div key={key} className="bg-neutral-50 rounded p-2">
                          <p className="text-xs text-neutral-500">{key}</p>
                          <p className="font-mono text-sm font-medium text-neutral-700">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedSuggestion && (
                  <div className="pt-2 border-t border-neutral-100">
                    <p className="text-xs font-medium text-neutral-700 mb-2">关联补货建议</p>
                    <div className="bg-primary-50 rounded-lg p-3">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-neutral-600">当前库存</span>
                        <span className={`font-mono font-bold ${
                          selectedSuggestion.currentStock < 0 ? 'text-danger-600' : 'text-neutral-700'
                        }`}>
                          {selectedSuggestion.currentStock}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-neutral-600">安全库存</span>
                        <span className="font-mono font-bold text-neutral-700">
                          {roundTo(selectedSuggestion.safetyStock, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-neutral-600">缺货概率</span>
                        <span className="font-mono font-bold text-danger-600">
                          {(selectedSuggestion.stockoutProbability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">建议补货</span>
                        <span className="font-mono font-bold text-primary-600">
                          {selectedSuggestion.suggestedOrderQuantity}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => navigate('/replenishment')}
                      className="w-full mt-3 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      查看完整补货建议
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-card p-8 text-center sticky top-8">
              <FileText className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-500">点击左侧异常卡片查看详情</p>
              <p className="text-xs text-neutral-400 mt-1">
                包含影响评估、处理建议、关联补货建议
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
