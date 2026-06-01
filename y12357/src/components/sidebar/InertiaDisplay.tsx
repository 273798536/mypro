import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Flywheel, InertiaResult } from '../../types';
import { useSelectedResult, useFlywheelErrors } from '../../store/useAppStore';
import { getDeviationColor } from '../../utils/formatters';
import { formatDeviation, formatInertia } from '../../utils/unitConverter';

interface InertiaDisplayProps {
  flywheel: Flywheel | null;
}

export function InertiaDisplay({ flywheel }: InertiaDisplayProps) {
  const result = useSelectedResult();
  const { samplingGaps, unitErrors, frictionOmissions } = useFlywheelErrors(flywheel?.id);
  
  if (!flywheel || !result) {
    return (
      <div className="industrial-card p-4">
        <div className="section-title flex items-center gap-2">
          <Activity size={14} />
          惯量计算结果
        </div>
        <p className="text-industrial-500 text-sm">等待数据加载...</p>
      </div>
    );
  }
  
  const hasErrors = unitErrors.length > 0 || frictionOmissions.length > 0 || samplingGaps.length > 0;
  const deviationColor = getDeviationColor(result.deviation);
  
  return (
    <div className="industrial-card p-4">
      <div className="section-title flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} />
          惯量计算结果
        </div>
        {hasErrors ? (
          <AlertTriangle size={14} className="text-alert-orange" />
        ) : (
          <CheckCircle size={14} className="text-alert-green" />
        )}
      </div>
      
      <div className="space-y-3">
        <div className="industrial-card p-3 bg-industrial-900/50">
          <div className="data-label">理论惯量 (I = 0.5·m·r²)</div>
          <div className="data-value text-lg font-mono">
            {formatInertia(result.theoreticalInertia)} <span className="text-industrial-500 text-sm">kg·m²</span>
          </div>
        </div>
        
        <div className="industrial-card p-3 bg-industrial-900/50">
          <div className="data-label">实测惯量 (I = τ/α)</div>
          <div className="data-value text-lg font-mono">
            {formatInertia(result.measuredInertia)} <span className="text-industrial-500 text-sm">kg·m²</span>
          </div>
        </div>
        
        <div className="industrial-card p-3 bg-industrial-900/50">
          <div className="data-label flex items-center gap-1">
            摩擦修正值
            {frictionOmissions.length > 0 && (
              <span className="text-alert-red text-xs">⚠ 未配置</span>
            )}
          </div>
          <div className={`data-value text-lg font-mono ${frictionOmissions.length > 0 ? 'text-alert-red' : 'text-tech-400'}`}>
            {formatInertia(result.frictionCorrection)} <span className="text-industrial-500 text-sm">kg·m²</span>
          </div>
        </div>
        
        <div className="industrial-card p-3 border-tech-500/50 bg-tech-500/10">
          <div className="data-label text-tech-400">最终惯量</div>
          <div className="data-value text-xl font-mono font-semibold text-tech-400">
            {formatInertia(result.finalInertia)} <span className="text-industrial-500 text-sm">kg·m²</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 industrial-card">
          <div>
            <div className="data-label">与理论值偏差</div>
            <div className={`data-value font-mono text-lg`} style={{ color: deviationColor }}>
              {formatDeviation(result.deviation)}
            </div>
          </div>
          <div className="text-right">
            <div className="data-label">时间范围</div>
            <div className="data-value font-mono">
              {result.timeRange[0].toFixed(1)}s - {result.timeRange[1].toFixed(1)}s
            </div>
          </div>
        </div>
        
        {(samplingGaps.length > 0 || unitErrors.length > 0) && (
          <div className="warning-alert text-xs">
            <div className="font-semibold mb-1">计算涉及以下问题：</div>
            {samplingGaps.length > 0 && (
              <div>• 采样缺口 {samplingGaps.length} 处，已自动插值</div>
            )}
            {unitErrors.length > 0 && (
              <div>• 单位错误 {unitErrors.length} 处，可能影响计算精度</div>
            )}
            {frictionOmissions.length > 0 && (
              <div>• 摩擦系数未配置 {frictionOmissions.length} 处</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
