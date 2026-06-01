import { Clock, Activity, Zap, Target, ArrowUp, ArrowDown } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatNumber, formatTimeWithUnit, getUnitShortLabel } from '../utils/unitConversion';
import { compareFitResults } from '../utils/reportGenerator';
import { useMemo } from 'react';

export function FitResultSection() {
  const { fitResults, activeResultId, compareMode } = useAppStore();

  const activeResult = fitResults.find(r => r.id === activeResultId);
  const previousResult = fitResults.find((r, i) => i === 1);

  const diffs = useMemo(() => {
    if (activeResult && previousResult && compareMode) {
      return compareFitResults(previousResult, activeResult);
    }
    return null;
  }, [activeResult, previousResult, compareMode]);

  const getR2Color = (r2: number) => {
    if (r2 >= 0.99) return 'text-lab-success';
    if (r2 >= 0.95) return 'text-lab-warning';
    return 'text-lab-danger';
  };

  const getDiffDisplay = (field: string) => {
    if (!diffs) return null;
    const diff = diffs.find(d => d.field === field);
    if (!diff) return null;
    
    const isPositive = (diff.percentage ?? 0) > 0;
    const colorClass = isPositive ? 'diff-positive' : 'diff-negative';
    const Icon = isPositive ? ArrowUp : ArrowDown;
    
    return (
      <span className={`text-xs flex items-center gap-1 ${colorClass}`}>
        <Icon size={12} />
        {diff.percentage !== undefined ? `${formatNumber(Math.abs(diff.percentage), 2)}%` : ''}
      </span>
    );
  };

  if (!activeResult) {
    return (
      <div className="lab-card">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <span className="text-2xl">📊</span>
          拟合结果
        </h2>
        <div className="text-center py-12 text-lab-muted">
          <div className="text-4xl mb-3">🔬</div>
          <p>暂无拟合结果</p>
          <p className="text-sm mt-1">输入数据后点击"运行拟合"按钮</p>
        </div>
      </div>
      );
  }

  const displayResult = compareMode && previousResult ? previousResult : activeResult;

  return (
    <div className="lab-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">📊</span>
          拟合结果
        </h2>
        <span className="text-xs text-lab-muted">
          {new Date(displayResult.timestamp).toLocaleString('zh-CN')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-lab-bg rounded-lg p-4 border border-lab-border">
          <div className="flex items-center gap-2 text-lab-muted text-sm mb-2">
            <Clock size={16} />
            半衰期
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-lab-info">
              {formatNumber(displayResult.halfLife, 4)}
            </span>
            <span className="text-lab-muted text-sm">
              {getUnitShortLabel(displayResult.halfLifeUnit)}
            </span>
          </div>
          {compareMode && getDiffDisplay('半衰期')}
          {displayResult.material.halfLifeKnown && (
            <div className="text-xs text-lab-muted mt-1">
              已知值: {formatTimeWithUnit(displayResult.material.halfLifeKnown, displayResult.material.unit)}
              ({(Math.abs(displayResult.halfLife - displayResult.material.halfLifeKnown) / displayResult.material.halfLifeKnown * 100).toFixed(2)}%)
            </div>
          )}
        </div>

        <div className="bg-lab-bg rounded-lg p-4 border border-lab-border">
          <div className="flex items-center gap-2 text-lab-muted text-sm mb-2">
            <Zap size={16} />
            衰变常数
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-lab-accent">
              {formatNumber(displayResult.decayConstant, 6)}
            </span>
            <span className="text-lab-muted text-sm">s⁻¹</span>
          </div>
          {compareMode && getDiffDisplay('衰变常数')}
        </div>

        <div className="bg-lab-bg rounded-lg p-4 border border-lab-border">
          <div className="flex items-center gap-2 text-lab-muted text-sm mb-2">
            <Activity size={16} />
            初始活度
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-lab-success">
              {formatNumber(displayResult.initialActivity, 4)}
            </span>
            <span className="text-lab-muted text-sm">计数</span>
          </div>
          {compareMode && getDiffDisplay('初始活度')}
        </div>

        <div className="bg-lab-bg rounded-lg p-4 border border-lab-border">
          <div className="flex items-center gap-2 text-lab-muted text-sm mb-2">
            <Target size={16} />
            拟合优度 R²
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${getR2Color(displayResult.rSquared)}`}>
              {formatNumber(displayResult.rSquared, 6)}
            </span>
          </div>
          {compareMode && getDiffDisplay('拟合优度 R²')}
        </div>
      </div>

      <div className="mt-4 p-3 bg-lab-bg rounded-lg border border-lab-border">
        <div className="text-lab-muted text-sm mb-2">拟合公式</div>
        <div className="font-mono text-lg">
          N(t) = <span className="text-lab-success">{formatNumber(displayResult.initialActivity, 4)}</span>
          {' × e^(-'}
          <span className="text-lab-accent">{formatNumber(displayResult.decayConstant, 6)}</span>
          {' × t)'}
        </div>
      </div>

      {compareMode && diffs && diffs.length > 0 && (
        <div className="mt-4">
          <div className="text-lab-muted text-sm mb-2">与上一次拟合差异</div>
          <div className="space-y-1">
            {diffs.map((diff, index) => (
              <div key={index} className="flex justify-between text-sm font-mono">
                <span className="text-lab-muted">{diff.field}</span>
                <span className={diff.percentage !== undefined && diff.percentage > 0 ? 'text-lab-success' : 'text-lab-danger'}>
                  {diff.percentage !== undefined ? `${diff.percentage > 0 ? '+' : ''}${formatNumber(diff.percentage, 2)}%` : String(diff.difference)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
