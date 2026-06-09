import { Settings, GitCompare, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { calculateParamDiff } from '../../utils/helpers';

export function ParameterLinkPanel() {
  const { parameters, oldParameters, showParameterDiff, toggleParameterDiff } = useAppStore();

  const diffs = calculateParamDiff(oldParameters, parameters);

  const paramLabels: Record<string, string> = {
    sigmaThreshold: 'Sigma阈值',
    minConfidence: '最小置信度',
    thicknessTolerance: '厚度容差(m)',
    outlierAction: '离群点处理方式',
  };

  const actionLabels: Record<string, string> = {
    'review': '人工复核',
    'auto-remove': '自动剔除',
    'flag': '仅标记',
  };

  const formatValue = (key: string, value: any) => {
    if (key === 'outlierAction') return actionLabels[value] || value;
    if (typeof value === 'number') {
      if (key === 'thicknessTolerance') return value.toFixed(2);
      return value.toFixed(1);
    }
    return String(value);
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={toggleParameterDiff}>
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-ice-blue" />
          <h3 className="font-display text-lg text-gradient">参数联动</h3>
          {diffs.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-modified/20 text-modified border border-modified/30">
              {diffs.length}项变更
            </span>
          )}
        </div>
        {showParameterDiff ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      {showParameterDiff && (
        <div className="space-y-3 animate-slide-in">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <GitCompare size={14} />
            <span>对比 v{oldParameters.version} → v{parameters.version}</span>
            <span className="ml-auto">
              {oldParameters.updatedBy.name} → {parameters.updatedBy.name}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {(['sigmaThreshold', 'minConfidence', 'thicknessTolerance', 'outlierAction'] as const).map(key => {
              const diff = diffs.find(d => d.param === key);
              const hasChange = !!diff;

              return (
                <div
                  key={key}
                  className={`p-3 rounded-lg transition-all ${
                    hasChange
                      ? 'bg-modified/10 border border-modified/30'
                      : 'bg-bg-tertiary/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary">
                      {paramLabels[key]}
                    </span>
                    {hasChange && (
                      <span className="text-xs px-2 py-0.5 rounded bg-modified/30 text-modified animate-value-change">
                        已修改
                      </span>
                    )}
                  </div>

                  {hasChange ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-xs text-text-muted mb-1">修改前</div>
                        <div className="text-sm text-danger line-through">
                          {formatValue(key, diff!.beforeValue)}
                        </div>
                      </div>
                      <div className="text-ice-blue">→</div>
                      <div className="flex-1">
                        <div className="text-xs text-text-muted mb-1">修改后</div>
                        <div className="text-sm text-success font-medium">
                          {formatValue(key, diff!.afterValue)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-text-secondary">
                      {formatValue(key, parameters[key])}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-ice-blue/20">
            <div className="text-xs text-text-muted space-y-1">
              <p>参数变更影响范围：所有点云切片复核结果</p>
              <p>时间回放可查看修改前的判断结果</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
