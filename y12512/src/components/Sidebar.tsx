import React, { useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, AlertTriangle, Lightbulb, Cloud, CheckCircle2, XCircle, Clock, Eye, Download, Upload, FileText, Settings, Search, Filter } from 'lucide-react';
import { useStageStore } from '../store/useStageStore';
import { IssueType, IssueSeverity, IssueStatus } from '../types';

const issueTypeLabels: Record<IssueType, string> = {
  [IssueType.SMOKE_OBSTRUCTION]: '烟雾遮挡',
  [IssueType.WIND_DIRECTION_ERROR]: '风向错误',
  [IssueType.LIGHT_PENETRATION]: '灯光穿雾',
  [IssueType.DUPLICATE_IMPORT]: '重复导入',
  [IssueType.ABNORMAL_RETENTION]: '异常滞留',
  [IssueType.EXPORT_MISMATCH]: '口径不一致',
};

const severityColors: Record<IssueSeverity, string> = {
  [IssueSeverity.INFO]: 'bg-blue-500',
  [IssueSeverity.WARNING]: 'bg-yellow-500',
  [IssueSeverity.ERROR]: 'bg-red-500',
};

const statusColors: Record<IssueStatus, string> = {
  [IssueStatus.PENDING_REVIEW]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  [IssueStatus.REVIEWED]: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  [IssueStatus.RESOLVED]: 'bg-green-500/20 text-green-400 border-green-500/50',
};

const statusLabels: Record<IssueStatus, string> = {
  [IssueStatus.PENDING_REVIEW]: '待复核',
  [IssueStatus.REVIEWED]: '已复核',
  [IssueStatus.RESOLVED]: '已解决',
};

