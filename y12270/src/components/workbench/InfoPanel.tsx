import { useState } from 'react';
import { TrendingUp, Clock, Percent, AlertCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getIssueTypeLabel, getSeverityColor } from '../../engine/QualityValidator';

export function InfoPanel() {
  const { analysisResult, qualityIssues, currentVersion, holdings, setSelectedBond, selectedBondId } = useAppStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    quality: true,
    holdings: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const unresolvedIssues = qualityIssues.filter(i => !i.resolved);

  const selectedBond = selectedBondId ? holdings.find(h => h.bondId === selectedBondId) : null;

  return (
    <div className="w-80 bg-slate-900/95 border-l border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <FileText size={18} />
          分析结果
        </h2>
        {currentVersion && (
          <div className="mt-2 text-xs text-slate-400">
            当前版本: <span className="text-slate-200 font-medium">{currentVersion.name}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-slate-700/50">
          <button
            onClick={() => toggleSection('summary')}
            className="w-full flex items-center justify-between text-slate-200 hover:text-white transition-colors mb-2"
          >
            <span className="font-medium">久期摘要</span>
            {expandedSections.summary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.summary && analysisResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Clock size={12} />
                    平均久期
                  </div>
                  <div className="text-xl font-semibold text-slate-100 font-mono">
                    {analysisResult.avgDuration.toFixed(2)}
                    <span className="text-sm text-slate-500 ml-1">年</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <TrendingUp size={12} />
                    加权久期
                  </div>
                  <div className="text-xl font-semibold text-blue-400 font-mono">
                    {analysisResult.weightedDuration.toFixed(2)}
                    <span className="text-sm text-slate-500 ml-1">年</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Percent size={12} />
                    平均收益率
                  </div>
                  <div className="text-xl font-semibold text-emerald-400 font-mono">
                    {analysisResult.avgYield.toFixed(2)}
                    <span className="text-sm text-slate-500 ml-1">%</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <FileText size={12} />
                    债券数量
                  </div>
                  <div className="text-xl font-semibold text-slate-100 font-mono">
                    {holdings.length}
                    <span className="text-sm text-slate-500 ml-1">只</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30">
                <div className="text-xs text-blue-400 mb-1 font-medium">久期结论</div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {analysisResult.durationConclusion}
                </p>
              </div>
            </div>
          )}

          {!analysisResult && (
            <div className="text-center py-8 text-slate-500 text-sm">
              点击"运行分析"按钮开始分析
            </div>
          )}
        </div>

        <div className="p-4 border-b border-slate-700/50">
          <button
            onClick={() => toggleSection('quality')}
            className="w-full flex items-center justify-between text-slate-200 hover:text-white transition-colors mb-2"
          >
            <span className="font-medium flex items-center gap-2">
              <AlertCircle size={14} />
              数据质量
              {unresolvedIssues.length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                  {unresolvedIssues.length}
                </span>
              )}
            </span>
            {expandedSections.quality ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.quality && unresolvedIssues.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {unresolvedIssues.slice(0, 10).map(issue => (
                <div
                  key={issue.issueId}
                  className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                  onClick={() => setSelectedBond(issue.bondId)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getSeverityColor(issue.severity) }}
                        />
                        <span className="text-xs font-medium text-slate-300">
                          {getIssueTypeLabel(issue.type)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{issue.description}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <p className="text-[10px] text-amber-400/80">
                      影响: {issue.affectedResults.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
              {unresolvedIssues.length > 10 && (
                <div className="text-center text-xs text-slate-500">
                  还有 {unresolvedIssues.length - 10} 个问题...
                </div>
              )}
            </div>
          )}

          {expandedSections.quality && unresolvedIssues.length === 0 && (
            <div className="text-center py-6 text-emerald-400 text-sm flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              数据质量良好
            </div>
          )}
        </div>

        {selectedBond && (
          <div className="p-4 border-b border-slate-700/50 bg-blue-500/5">
            <div className="text-sm font-medium text-blue-400 mb-3">选中债券详情</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">债券代码</span>
                <span className="text-slate-200 font-mono">{selectedBond.bondId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">债券名称</span>
                <span className="text-slate-200">{selectedBond.bondName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">行业</span>
                <span className="text-slate-200">{selectedBond.industry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">久期</span>
                <span className="text-blue-400 font-mono">{selectedBond.duration.toFixed(2)}年</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">收益率</span>
                <span className="text-emerald-400 font-mono">{selectedBond.yield.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">权重</span>
                <span className="text-slate-200 font-mono">
                  {selectedBond.weight !== null ? `${selectedBond.weight.toFixed(2)}%` : '缺失'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">数据来源</span>
                <span className="text-slate-200">{selectedBond.source}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedBond(null)}
              className="mt-3 w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors border border-slate-700 rounded hover:border-slate-600"
            >
              取消选中
            </button>
          </div>
        )}

        <div className="p-4">
          <button
            onClick={() => toggleSection('holdings')}
            className="w-full flex items-center justify-between text-slate-200 hover:text-white transition-colors mb-2"
          >
            <span className="font-medium">债券持仓列表</span>
            {expandedSections.holdings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.holdings && (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {holdings.slice(0, 30).map(bond => (
                <div
                  key={bond.bondId}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedBondId === bond.bondId
                      ? 'bg-blue-500/20 border border-blue-500/50'
                      : 'hover:bg-slate-800/50 border border-transparent'
                  }`}
                  onClick={() => setSelectedBond(bond.bondId)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 truncate flex-1">{bond.bondName}</span>
                    <span className="text-xs text-blue-400 font-mono ml-2 flex-shrink-0">
                      {bond.duration.toFixed(1)}年
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-500">{bond.industry}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">{bond.yield.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
              {holdings.length > 30 && (
                <div className="text-center text-xs text-slate-500 py-2">
                  共 {holdings.length} 只债券，显示前30只
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
