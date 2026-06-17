import { useAppStore } from '@/store/useAppStore';
import { ArrowRight, TrendingUp, TrendingDown, Minus, AlertCircle, Info } from 'lucide-react';

interface ModelComparisonProps {
  sampleId: string;
}

export const ModelComparison = ({ sampleId }: ModelComparisonProps) => {
  const getModelComparison = useAppStore(state => state.getModelComparison);
  const comparison = getModelComparison(sampleId);

  if (!comparison) {
    return (
      <div className="card p-6">
        <h3 className="font-serif text-lg font-semibold text-navy-800 mb-4">
          模型对比
        </h3>
        <div className="text-center py-8">
          <Info className="w-8 h-8 text-navy-300 mx-auto mb-2" />
          <p className="text-navy-500 text-sm">该样本暂无多版本模型评分记录</p>
          <p className="text-navy-400 text-xs mt-1">仅当样本存在不同模型或不同阈值版本的评分时，才会显示对比</p>
        </div>
      </div>
    );
  }

  const isReversal = comparison.oldModel.result !== comparison.newModel.result;

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-moss-600 bg-moss-50 border-moss-200';
      case 'negative': return 'text-rust-600 bg-rust-50 border-rust-200';
      default: return 'text-navy-600 bg-navy-50 border-navy-200';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return <TrendingUp className="w-3.5 h-3.5" />;
      case 'negative': return <TrendingDown className="w-3.5 h-3.5" />;
      default: return <Minus className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-200 bg-gradient-to-r from-navy-50 to-transparent">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-navy-800">
            模型版本对比
          </h3>
          {isReversal && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              存在改判
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className={`p-4 border-2 ${comparison.oldModel.result === 'pass' ? 'border-moss-300 bg-moss-50/50' : 'border-rust-300 bg-rust-50/50'}`}>
            <div className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">
              旧模型 · {comparison.oldModel.version}
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-4xl font-bold font-mono ${
                comparison.oldModel.result === 'pass' ? 'text-moss-600' : 'text-rust-600'
              }`}>
                {comparison.oldModel.score}
              </span>
              <span className="text-sm text-navy-500">分</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-navy-500">
                阈值：<span className="font-mono font-semibold text-navy-700">{comparison.oldModel.threshold}分</span>
              </span>
              <span className={`font-medium ${
                comparison.oldModel.result === 'pass' ? 'text-moss-600' : 'text-rust-600'
              }`}>
                {comparison.oldModel.result === 'pass' ? '通过' : '未通过'}
              </span>
            </div>
            <div className="divider-dashed" />
            <div className="text-xs text-navy-500 mb-2">Top 5 特征权重</div>
            <div className="space-y-1.5">
              {comparison.oldModel.topFeatures.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-navy-600 truncate flex-1">{f.name}</span>
                  <span className="font-mono text-navy-700 ml-2">{(f.weight * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-4 border-2 ${comparison.newModel.result === 'pass' ? 'border-moss-300 bg-moss-50/50' : 'border-rust-300 bg-rust-50/50'}`}>
            <div className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">
              新模型 · {comparison.newModel.version}
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-4xl font-bold font-mono ${
                comparison.newModel.result === 'pass' ? 'text-moss-600' : 'text-rust-600'
              }`}>
                {comparison.newModel.score}
              </span>
              <span className="text-sm text-navy-500">分</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-navy-500">
                阈值：<span className="font-mono font-semibold text-navy-700">{comparison.newModel.threshold}分</span>
              </span>
              <span className={`font-medium ${
                comparison.newModel.result === 'pass' ? 'text-moss-600' : 'text-rust-600'
              }`}>
                {comparison.newModel.result === 'pass' ? '通过' : '未通过'}
              </span>
            </div>
            <div className="divider-dashed" />
            <div className="text-xs text-navy-500 mb-2">Top 5 特征权重</div>
            <div className="space-y-1.5">
              {comparison.newModel.topFeatures.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-navy-600 truncate flex-1">{f.name}</span>
                  <span className="font-mono text-navy-700 ml-2">{(f.weight * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 py-4 bg-navy-50 border-y border-navy-100 mb-6">
          <div className="text-center">
            <div className="text-xs text-navy-500 mb-1">评分变化</div>
            <div className={`text-2xl font-bold font-mono ${
              comparison.scoreDiff >= 0 ? 'text-moss-600' : 'text-rust-600'
            }`}>
              {comparison.scoreDiff >= 0 ? '+' : ''}{comparison.scoreDiff}
            </div>
          </div>
          <div className="flex items-center gap-2 text-navy-400">
            <div className="w-16 h-px bg-navy-300" />
            <ArrowRight className="w-5 h-5 text-amber-500" />
            <div className="w-16 h-px bg-navy-300" />
          </div>
          <div className="text-center">
            <div className="text-xs text-navy-500 mb-1">阈值变化</div>
            <div className={`text-2xl font-bold font-mono ${
              comparison.newModel.threshold - comparison.oldModel.threshold >= 0 ? 'text-rust-600' : 'text-moss-600'
            }`}>
              {comparison.newModel.threshold - comparison.oldModel.threshold >= 0 ? '+' : ''}
              {comparison.newModel.threshold - comparison.oldModel.threshold}
            </div>
          </div>
        </div>

        {comparison.changedFeatures.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-navy-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500" />
              特征权重变化
            </h4>
            <div className="space-y-2">
              {comparison.changedFeatures.map((cf, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-navy-50 border border-navy-100">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border ${getImpactColor(cf.impact)}`}>
                      {getImpactIcon(cf.impact)}
                      {cf.impact === 'positive' ? '正面' : cf.impact === 'negative' ? '负面' : '中性'}
                    </span>
                    <span className="font-medium text-navy-700">{cf.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-mono">
                    <span className="text-navy-500">{(cf.oldWeight * 100).toFixed(0)}%</span>
                    <ArrowRight className="w-3 h-3 text-navy-400" />
                    <span className={`font-semibold ${
                      cf.newWeight > cf.oldWeight ? 'text-moss-600' : 'text-rust-600'
                    }`}>
                      {(cf.newWeight * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`p-4 border-l-4 ${isReversal ? 'border-amber-500 bg-amber-50' : 'border-navy-300 bg-navy-50'}`}>
          <div className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">
            改判解释
          </div>
          <p className="text-navy-700 text-sm leading-relaxed">
            {comparison.explanation}
          </p>
        </div>
      </div>
    </div>
  );
};