export const Sidebar: React.FC = () => {
  const {
    playback,
    filters,
    issues,
    activeTab,
    selectedObjectId,
    selectedObjectType,
    smokeMachines,
    lights,
    stage,
    reports,
    validation,
    visibilitySamples,
    togglePlayback,
    setPlaybackTime,
    setPlaybackSpeed,
    toggleFilter,
    setVisibilityThreshold,
    setActiveTab,
    selectObject,
    updateIssueStatus,
    toggleSmokeMachine,
    toggleLight,
    runValidation,
    exportData,
    importData,
    generateReport,
    toggleIssueTypeFilter,
    setTimeRange,
  } = useStageStore();

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (filters.selectedIssueTypes.length > 0 && !filters.selectedIssueTypes.includes(issue.type)) {
        return false;
      }
      if (issue.timestamp < filters.timeRange.start || issue.timestamp > filters.timeRange.end) {
        return false;
      }
      return true;
    });
  }, [issues, filters.selectedIssueTypes, filters.timeRange]);

  const selectedObject = useMemo(() => {
    if (!selectedObjectId) return null;
    if (selectedObjectType === 'smokeMachine') {
      return smokeMachines.find((m) => m.id === selectedObjectId);
    }
    if (selectedObjectType === 'stageLight') {
      return lights.find((l) => l.id === selectedObjectId);
    }
    if (selectedObjectType === 'obstacle') {
      return stage.obstacles.find((o) => o.id === selectedObjectId);
    }
    return null;
  }, [selectedObjectId, selectedObjectType, smokeMachines, lights, stage.obstacles]);

  const currentVisibility = useMemo(() => {
    const recentSamples = visibilitySamples.filter(
      (s) => Math.abs(s.timestamp - playback.currentTime) < 1
    );
    if (recentSamples.length === 0) return null;
    const avg = recentSamples.reduce((sum, s) => sum + s.visibility, 0) / recentSamples.length;
    const min = Math.min(...recentSamples.map((s) => s.visibility));
    return { avg, min };
  }, [visibilitySamples, playback.currentTime]);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smoke-flow-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          importData(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="w-96 h-full bg-stage-surface border-l border-stage-border flex flex-col overflow-hidden">
      <div className="p-4 border-b border-stage-border bg-gradient-to-r from-primary/10 to-secondary/10">
        <h1 className="text-xl font-bold text-white mb-1">音乐舞台烟雾流场</h1>
        <p className="text-xs text-gray-400">交互式 3D 仿真工作台</p>
      </div>

      <div className="p-4 border-b border-stage-border bg-stage-bg/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaybackTime(0)}
              className="p-2 rounded-lg bg-stage-border hover:bg-stage-border/80 text-gray-300 transition-colors"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={togglePlayback}
              className="p-3 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors"
            >
              {playback.isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={() => setPlaybackTime(playback.duration)}
              className="p-2 rounded-lg bg-stage-border hover:bg-stage-border/80 text-gray-300 transition-colors"
            >
              <SkipForward size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">速度</span>
            <select
              value={playback.speed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-stage-border text-gray-300 text-sm rounded px-2 py-1 border border-stage-border/50 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>
        </div>

        <div className="mb-2">
          <input
            type="range"
            min={0}
            max={playback.duration}
            step={0.1}
            value={playback.currentTime}
            onChange={(e) => setPlaybackTime(Number(e.target.value))}
            className="w-full h-2 bg-stage-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(playback.currentTime)}</span>
            <span>{formatTime(playback.duration)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-stage-bg/80 rounded-lg p-3 border border-stage-border/50">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Eye size={12} />
              <span>当前能见度</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {currentVisibility ? `${currentVisibility.avg.toFixed(0)}%` : '--'}
            </div>
            {currentVisibility && (
              <div className={`text-xs mt-1 ${
                currentVisibility.min < filters.visibilityThreshold ? 'text-yellow-400' : 'text-green-400'
              }`}>
                最低 {currentVisibility.min.toFixed(0)}%
              </div>
            )}
          </div>
          <div className="bg-stage-bg/80 rounded-lg p-3 border border-stage-border/50">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <AlertTriangle size={12} />
              <span>待复核问题</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {issues.filter((i) => i.status === IssueStatus.PENDING_REVIEW).length}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              共 {filteredIssues.length} 个问题
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-stage-border">
        {[
          { id: 'issues', label: '问题', icon: AlertTriangle, count: filteredIssues.length },
          { id: 'machines', label: '烟雾机', icon: Cloud, count: smokeMachines.length },
          { id: 'lights', label: '灯光', icon: Lightbulb, count: lights.length },
          { id: 'reports', label: '报告', icon: FileText, count: reports.length },
          { id: 'validation', label: '校验', icon: Settings, count: 0 },
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex-1 py-3 px-2 text-xs font-medium transition-colors relative ${
              activeTab === id
                ? 'text-primary bg-primary/10'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <Icon size={16} />
              <span>{label}</span>
              {count > 0 && (
                <span className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === id ? 'bg-primary text-white' : 'bg-stage-border text-gray-400'
                }`}>
                  {count}
                </span>
              )}
            </div>
            {activeTab === id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'issues' && (
          <div className="p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Filter size={12} />
                <span>类型筛选</span>
              </div>
              {Object.values(IssueType).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleIssueTypeFilter(type)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    filters.selectedIssueTypes.includes(type)
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-stage-border/50 border-stage-border text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {issueTypeLabels[type]}
                </button>
              ))}
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <Clock size={12} />
                <span>时间范围</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={filters.timeRange.start}
                  onChange={(e) => setTimeRange(Number(e.target.value), filters.timeRange.end)}
                  className="w-20 bg-stage-bg text-gray-300 text-sm rounded px-2 py-1 border border-stage-border/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="开始"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={filters.timeRange.end}
                  onChange={(e) => setTimeRange(filters.timeRange.start, Number(e.target.value))}
                  className="w-20 bg-stage-bg text-gray-300 text-sm rounded px-2 py-1 border border-stage-border/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="结束"
                />
                <span className="text-xs text-gray-500">秒</span>
              </div>
            </div>

            <div className="space-y-2">
              {filteredIssues.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                  <p>暂无符合条件的问题</p>
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`bg-stage-bg rounded-lg border p-3 cursor-pointer transition-all hover:border-primary/50 ${
                      issue.relatedObjectIds.includes(selectedObjectId || '')
                        ? 'border-primary ring-1 ring-primary/30'
                        : 'border-stage-border/50'
                    }`}
                    onClick={() => {
                      if (issue.relatedObjectIds.length > 0) {
                        const objType = issue.relatedObjectTypes[0];
                        selectObject(issue.relatedObjectIds[0], objType);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityColors[issue.severity]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-medium text-white text-sm truncate">{issue.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColors[issue.status]}`}>
                            {statusLabels[issue.status]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{issue.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="px-1.5 py-0.5 bg-stage-border/50 rounded">
                              {issueTypeLabels[issue.type]}
                            </span>
                            <span>t={formatTime(issue.timestamp)}</span>
                          </div>
                          {issue.status === IssueStatus.PENDING_REVIEW && (
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateIssueStatus(issue.id, IssueStatus.REVIEWED);
                                }}
                                className="p-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                title="标记已复核"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateIssueStatus(issue.id, IssueStatus.RESOLVED);
                                }}
                                className="p-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                                title="标记已解决"
                              >
                                <CheckCircle2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        {issue.relatedObjectIds.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-stage-border/50">
                            <div className="text-xs text-gray-500 mb-1">关联对象:</div>
                            <div className="flex flex-wrap gap-1">
                              {issue.relatedObjectIds.map((id, idx) => (
                                <span
                                  key={id}
                                  className={`text-xs px-1.5 py-0.5 rounded ${
                                    selectedObjectId === id
                                      ? 'bg-primary/30 text-primary'
                                      : 'bg-stage-border/30 text-gray-400'
                                  }`}
                                >
                                  {id}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'machines' && (
          <div className="p-3 space-y-2">
            {smokeMachines.map((machine) => (
              <div
                key={machine.id}
                className={`bg-stage-bg rounded-lg border p-3 cursor-pointer transition-all ${
                  selectedObjectId === machine.id
                    ? 'border-primary ring-1 ring-primary/30'
                    : 'border-stage-border/50 hover:border-primary/50'
                }`}
                onClick={() => selectObject(machine.id, 'smokeMachine')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cloud size={16} className={machine.enabled ? 'text-primary' : 'text-gray-500'} />
                    <span className="font-medium text-white text-sm">{machine.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSmokeMachine(machine.id);
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      machine.enabled ? 'bg-primary' : 'bg-stage-border'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        machine.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                  <div>位置: ({machine.position.x}, {machine.position.y}, {machine.position.z})</div>
                  <div>速率: {machine.emissionRate}/s</div>
                  <div>开始: {formatTime(machine.startTime)}</div>
                  <div>结束: {formatTime(machine.endTime)}</div>
                </div>
                <div className="mt-2 pt-2 border-t border-stage-border/50">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FileText size={10} />
                    <span>来源: {machine.source}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={10} />
                    <span>导入: {new Date(machine.importedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Settings size={10} />
                    <span>版本: {machine.version}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'lights' && (
          <div className="p-3 space-y-2">
            {lights.map((light) => (
              <div
                key={light.id}
                className={`bg-stage-bg rounded-lg border p-3 cursor-pointer transition-all ${
                  selectedObjectId === light.id
                    ? 'border-primary ring-1 ring-primary/30'
                    : 'border-stage-border/50 hover:border-primary/50'
                }`}
                onClick={() => selectObject(light.id, 'stageLight')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={16} style={{ color: light.color }} className={light.enabled ? '' : 'opacity-30'} />
                    <span className="font-medium text-white text-sm">{light.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLight(light.id);
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      light.enabled ? 'bg-primary' : 'bg-stage-border'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        light.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                  <div>类型: {light.type}</div>
                  <div>强度: {light.intensity}</div>
                  <div>角度: {light.coneAngle}°</div>
                  <div className="flex items-center gap-1">
                    颜色:
                    <div
                      className="w-3 h-3 rounded-full border border-stage-border"
                      style={{ backgroundColor: light.color }}
                    />
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-stage-border/50">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FileText size={10} />
                    <span>来源: {light.source}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={10} />
                    <span>导入: {new Date(light.importedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Settings size={10} />
                    <span>版本: {light.version}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-3 space-y-3">
            <button
              onClick={generateReport}
              className="w-full py-2 px-4 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg border border-primary/30 transition-colors text-sm font-medium"
            >
              + 生成新报告
            </button>
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-stage-bg rounded-lg border border-stage-border/50 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span className="font-medium text-white text-sm">{report.name}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{report.averageVisibility.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">平均能见度</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-400">{report.minVisibility.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">最低</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">{report.maxVisibility.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">最高</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>时长: {formatTime(report.startTime)} - {formatTime(report.endTime)}</span>
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                    {report.issueCount} 个问题
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-stage-border/50">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FileText size={10} />
                    <span>来源: {report.source}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={10} />
                    <span>生成: {new Date(report.generatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="p-3 space-y-3">
            <button
              onClick={runValidation}
              className="w-full py-2 px-4 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg border border-primary/30 transition-colors text-sm font-medium"
            >
              运行基础校验
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-stage-border hover:bg-stage-border/80 text-gray-300 rounded-lg transition-colors text-sm"
              >
                <Download size={14} />
                导出
              </button>
              <button
                onClick={handleImport}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-stage-border hover:bg-stage-border/80 text-gray-300 rounded-lg transition-colors text-sm"
              >
                <Upload size={14} />
                导入
              </button>
            </div>

            {validation && (
              <div className="bg-stage-bg rounded-lg border border-stage-border/50 p-3">
                <h4 className="font-medium text-white text-sm mb-3">基础检查结果</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">重复导入检查</span>
                    {validation.checks.duplicateImports ? (
                      <CheckCircle2 size={16} className="text-green-400" />
                    ) : (
                      <XCircle size={16} className="text-yellow-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">异常滞留检查</span>
                    {validation.checks.abnormalRetention ? (
                      <CheckCircle2 size={16} className="text-green-400" />
                    ) : (
                      <XCircle size={16} className="text-yellow-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">导出口径一致</span>
                    {validation.checks.exportConsistency ? (
                      <CheckCircle2 size={16} className="text-green-400" />
                    ) : (
                      <XCircle size={16} className="text-yellow-400" />
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-stage-border/50">
                  <div className={`text-sm font-medium ${validation.isValid ? 'text-green-400' : 'text-yellow-400'}`}>
                    {validation.isValid ? '✓ 所有检查通过' : '⚠ 存在待复核项'}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-stage-bg rounded-lg border border-stage-border/50 p-3">
              <h4 className="font-medium text-white text-sm mb-3">显示设置</h4>
              <div className="space-y-2">
                {[
                  { key: 'showStage', label: '显示舞台' },
                  { key: 'showSmoke', label: '显示烟雾' },
                  { key: 'showLights', label: '显示灯光' },
                  { key: 'showMachines', label: '显示烟雾机' },
                  { key: 'showObstacles', label: '显示障碍物' },
                  { key: 'showFlowArrows', label: '显示气流箭头' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key as keyof typeof filters)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-stage-border/30 hover:bg-stage-border/50 transition-colors"
                  >
                    <span className="text-sm text-gray-300">{label}</span>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${
                      filters[key as keyof typeof filters] ? 'bg-primary' : 'bg-stage-border'
                    }`}>
                      <div
                        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                          filters[key as keyof typeof filters] ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-300">能见度阈值</label>
                  <span className="text-sm text-primary font-mono">{filters.visibilityThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filters.visibilityThreshold}
                  onChange={(e) => setVisibilityThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-stage-border rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {selectedObject && (
              <div className="bg-stage-bg rounded-lg border border-primary/50 p-3">
                <h4 className="font-medium text-white text-sm mb-2 flex items-center gap-2">
                  <Search size={14} className="text-primary" />
                  选中对象详情
                </h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <div><span className="text-gray-500">ID:</span> {selectedObject.id}</div>
                  <div><span className="text-gray-500">名称:</span> {selectedObject.name}</div>
                  <div><span className="text-gray-500">类型:</span> {selectedObjectType}</div>
                  {'source' in selectedObject && (
                    <>
                      <div><span className="text-gray-500">来源文件:</span> {selectedObject.source}</div>
                      <div><span className="text-gray-500">导入时间:</span> {new Date(selectedObject.importedAt).toLocaleString()}</div>
                      <div><span className="text-gray-500">版本:</span> {selectedObject.version}</div>
                    </>
                  )}
                  {'position' in selectedObject && (
                    <div>
                      <span className="text-gray-500">位置:</span> ({selectedObject.position.x.toFixed(1)}, {selectedObject.position.y.toFixed(1)}, {selectedObject.position.z.toFixed(1)})
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
