import { useState, useMemo, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileJson,
  Gauge,
  Zap,
  Target,
  TrendingUp,
  Eye,
  Edit3,
  Download,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import Scene3D from '@/three/Scene3D';
import { parseJSONLog, parseCSVLog, readFileAsText, downloadMarkdown } from '@/utils/fileImport';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    complete: 'bg-green-500/20 text-green-400 border-green-500/30',
    incomplete: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pending_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  const labels: Record<string, string> = {
    complete: '完整',
    incomplete: '不完整',
    pending_review: '待审核',
  };
  return (
    <span className={cn(
      'px-2 py-0.5 text-xs rounded border',
      styles[status] || 'bg-slate-500/20 text-slate-400'
    )}>
      {labels[status] || status}
    </span>
  );
}

function JudgmentBadge({ judgment, needsReview }: { judgment: string; needsReview?: boolean }) {
  if (needsReview && judgment === 'pending') {
    return (
      <span className="px-2 py-0.5 text-xs rounded border bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        待确认
      </span>
    );
  }
  const styles: Record<string, string> = {
    pass: 'bg-green-500/20 text-green-400 border-green-500/30',
    fail: 'bg-red-500/20 text-red-400 border-red-500/30',
    pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };
  const icons: Record<string, any> = {
    pass: CheckCircle,
    fail: AlertTriangle,
    pending: Clock,
  };
  const labels: Record<string, string> = {
    pass: '通过',
    fail: '不合格',
    pending: '待定',
  };
  const Icon = icons[judgment] || Clock;
  return (
    <span className={cn(
      'px-2 py-0.5 text-xs rounded border flex items-center gap-1',
      styles[judgment] || styles.pending
    )}>
      <Icon className="w-3 h-3" />
      {labels[judgment] || judgment}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    low: 'bg-green-500/15 text-green-400',
    medium: 'bg-amber-500/15 text-amber-400',
    high: 'bg-red-500/15 text-red-400',
  };
  const labels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
  };
  return (
    <span className={cn('px-1.5 py-0.5 text-xs rounded', styles[severity])}>
      {labels[severity] || severity}
    </span>
  );
}

