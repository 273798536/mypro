import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkflowStore } from '../store';
import { validateParamConfig } from '../utils/validation';
import { formatDateTime } from '../utils';
import { ANOMALY_TYPE_MAPPING, ANOMALY_STATUS_MAPPING, DISTANCE_METRIC_MAPPING, PROMPT_VERSIONS } from '../constants';
import { ParamConfig, DistanceMetric, Cluster, Anomaly } from '../types';
import {
  Play, Settings, BarChart3, AlertTriangle, ChevronDown, ChevronRight,
  GripVertical, Layers, FileText, Download, Eye, Zap, GitBranch, Info
} from 'lucide-react';

interface BatchWorkbenchPageProps {
  onNavigate: (path: string) => void;
}

export function BatchWorkbenchPage({ onNavigate }: BatchWorkbenchPageProps) {
  const { batchId } = useParams();
  const {
    batches,
    getBatchRuns,
    getCurrentRun,
    getRunClusters,
    getRunAnomalies,
    getUnifiedStats,
    createRun,
    selectRun,
    selectAnomaly,
    selectedRunId
  } = useWorkflowStore();

  const batch = batches.find(b => b.id === batchId);
  const runs = getBatchRuns(batchId ?? '');
  const currentRun = getCurrentRun();
  const clusters = currentRun ? getRunClusters(currentRun.id) : [];
  const anomalies = currentRun ? getRunAnomalies(currentRun.id) : [];
  const stats = currentRun ? getUnifiedStats(currentRun.id) : null;

  const [showParamPanel, setShowParamPanel] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  const [paramConfig, setParamConfig] = useState<ParamConfig>({
    eps: currentRun?.paramConfig.eps ?? 0.5,
    minSamples: currentRun?.paramConfig.minSamples ?? 5,
    distanceMetric: currentRun?.paramConfig.distanceMetric ?? 'cosine',
    featureColumns: currentRun?.paramConfig.featureColumns ?? ['text_embedding', 'label']
  });
  const [promptVersion, setPromptVersion] = useState(PROMPT_VERSIONS[2].id);
  const [featureColumnInput, setFeatureColumnInput] = useState('');

  const paramErrors = validateParamConfig(paramConfig);

  useEffect(() => {
    if (currentRun) {
      setParamConfig(currentRun.paramConfig);
    }
  }, [currentRun?.id]);

  const toggleCluster = (clusterId: string) => {
    const next = new Set(expandedClusters);
    if (next.has(clusterId)) {
      next.delete(clusterId);
    } else {
      next.add(clusterId);
    }
    setExpandedClusters(next);
  };

  const addFeatureColumn = () => {
    const col = featureColumnInput.trim();
    if (col && !paramConfig.featureColumns.includes(col)) {
      setParamConfig(p => ({ ...p, featureColumns: [...p.featureColumns, col] }));
      setFeatureColumnInput('');
    }
  };

  const removeFeatureColumn = (col: string) => {
    setParamConfig(p => ({ ...p, featureColumns: p.featureColumns.filter(c => c !== col) }));
  };

  const handleRunClustering = () => {
    if (!batchId || paramErrors.length > 0) return;
    createRun(batchId, promptVersion, paramConfig);
    setShowParamPanel(false);
  };

  const getFieldError = (field: keyof ParamConfig) =>
    paramErrors.find(e => e.field === field);

  if (!batch) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        未找到指定批次
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-mono text-xl font-bold text-slate-100">{batch.name}</h1>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              {batch.sourceFile} · 创建于 {formatDateTime(batch.createdAt)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(`/batch/${batchId}/export`)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-200 rounded transition-all"
            >
              <Download size={15} />
              导出报告
            </button>
            <button
              onClick={() => setShowParamPanel(!showParamPanel)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-200 rounded transition-all"
            >
              <Settings size={15} />
              参数配置
            </button>
            <button
              onClick={handleRunClustering}
              disabled={paramErrors.length > 0}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded font-medium transition-all ${
                paramErrors.length > 0
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500'
              }`}
            >
              <Zap size={15} />
              执行聚类
            </button>
          </div>
        </div>

        {runs.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <GitBranch size={14} className="text-slate-500" />
            <span className="text-xs text-slate-500 mr-2">运行版本：</span>
            {runs.map(run => (
              <button
                key={run.id}
                onClick={() => selectRun(run.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-all ${
                  selectedRunId === run.id
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                }`}
              >
                <span>run v{run.version}</span>
                <span className="text-[10px] opacity-60">· {run.promptVersion}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showParamPanel && (
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Settings size={14} /> 聚类参数配置
            </h3>
            {paramErrors.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertTriangle size={13} />
                发现 {paramErrors.length} 个参数问题
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                邻域半径 eps <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={paramConfig.eps}
                onChange={e => setParamConfig(p => ({ ...p, eps: parseFloat(e.target.value) }))}
                className={`w-full px-3 py-2 bg-slate-950 border rounded text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 ${
                  getFieldError('eps')
                    ? 'border-rose-500/50 focus:ring-rose-500/50 focus:border-rose-500'
                    : 'border-slate-700 focus:ring-cyan-500/50 focus:border-cyan-500/50'
                }`}
              />
              {getFieldError('eps') && (
                <div className="mt-1.5">
                  <div className="text-xs text-rose-400 flex items-start gap-1">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span>{getFieldError('eps')?.message}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 ml-4">
                    💡 {getFieldError('eps')?.suggestion}
                    {getFieldError('eps')?.example !== undefined && (
                      <span className="text-cyan-400 ml-1">示例：{String(getFieldError('eps')?.example)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                最小样本数 minSamples <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="1"
                value={paramConfig.minSamples}
                onChange={e => setParamConfig(p => ({ ...p, minSamples: parseInt(e.target.value) }))}
                className={`w-full px-3 py-2 bg-slate-950 border rounded text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 ${
                  getFieldError('minSamples')
                    ? 'border-rose-500/50 focus:ring-rose-500/50 focus:border-rose-500'
                    : 'border-slate-700 focus:ring-cyan-500/50 focus:border-cyan-500/50'
                }`}
              />
              {getFieldError('minSamples') && (
                <div className="mt-1.5">
                  <div className="text-xs text-rose-400 flex items-start gap-1">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span>{getFieldError('minSamples')?.message}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 ml-4">
                    💡 {getFieldError('minSamples')?.suggestion}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                距离度量方式 <span className="text-rose-400">*</span>
              </label>
              <select
                value={paramConfig.distanceMetric}
                onChange={e => setParamConfig(p => ({ ...p, distanceMetric: e.target.value as DistanceMetric }))}
                className={`w-full px-3 py-2 bg-slate-950 border rounded text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 ${
                  getFieldError('distanceMetric')
                    ? 'border-rose-500/50 focus:ring-rose-500/50'
                    : 'border-slate-700 focus:ring-cyan-500/50 focus:border-cyan-500/50'
                }`}
              >
                {Object.entries(DISTANCE_METRIC_MAPPING).map(([key, val]) => (
                  <option key={key} value={key}>{val.label} — {val.description}</option>
                ))}
              </select>
              {getFieldError('distanceMetric') && (
                <div className="text-xs text-rose-400 mt-1.5">
                  <AlertTriangle size={12} className="inline mr-1" />
                  {getFieldError('distanceMetric')?.message}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                提示词版本
              </label>
              <select
                value={promptVersion}
                onChange={e => setPromptVersion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              >
                {PROMPT_VERSIONS.map(pv => (
                  <option key={pv.id} value={pv.id}>{pv.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-4">
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                特征列 featureColumns <span className="text-rose-400">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-950 border border-slate-700 rounded min-h-[42px]">
                {paramConfig.featureColumns.map(col => (
                  <span key={col} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 border border-slate-600 rounded text-xs font-mono text-slate-200">
                    {col}
                    <button
                      onClick={() => removeFeatureColumn(col)}
                      className="text-slate-500 hover:text-rose-400 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {paramConfig.featureColumns.length === 0 && (
                  <span className="text-xs text-slate-600 px-2">请添加至少一列特征</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={featureColumnInput}
                  onChange={e => setFeatureColumnInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeatureColumn())}
                  placeholder="输入列名，按回车添加"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
                <button
                  onClick={addFeatureColumn}
                  className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500 rounded text-sm transition-all"
                >
                  添加
                </button>
              </div>
              {getFieldError('featureColumns') && (
                <div className="mt-1.5">
                  <div className="text-xs text-rose-400 flex items-start gap-1">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span>{getFieldError('featureColumns')?.message}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 ml-4">
                    💡 {getFieldError('featureColumns')?.suggestion}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-cyan-500" />
            <span className="text-xs font-medium text-slate-400">统一统计（界面与报告共用，不会各算各的）</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="样本总数" value={stats.dedup.totalSamples.toLocaleString()} tone="slate" />
            <StatCard label="去重后" value={stats.dedup.uniqueSamples.toLocaleString()} tone="cyan" />
            <StatCard label="重复数" value={stats.dedup.duplicateSamples.toLocaleString()} tone="amber" />
            <StatCard label="训练集" value={stats.distribution.trainSplit.toLocaleString()} tone="slate" />
            <StatCard label="验证集" value={stats.distribution.valSplit.toLocaleString()} tone="slate" />
            <StatCard label="测试集" value={stats.distribution.testSplit.toLocaleString()} tone="slate" />
            <StatCard
              label="待处理异常"
              value={`${stats.pendingAnomalies}/${stats.totalAnomalies}`}
              tone={stats.pendingAnomalies > 0 ? 'rose' : 'emerald'}
            />
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Layers size={14} />
            异常聚类分组 ({clusters.length})
          </h3>
          {currentRun && (
            <span className="text-xs text-slate-500 font-mono">
              run v{currentRun.version} · {currentRun.promptVersion} · 执行于 {formatDateTime(currentRun.executedAt)}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {clusters.length === 0 && (
            <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded">
              <Layers size={36} className="mx-auto mb-3 opacity-30" />
              <div className="text-sm">暂无聚类结果，请先执行聚类分析</div>
            </div>
          )}

          {clusters.map(cluster => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              anomalies={anomalies.filter(a => a.clusterId === cluster.id)}
              expanded={expandedClusters.has(cluster.id)}
              onToggle={() => toggleCluster(cluster.id)}
              onViewAnomaly={(anomalyId) => {
                selectAnomaly(anomalyId);
                onNavigate(`/batch/${batchId}/anomaly/${anomalyId}`);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'cyan' | 'amber' | 'emerald' | 'rose' }) {
  const toneMap = {
    slate: 'text-slate-200',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400'
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded p-3">
      <div className="text-[11px] text-slate-500 mb-1">{label}</div>
      <div className={`font-mono text-lg font-semibold ${toneMap[tone]}`}>{value}</div>
    </div>
  );
}

function ClusterCard({
  cluster,
  anomalies,
  expanded,
  onToggle,
  onViewAnomaly
}: {
  cluster: Cluster;
  anomalies: Anomaly[];
  expanded: boolean;
  onToggle: () => void;
  onViewAnomaly: (id: string) => void;
}) {
  const typeInfo = ANOMALY_TYPE_MAPPING[cluster.anomalyType];

  return (
    <div className={`border rounded bg-slate-900 overflow-hidden transition-all ${typeInfo.bgColor}`}>
      <div
        onClick={onToggle}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/30"
      >
        <span className="text-slate-500 shrink-0">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <GripVertical size={16} className="text-slate-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
              {typeInfo.title}
            </span>
            <span className="font-mono text-sm text-slate-200 font-medium line-clamp-1">{cluster.summary}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{typeInfo.suggestion}</div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-[10px] text-slate-500">样本数</div>
            <div className="font-mono text-sm text-slate-200">{cluster.size}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500">严重度</div>
            <div className={`font-mono text-sm font-semibold ${
              cluster.severityScore >= 0.8 ? 'text-rose-400' :
              cluster.severityScore >= 0.6 ? 'text-amber-400' : 'text-cyan-400'
            }`}>
              {Math.round(cluster.severityScore * 100)}%
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-800 bg-slate-950/50">
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Info size={12} />
              {typeInfo.description}
            </div>
          </div>
          <div className="divide-y divide-slate-800">
            {anomalies.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">暂无异常明细</div>
            ) : (
              anomalies.map(anomaly => {
                const statusInfo = ANOMALY_STATUS_MAPPING[anomaly.status];
                return (
                  <div
                    key={anomaly.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/30"
                  >
                    <FileText size={14} className="text-slate-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200 truncate">{anomaly.description.slice(0, 80)}{anomaly.description.length > 80 ? '...' : ''}</div>
                      <div className="text-xs text-slate-500 truncate">{anomaly.friendlyDescription}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${statusInfo.bgColor} ${statusInfo.color} font-medium shrink-0`}>
                      {statusInfo.label}
                    </span>
                    <button
                      onClick={() => onViewAnomaly(anomaly.id)}
                      className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 shrink-0"
                    >
                      <Eye size={12} /> 追溯
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
