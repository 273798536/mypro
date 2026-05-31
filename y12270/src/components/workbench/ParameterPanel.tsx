import { useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, Filter, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { INDUSTRY_COLORS } from '../../mock/bondData';

const ALL_INDUSTRIES = Object.keys(INDUSTRY_COLORS);

export function ParameterPanel() {
  const { analysisParams, updateParams, runAnalysis, qualityIssues, isAnalyzing } = useAppStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    duration: true,
    yield: true,
    industry: true,
    advanced: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleIndustryToggle = (industry: string) => {
    const currentIndustries = analysisParams.industries;
    let newIndustries: string[];
    
    if (currentIndustries.includes(industry)) {
      newIndustries = currentIndustries.filter(i => i !== industry);
    } else {
      newIndustries = [...currentIndustries, industry];
    }
    
    updateParams({ industries: newIndustries });
  };

  const handleSelectAllIndustries = () => {
    if (analysisParams.industries.length === ALL_INDUSTRIES.length) {
      updateParams({ industries: [] });
    } else {
      updateParams({ industries: [...ALL_INDUSTRIES] });
    }
  };

  const unresolvedIssues = qualityIssues.filter(i => !i.resolved);
  const hasHighSeverity = unresolvedIssues.some(i => i.severity === 'high');

  return (
    <div className="w-80 bg-slate-900/95 border-r border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <SlidersHorizontal size={18} />
            分析参数
          </h2>
          {unresolvedIssues.length > 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              hasHighSeverity ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              <AlertTriangle size={12} />
              {unresolvedIssues.length}个问题
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-slate-700/50">
          <button
            onClick={() => toggleSection('duration')}
            className="w-full flex items-center justify-between text-slate-200 hover:text-white transition-colors"
          >
            <span className="font-medium">久期范围</span>
            {expandedSections.duration ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.duration && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">最小值</span>
                  <span className="text-slate-200 font-mono">{analysisParams.durationRange[0].toFixed(1)}年</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={analysisParams.durationRange[0]}
                  onChange={(e) => updateParams({
                    durationRange: [parseFloat(e.target.value), analysisParams.durationRange[1]]
                  })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">最大值</span>
                  <span className="text-slate-200 font-mono">{analysisParams.durationRange[1].toFixed(1)}年</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={analysisParams.durationRange[1]}
                  onChange={(e) => updateParams({
                    durationRange: [analysisParams.durationRange[0], parseFloat(e.target.value)]
                  })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-b border-slate-700/50">
          <button
            onClick={() => toggleSection('yield')}
            className="w-full flex items-center justify-between text-slate-200 hover:text-white transition-colors"
          >
            <span className="font-medium">收益率范围</span>
            {expandedSections.yield ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.yield && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">最小值</span>
                  <span className="text-slate-200 font-mono">{analysisParams.yieldRange[0].toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={analysisParams.yieldRange[0]}
                  onChange={(e) => updateParams({
                    yieldRange: [parseFloat(e.target.value), analysisParams.yieldRange[1]]
                  })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">最大值</span>
                  <span className="text-slate-200 font-mono">{analysisParams.yieldRange[1].toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={analysisParams.yieldRange[1]}
                  onChange={(e) => updateParams({
                    yieldRange: [analysisParams.yieldRange[0], parseFloat(e.target.value)]
                  })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-b border-slate-700/50">
          <button
            onClick={() => toggleSection('industry')}
            className="w-full flex items-center justify-between text-slate-200 hover:text-white transition-colors"
          >
            <span className="font-medium flex items-center gap-2">
              <Filter size={14} />
              行业筛选
              <span className="text-xs text-slate-500">
                ({analysisParams.industries.length}/{ALL_INDUSTRIES.length})
              </span>
            </span>
            {expandedSections.industry ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.industry && (
            <div className="mt-4 space-y-2">
              <button
                onClick={handleSelectAllIndustries}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors mb-2"
              >
                {analysisParams.industries.length === ALL_INDUSTRIES.length ? '取消全选' : '全选'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                {ALL_INDUSTRIES.map(industry => (
                  <label
                    key={industry}
                    className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 cursor-pointer transition-colors text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={analysisParams.industries.includes(industry)}
                      onChange={() => handleIndustryToggle(industry)}
                      className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: INDUSTRY_COLORS[industry] }}
                    />
                    <span className="text-slate-300 text-xs truncate">{industry}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <button
            onClick={() => toggleSection('advanced')}
            className="w-full flex items-center justify-between text-slate-200 hover:text-white transition-colors"
          >
            <span className="font-medium">高级设置</span>
            {expandedSections.advanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.advanced && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">权重阈值</span>
                  <span className="text-slate-200 font-mono">{analysisParams.weightThreshold.toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.05"
                  value={analysisParams.weightThreshold}
                  onChange={(e) => updateParams({ weightThreshold: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">曲面平滑度</span>
                  <span className="text-slate-200 font-mono">{analysisParams.surfaceSmoothing.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={analysisParams.surfaceSmoothing}
                  onChange={(e) => updateParams({ surfaceSmoothing: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={analysisParams.showOutliers}
                  onChange={(e) => updateParams({ showOutliers: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                />
                显示异常点
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              分析中...
            </>
          ) : (
            '运行分析'
          )}
        </button>
      </div>
    </div>
  );
}