function LeftPanel() {
  const [logsExpanded, setLogsExpanded] = useState(true);
  const [paramsExpanded, setParamsExpanded] = useState(true);
  const [importMsg, setImportMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const selectedLogId = useAppStore((s) => s.selectedLogId);
  const setSelectedLogId = useAppStore((s) => s.setSelectedLogId);
  const selectedParamId = useAppStore((s) => s.selectedParamId);
  const setSelectedParamId = useAppStore((s) => s.setSelectedParamId);
  const sensorLogs = useAppStore((s) => s.sensorLogs);
  const paramVersions = useAppStore((s) => s.paramVersions);
  const logBatches = useAppStore((s) => s.logBatches);
  const addLogBatch = useAppStore((s) => s.addLogBatch);
  const createLog = useAppStore((s) => s.createLog);
  const addTimeSeriesData = useAppStore((s) => s.addTimeSeriesData);
  const addSensorPoints = useAppStore((s) => s.addSensorPoints);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const batchesByLog = useMemo(() => {
    const map: Record<string, typeof logBatches> = {};
    logBatches.forEach((b) => {
      if (!map[b.logId]) map[b.logId] = [];
      map[b.logId].push(b);
    });
    return map;
  }, [logBatches]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);
    let addedAny = false;
    let failedNames: string[] = [];

    for (const file of fileArr) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'json' && ext !== 'csv') {
        failedNames.push(`${file.name}(不支持的格式)`);
        continue;
      }
      try {
        const text = await readFileAsText(file);
        const parsed = ext === 'json' ? parseJSONLog(text, file.name) : parseCSVLog(text, file.name);
        if (!parsed || parsed.batches.length === 0) {
          failedNames.push(`${file.name}(解析失败)`);
          continue;
        }

        let targetLogId = selectedLogId;
        if (!targetLogId) {
          const logName = `导入实验-${new Date().toLocaleDateString('zh-CN')}`;
          targetLogId = createLog(logName, parsed.batches[0]);
          setSelectedLogId(targetLogId);
        } else {
          addLogBatch(targetLogId, parsed.batches[0]);
        }
        if (parsed.timeSeries.length > 0) {
          addTimeSeriesData(targetLogId, parsed.timeSeries);
        }
        if (parsed.sensorPoints.length > 0) {
          addSensorPoints(targetLogId, parsed.sensorPoints);
        }
        addedAny = true;
      } catch (e: any) {
        failedNames.push(`${file.name}(${e?.message || '错误'})`);
      }
    }

    if (addedAny) {
      setImportMsg({ type: 'ok', text: `导入成功：${fileArr.length - failedNames.length} 个文件` });
    }
    if (failedNames.length > 0) {
      setImportMsg({ type: 'err', text: `导入失败：${failedNames.join('、')}` });
    }
    setTimeout(() => setImportMsg(null), 4000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  return (
    <aside className="w-72 bg-slate-900/50 border-r border-slate-800 flex flex-col flex-shrink-0">
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-slate-800">
          <button
            onClick={() => setLogsExpanded(!logsExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors"
          >
            <span className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <FileJson className="w-4 h-4 text-cyan-400" />
              传感器日志
            </span>
            {logsExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          </button>
          {logsExpanded && (
            <div className="pb-2">
              <div className="px-4 py-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm border border-dashed border-slate-600 rounded-md text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  导入日志文件（JSON/CSV）
                </button>
                {importMsg && (
                  <div className={cn(
                    'mt-2 px-2 py-1.5 rounded text-xs',
                    importMsg.type === 'ok'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  )}>
                    {importMsg.text}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                  已选日志会合并到「{sensorLogs.find(l => l.id === selectedLogId)?.name || '新日志'}」，不会覆盖早先数据
                </div>
              </div>
              <div className="space-y-1 px-2">
                {sensorLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLogId(log.id)}
                    className={cn(
                      'p-3 rounded-md cursor-pointer transition-all',
                      selectedLogId === log.id
                        ? 'bg-slate-800 border border-cyan-500/30'
                        : 'hover:bg-slate-800/50 border border-transparent'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-slate-200 font-medium truncate">{log.name}</span>
                      <StatusBadge status={log.status} />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(log.startTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} · {log.pointCount.toLocaleString()} 条
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(batchesByLog[log.id] || []).slice(0, 2).map((batch) => (
                        <span key={batch.id} className="text-xs px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400">
                          {batch.fileName.slice(0, 12)}...
                        </span>
                      ))}
                      {(batchesByLog[log.id] || []).length > 2 && (
                        <span className="text-xs px-1.5 py-0.5 text-slate-500">
                          +{(batchesByLog[log.id] || []).length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setParamsExpanded(!paramsExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors"
          >
            <span className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              参数版本
            </span>
            {paramsExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          </button>
          {paramsExpanded && (
            <div className="space-y-1 px-2 pb-4">
              {paramVersions.map((param) => (
                <div
                  key={param.id}
                  onClick={() => setSelectedParamId(param.id)}
                  className={cn(
                    'p-3 rounded-md cursor-pointer transition-all',
                    selectedParamId === param.id
                      ? 'bg-slate-800 border border-amber-500/30'
                      : 'hover:bg-slate-800/50 border border-transparent'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-200 font-medium">{param.versionName}</span>
                    {param.isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">当前</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 line-clamp-2">{param.description}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {param.createdBy} · {new Date(param.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function RightPanel() {
  const selectedPointId = useAppStore((s) => s.selectedPointId);
  const setSelectedPointId = useAppStore((s) => s.setSelectedPointId);
  const selectedLogId = useAppStore((s) => s.selectedLogId);
  const selectedParamId = useAppStore((s) => s.selectedParamId);
  const selectedResultId = useAppStore((s) => s.selectedResultId);
  const sensorLogs = useAppStore((s) => s.sensorLogs);
  const paramVersions = useAppStore((s) => s.paramVersions);
  const calculationResults = useAppStore((s) => s.calculationResults);
  const sensorPoints = useAppStore((s) => s.sensorPoints);
  const manualJudgments = useAppStore((s) => s.manualJudgments);
  const reports = useAppStore((s) => s.reports);
  const triggerCalculation = useAppStore((s) => s.triggerCalculation);
  const applyManualJudgment = useAppStore((s) => s.applyManualJudgment);
  const createReport = useAppStore((s) => s.createReport);
  const createReportFromLog = useAppStore((s) => s.createReportFromLog);
  const setSelectedReportId = useAppStore((s) => s.setSelectedReportId);

  const selectedLog = useMemo(
    () => sensorLogs.find((l) => l.id === selectedLogId),
    [sensorLogs, selectedLogId]
  );
  const selectedParam = useMemo(
    () => paramVersions.find((p) => p.id === selectedParamId),
    [paramVersions, selectedParamId]
  );
  const selectedResult = useMemo(
    () => calculationResults.find((r) => r.id === selectedResultId),
    [calculationResults, selectedResultId]
  );
  const points = useMemo(
    () => sensorPoints.filter((p) => p.logId === selectedLogId),
    [sensorPoints, selectedLogId]
  );
  const selectedPoint = useMemo(
    () => points.find((p) => p.id === selectedPointId),
    [points, selectedPointId]
  );
  const manualJudgment = useMemo(
    () => (selectedResult ? manualJudgments.find((m) => m.resultId === selectedResult.id) : undefined),
    [selectedResult, manualJudgments]
  );

  const [showJudgmentModal, setShowJudgmentModal] = useState(false);
  const [judgmentType, setJudgmentType] = useState<'pass' | 'fail'>('pass');
  const [judgmentReason, setJudgmentReason] = useState('');
  const [nextStep, setNextStep] = useState('');

  const handleApplyJudgment = () => {
    if (selectedResult && judgmentReason) {
      applyManualJudgment(selectedResult.id, judgmentType, judgmentReason, nextStep);
      setShowJudgmentModal(false);
      setJudgmentReason('');
      setNextStep('');
    }
  };

  return (
    <aside className="w-80 bg-slate-900/50 border-l border-slate-800 flex flex-col flex-shrink-0">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-cyan-400" />
            复算操作
          </h3>
          <button
            onClick={() => selectedLogId && selectedParamId && triggerCalculation(selectedLogId, selectedParamId)}
            disabled={!selectedLogId || !selectedParamId || selectedResult?.status === 'calculating'}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {selectedResult?.status === 'calculating' ? '复算中...' : '开始复算'}
          </button>
          <button
            onClick={() => {
              if (!selectedLogId) return;
              const r = createReportFromLog(selectedLogId);
              if (r) {
                downloadMarkdown(r.content, `${selectedLog?.name || '日志'}-原始数据报告`);
              }
            }}
            disabled={!selectedLogId}
            className="mt-2 w-full py-2 text-xs bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-300 rounded-md transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            导出当前日志原始数据报告
          </button>
          <div className="mt-2 text-xs text-slate-500">
            当前日志: {selectedLog?.name.slice(0, 18) || '未选择'}...
          </div>
        </div>

        {selectedResult && (
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-green-400" />
                复算结果
              </h3>
              <JudgmentBadge judgment={selectedResult.judgment} needsReview={selectedResult.needsManualReview} />
            </div>

            {selectedResult.status === 'calculating' ? (
              <div className="py-8 text-center">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">正在复算中...</p>
              </div>
            ) : selectedResult.status === 'error' ? (
              <div className="py-6">
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md mb-3">
                  <div className="text-xs text-red-400 font-medium mb-1">❌ 复算失败</div>
                  <p className="text-xs text-red-300/70">{selectedResult.reviewReason || '未知错误，请重试'}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-800/50 rounded-md">
                    <div className="text-xs text-slate-500 mb-1">平均光强</div>
                    <div className="text-lg font-mono text-slate-200">
                      {selectedResult.resultData.averageIntensity.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800/50 rounded-md">
                    <div className="text-xs text-slate-500 mb-1">对比度</div>
                    <div className="text-lg font-mono text-slate-200">
                      {selectedResult.resultData.contrastRatio.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800/50 rounded-md">
                    <div className="text-xs text-slate-500 mb-1">散斑尺寸</div>
                    <div className="text-lg font-mono text-slate-200">
                      {selectedResult.resultData.speckleSize.toFixed(1)}
                      <span className="text-xs text-slate-500 ml-1">μm</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800/50 rounded-md">
                    <div className="text-xs text-slate-500 mb-1">稳定性</div>
                    <div className="text-lg font-mono text-slate-200">
                      {selectedResult.resultData.stability.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">置信度</span>
                    <span className="text-xs font-mono text-slate-300">
                      {(selectedResult.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        selectedResult.confidence >= 0.8 ? 'bg-green-500' :
                        selectedResult.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${selectedResult.confidence * 100}%` }}
                    />
                  </div>
                </div>

                {selectedResult.samplingGaps.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 mb-2">采样缺口 ({selectedResult.samplingGaps.length}处)</div>
                    <div className="space-y-1.5">
                      {selectedResult.samplingGaps.map((gap) => (
                        <div key={gap.id} className="p-2 bg-slate-800/30 rounded text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">
                              {new Date(gap.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <SeverityBadge severity={gap.severity} />
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            持续 {gap.duration}秒 · {gap.sensorIds.length} 个传感器
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedResult.needsManualReview && !manualJudgment && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                    <div className="text-xs text-amber-400 font-medium mb-1">⚠️ 需人工确认</div>
                    <p className="text-xs text-amber-300/70">{selectedResult.reviewReason}</p>
                    <button
                      onClick={() => setShowJudgmentModal(true)}
                      className="mt-2 w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      人工判读
                    </button>
                  </div>
                )}

                {manualJudgment && (
                  <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded-md">
                    <div className="text-xs text-slate-500 mb-2">人工改判记录</div>
                    <div className="flex items-center gap-2 mb-2">
                      <JudgmentBadge judgment={manualJudgment.judgment} />
                      <span className="text-xs text-slate-500">{manualJudgment.judgedBy}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1"><span className="text-slate-500">原因：</span>{manualJudgment.reason}</p>
                    <p className="text-xs text-slate-400"><span className="text-slate-500">下一步：</span>{manualJudgment.nextStep}</p>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      createReport(selectedResult.id);
                    }}
                    disabled={selectedResult.status !== 'done'}
                    className="py-2 text-xs bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    生成报告
                  </button>
                  <button
                    onClick={() => {
                      createReport(selectedResult.id);
                      setTimeout(() => {
                        const r = useAppStore.getState().reports.find(x => x.resultId === selectedResult.id);
                        if (r) {
                          downloadMarkdown(r.content, `${selectedResult.id}-复算报告`);
                        }
                      }, 50);
                    }}
                    disabled={selectedResult.status !== 'done'}
                    className="py-2 text-xs bg-cyan-600/80 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    导出 .md
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {selectedParam && (
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              当前参数
            </h3>
            <div className="space-y-2">
              {Object.entries(selectedParam.parameters).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{key}</span>
                  <span className="text-slate-300 font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedPoint ? (
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-cyan-400" />
              选中点位
            </h3>
            <div className="p-3 bg-slate-800/50 rounded-md">
              <div className="text-slate-200 font-medium">{selectedPoint.name}</div>
              <div className="text-xs text-slate-500 mt-1 capitalize">类型: {selectedPoint.type}</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-xs text-slate-500">X</div>
                  <div className="text-sm font-mono text-slate-300">{selectedPoint.x.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500">Y</div>
                  <div className="text-sm font-mono text-slate-300">{selectedPoint.y.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500">Z</div>
                  <div className="text-sm font-mono text-slate-300">{selectedPoint.z.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              点位概览
            </h3>
            <div className="space-y-1.5">
              {points.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-slate-800/50 cursor-pointer"
                  onClick={() => setSelectedPointId(p.id)}
                >
                  <span className="text-slate-400">{p.name}</span>
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    p.type === 'laser' ? 'bg-red-500' :
                    p.type === 'detector' ? 'bg-cyan-500' : 'bg-slate-500'
                  )} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showJudgmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-medium text-slate-200 mb-4">人工判读</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-2">判读结果</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setJudgmentType('pass')}
                    className={cn(
                      'flex-1 py-2 rounded-md text-sm transition-colors',
                      judgmentType === 'pass'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    通过
                  </button>
                  <button
                    onClick={() => setJudgmentType('fail')}
                    className={cn(
                      'flex-1 py-2 rounded-md text-sm transition-colors',
                      judgmentType === 'fail'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    不合格
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">改判原因</label>
                <textarea
                  value={judgmentReason}
                  onChange={(e) => setJudgmentReason(e.target.value)}
                  className="w-full h-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 resize-none focus:outline-none focus:border-cyan-500"
                  placeholder="请输入改判原因..."
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">下一步建议</label>
                <textarea
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  className="w-full h-16 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 resize-none focus:outline-none focus:border-cyan-500"
                  placeholder="请输入下一步建议..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowJudgmentModal(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleApplyJudgment}
                disabled={!judgmentReason}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded-md transition-colors"
              >
                确认判读
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function Timeline() {
  const selectedLogId = useAppStore((s) => s.selectedLogId);
  const sensorLogs = useAppStore((s) => s.sensorLogs);
  const currentTime = useAppStore((s) => s.currentTime);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const getTimeSeries = useAppStore((s) => s.getTimeSeries);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedLog = useMemo(
    () => sensorLogs.find((l) => l.id === selectedLogId),
    [sensorLogs, selectedLogId]
  );
  const timeSeries = useMemo(
    () => getTimeSeries(selectedLogId || ''),
    [getTimeSeries, selectedLogId]
  );

  const startTime = selectedLog ? new Date(selectedLog.startTime).getTime() : 0;
  const endTime = selectedLog ? new Date(selectedLog.endTime).getTime() : 0;
  const duration = endTime - startTime;

  const progress = duration > 0 ? ((currentTime - startTime) / duration) * 100 : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseFloat(e.target.value);
    const newTime = startTime + (pct / 100) * duration;
    setCurrentTime(newTime);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const skipBack = () => {
    setCurrentTime(Math.max(startTime, currentTime - 60000));
  };

  const skipForward = () => {
    setCurrentTime(Math.min(endTime, currentTime + 60000));
  };

  const formatTime = (t: number) => {
    if (!t) return '--:--:--';
    return new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="h-20 bg-slate-900/80 border-t border-slate-800 flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex items-center gap-1">
        <button
          onClick={skipBack}
          className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={togglePlay}
          className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={skipForward}
          className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span className="font-mono">{formatTime(startTime)}</span>
          <span className="font-mono text-cyan-400">{formatTime(currentTime)}</span>
          <span className="font-mono">{formatTime(endTime)}</span>
        </div>
        <div className="relative h-2 bg-slate-800 rounded-full">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>数据点: {timeSeries.length}</span>
          <span>
            {selectedLog
              ? `${Math.floor(duration / 3600000)}时${Math.floor((duration % 3600000) / 60000)}分`
              : '--'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-slate-500">激光源</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500" />
          <span className="text-slate-500">探测器</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span className="text-slate-500">参考点</span>
        </div>
      </div>
    </div>
  );
}

export default function Workbench() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <main className="flex-1 relative">
          <Scene3D />
        </main>
        <RightPanel />
      </div>
      <Timeline />
    </div>
  );
}
