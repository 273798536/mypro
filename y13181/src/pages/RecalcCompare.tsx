import React, { useState, useMemo } from 'react';
import { RefreshCw, ArrowRight, CheckCircle, AlertCircle, FileText, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDataStore } from '@/stores/useDataStore';
import { StatusBadge } from '@/components/StatusBadge';
import { MarkTag } from '@/components/MarkTag';
import { recalculateData, compareData, generateTrendData, generateRecalcTrendData } from '@/utils/recalc';
import { formatPercent } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { TowerData } from '@/types';

export const RecalcCompare: React.FC = () => {
  const { towerData, recalcDataIds, toggleRecalcData } = useDataStore();
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);
  
  const nameMismatchData = towerData.filter((d) => d.isNameMismatch);
  
  const selectedData = towerData.filter((d) => recalcDataIds.includes(d.id));
  
  const recalculatedData = useMemo(() => {
    return selectedData.map((item) => recalculateData(item));
  }, [selectedData]);
  
  const comparisons = useMemo(() => {
    return selectedData.map((item, idx) => ({
      original: item,
      recalculated: recalculatedData[idx],
      comparison: compareData(item, recalculatedData[idx]),
    }));
  }, [selectedData, recalculatedData]);
  
  const trendData = useMemo(() => {
    if (selectedData.length === 0) return { original: [], recalculated: [] };
    
    const baseValue = selectedData[0].dropletValue;
    const originalTrend = generateTrendData(baseValue, 7);
    const recalculatedTrend = generateRecalcTrendData(baseValue, 7);
    
    return {
      original: originalTrend,
      recalculated: recalculatedTrend,
    };
  }, [selectedData, recalculatedData]);
  
  const handleRecalc = () => {
    if (selectedData.length === 0) return;
    
    setIsCalculating(true);
    setHasCalculated(false);
    
    setTimeout(() => {
      setIsCalculating(false);
      setHasCalculated(true);
    }, 1200);
  };
  
  const allConsistent = comparisons.every((c) => !c.comparison.hasValueDiff || c.comparison.valueDiff === 0);
  
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white mb-1">复算对比</h1>
        <p className="text-sm text-gray-400">对名称不一致材料重新计算，验证图表与明细口径一致性</p>
      </div>
      
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-glow" />
          选择需要复算的材料
          <span className="text-xs text-gray-500 font-normal">（仅名称不一致数据）</span>
        </h3>
        
        {nameMismatchData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            暂无可复算的名称不一致数据
          </div>
        ) : (
          <div className="space-y-2">
            {nameMismatchData.map((item) => {
              const isSelected = recalcDataIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleRecalcData(item.id)}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all',
                    isSelected
                      ? 'bg-teal-glow/10 border-teal-glow/30'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center transition-all',
                      isSelected
                        ? 'bg-teal-glow border-teal-glow'
                        : 'border-gray-600'
                    )}>
                      {isSelected && <CheckCircle className="w-4 h-4 text-deep-blue-900" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium">{item.id}</span>
                        <span className="text-xs text-gray-500">{item.towerId}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-amber-warn line-through">{item.materialName}</span>
                        <ArrowRight className="w-3 h-3 text-gray-600" />
                        <span className="text-xs text-teal-glow">{item.standardMaterialName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-white">{item.dropletValue.toFixed(1)}</div>
                    <MarkTag type="name_mismatch" size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <button
          onClick={handleRecalc}
          disabled={selectedData.length === 0 || isCalculating}
          className={cn(
            'mt-4 w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all',
            selectedData.length > 0 && !isCalculating
              ? 'bg-teal-glow text-deep-blue-900 hover:bg-teal-glow-400'
              : 'bg-white/10 text-gray-500 cursor-not-allowed'
          )}
        >
          {isCalculating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              复算中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              开始复算对比（{selectedData.length} 条）
            </>
          )}
        </button>
      </div>
      
      {hasCalculated && selectedData.length > 0 && (
        <>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-glow" />
                趋势图对比
              </h3>
              {allConsistent ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-teal-glow">
                  <CheckCircle className="w-3.5 h-3.5" />
                  口径一致
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-warn">
                  <AlertCircle className="w-3.5 h-3.5" />
                  存在差异
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="text-xs text-gray-500 mb-2">复算前（{selectedData[0]?.materialName}）</div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData.original}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0c2339',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#e2e8f0',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#FFB020"
                        strokeWidth={2}
                        dot={{ fill: '#FFB020', r: 3 }}
                        name="水滴值"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="text-xs text-gray-500 mb-2">复算后（{recalculatedData[0]?.materialName}）</div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData.recalculated}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0c2339',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#e2e8f0',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#00D4AA"
                        strokeWidth={2}
                        dot={{ fill: '#00D4AA', r: 3 }}
                        name="水滴值"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-glow" />
              明细对比
            </h3>
            
            <div className="space-y-3">
              {comparisons.map(({ original, recalculated, comparison }) => (
                <div
                  key={original.id}
                  className={cn(
                    'p-4 rounded-lg border transition-all',
                    comparison.hasValueDiff
                      ? 'bg-amber-warn/5 border-amber-warn/30'
                      : 'bg-white/[0.02] border-white/5'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{original.id}</span>
                      <span className="text-xs text-gray-500">{original.towerId}</span>
                    </div>
                    {comparison.hasValueDiff ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-warn/20 text-amber-warn">
                        数值有差异
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-teal-glow/20 text-teal-glow">
                        口径一致
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-deep-blue-700/30">
                      <div className="text-[10px] text-gray-500 mb-1.5">复算前</div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-amber-warn/70 line-through">
                          {original.materialName}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-mono font-bold text-white">
                          {original.dropletValue.toFixed(1)}
                        </span>
                        <span className={cn(
                          'text-xs font-mono',
                          original.deviation > 20 ? 'text-orange-alert' : 'text-amber-warn'
                        )}>
                          {formatPercent(original.deviation)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <StatusBadge status={original.status} size="sm" />
                      </div>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-teal-glow/5 border border-teal-glow/20">
                      <div className="text-[10px] text-gray-500 mb-1.5">复算后</div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-teal-glow">
                          {recalculated.materialName}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-mono font-bold text-white">
                          {recalculated.dropletValue.toFixed(1)}
                        </span>
                        <span className={cn(
                          'text-xs font-mono',
                          recalculated.deviation > 20 ? 'text-orange-alert' :
                          recalculated.deviation > 0 ? 'text-amber-warn' : 'text-teal-glow'
                        )}>
                          {formatPercent(recalculated.deviation)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <StatusBadge status={recalculated.status} size="sm" />
                      </div>
                    </div>
                  </div>
                  
                  {comparison.hasValueDiff && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="text-xs text-gray-400">
                        差异说明：数值变化 <span className="text-amber-warn font-mono">
                          {comparison.valueDiff > 0 ? '+' : ''}{comparison.valueDiff.toFixed(1)}
                        </span>，
                        状态变化 <span className="text-amber-warn">{comparison.statusDiff}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      {!hasCalculated && selectedData.length > 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <RefreshCw className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">点击上方按钮开始复算对比</p>
        </div>
      )}
    </div>
  );
};
