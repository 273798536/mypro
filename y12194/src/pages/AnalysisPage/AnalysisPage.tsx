import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Settings,
  AlertTriangle,
  FileCode,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useChartStore } from '../../store/useChartStore';
import { cn, formatTime } from '../../utils';
import { ProjectSidebar } from '../../components/ProjectSidebar/ProjectSidebar';
import { IssueCard } from '../../components/IssueCard/IssueCard';

const issueTypeFilters = [
  { key: 'all', label: '全部' },
  { key: 'timing_offset', label: '音画偏移' },
  { key: 'dense_chord', label: '双押过密' },
  { key: 'hold_miss', label: '长按漏判' },
  { key: 'difficulty_label', label: '难度标签' },
];

export const AnalysisPage = () => {
  const navigate = useNavigate();
  const {
    getCurrentProject,
    analyzeCurrentProject,
    analysisConfig,
    updateAnalysisConfig,
    selectedIssueId,
    selectIssue,
  } = useChartStore();
  const project = getCurrentProject();

  const [activeFilter, setActiveFilter] = useState('all');
  const [showConfig, setShowConfig] = useState(false);

  const handleAnalyze = () => {
    analyzeCurrentProject();
  };

  if (!project) {
    return (
      <div className="flex h-[calc(100vh-64px)]">
        <ProjectSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileCode className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">请先选择或导入一个谱面项目</p>
          </div>
        </div>
      </div>
    );
  }

  const isAnalyzed = project.issues.length > 0;

  const timingOffsetIssues = project.issues.filter(i => i.type === 'timing_offset');
  const otherIssues = project.issues.filter(i => i.type !== 'timing_offset');

  const filteredIssues = activeFilter === 'all'
    ? project.issues
    : project.issues.filter(i => i.type === activeFilter);

  const selectedIssue = project.issues.find(i => i.id === selectedIssueId);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <ProjectSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">质检分析</h1>
              <p className="text-slate-400 text-sm">检测音画偏移、双押过密、长按漏判等问题</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={cn(
                  'p-2.5 rounded-lg transition-colors',
                  showConfig
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                )}
              >
                <Settings className="w-5 h-5" />
              </button>
              {!isAnalyzed ? (
                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  开始质检
                </button>
              ) : (
                <button
                  onClick={() => navigate('/report')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  下一步：生成报告
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {isAnalyzed && (
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-slate-300">
                  严重: <span className="text-white font-medium">
                    {project.issues.filter(i => i.severity === 'critical').length}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm text-slate-300">
                  警告: <span className="text-white font-medium">
                    {project.issues.filter(i => i.severity === 'warning').length}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-slate-300">
                  提示: <span className="text-white font-medium">
                    {project.issues.filter(i => i.severity === 'info').length}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-300">
                  音画偏移: <span className="text-amber-400 font-medium">{timingOffsetIssues.length}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {showConfig && (
          <div className="p-4 bg-slate-800/50 border-b border-slate-700">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">密押阈值(ms):</label>
                <input
                  type="number"
                  value={analysisConfig.denseChordThreshold}
                  onChange={(e) => updateAnalysisConfig({ denseChordThreshold: Number(e.target.value) })}
                  className="w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">偏移阈值(ms):</label>
                <input
                  type="number"
                  value={analysisConfig.timingOffsetThreshold}
                  onChange={(e) => updateAnalysisConfig({ timingOffsetThreshold: Number(e.target.value) })}
                  className="w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">最小长按(ms):</label>
                <input
                  type="number"
                  value={analysisConfig.minHoldDuration}
                  onChange={(e) => updateAnalysisConfig({ minHoldDuration: Number(e.target.value) })}
                  className="w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                />
              </div>
            </div>
          </div>
        )}

        {isAnalyzed ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  {issueTypeFilters.map(filter => (
                    <button
                      key={filter.key}
                      onClick={() => setActiveFilter(filter.key)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        activeFilter === filter.key
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {timingOffsetIssues.length > 0 && activeFilter === 'all' && (
                <div className="p-4 border-b border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-medium text-amber-400">
                      ⚠️ 音画偏移 - 独立检测区
                    </h3>
                    <span className="text-xs text-slate-500">
                      (以下问题单独列出，不混入正常结果)
                    </span>
                  </div>
                  <div className="space-y-3">
                    {timingOffsetIssues.map(issue => (
                      <div
                        key={issue.id}
                        className="p-4 rounded-lg border-2 border-amber-500/50 bg-amber-500/10"
                      >
                        <IssueCard
                          issue={issue}
                          isSelected={selectedIssueId === issue.id}
                          onSelect={selectIssue}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {(activeFilter === 'all' ? otherIssues : filteredIssues).map(issue => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      isSelected={selectedIssueId === issue.id}
                      onSelect={selectIssue}
                    />
                  ))}
                  {filteredIssues.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-400">暂无问题</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedIssue && (
              <div className="w-80 border-l border-slate-700 bg-slate-800/30">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="text-sm font-medium text-slate-300">问题详情</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-xs text-slate-500">类型</label>
                    <p className="text-sm text-slate-300">{selectedIssue.type}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">严重程度</label>
                    <p className="text-sm text-slate-300">{selectedIssue.severity}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">时间</label>
                    <p className="text-sm text-slate-300 font-mono">{formatTime(selectedIssue.time)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">描述</label>
                    <p className="text-sm text-slate-300">{selectedIssue.description}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">关联Note ID</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedIssue.relatedNotes.map(id => (
                        <span key={id} className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                          {id.slice(0, 8)}...
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">原始数据</label>
                    <pre className="mt-1 p-2 bg-slate-900 rounded text-xs text-slate-500 font-mono overflow-x-auto">
                      {JSON.stringify(selectedIssue.rawData, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
                <Play className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-slate-400 mb-4">点击"开始质检"分析谱面</p>
              <p className="text-xs text-slate-600 max-w-sm">
                系统将检测音画偏移、双押过密、长按漏判、难度标签等问题
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
