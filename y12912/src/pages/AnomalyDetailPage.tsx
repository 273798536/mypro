import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../store';
import { formatDateTime } from '../utils';
import { ANOMALY_TYPE_MAPPING, ANOMALY_STATUS_MAPPING, CORRECTION_ACTION_MAPPING, DISTANCE_METRIC_MAPPING } from '../constants';
import { AnomalyStatus, CorrectionAction, TimelineEvent } from '../types';
import {
  ArrowLeft, Clock, AlertTriangle, CheckCircle, XCircle, Wrench, FileText,
  ChevronDown, ChevronRight, GitBranch, User, MessageSquare, Send, Database,
  Play, Lightbulb, History
} from 'lucide-react';

interface AnomalyDetailPageProps {
  onNavigate: (path: string) => void;
}

export function AnomalyDetailPage({ onNavigate }: AnomalyDetailPageProps) {
  const { batchId, anomalyId } = useParams();
  const {
    anomalies,
    clusters,
    samples,
    runs,
    batches,
    getAnomalyTimeline,
    getAnomalyCorrections,
    addCorrection,
    updateAnomalyStatus
  } = useWorkflowStore();

  const anomaly = anomalies.find(a => a.id === anomalyId);
  const cluster = anomaly ? clusters.find(c => c.id === anomaly.clusterId) : null;
  const sample = anomaly ? samples.find(s => s.id === anomaly.sampleId) : null;
  const run = anomaly ? runs.find(r => r.id === anomaly.runId) : null;
  const batch = anomaly ? batches.find(b => b.id === anomaly.batchId) : null;
  const timeline = anomaly ? getAnomalyTimeline(anomaly.id) : [];
  const corrections = anomaly ? getAnomalyCorrections(anomaly.id) : [];

  const typeInfo = cluster ? ANOMALY_TYPE_MAPPING[cluster.anomalyType] : null;
  const statusInfo = anomaly ? ANOMALY_STATUS_MAPPING[anomaly.status] : null;

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionAction, setCorrectionAction] = useState<CorrectionAction>('keep');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');

  const toggleEvent = (eventId: string) => {
    const next = new Set(expandedEvents);
    if (next.has(eventId)) next.delete(eventId);
    else next.add(eventId);
    setExpandedEvents(next);
  };

  const handleSubmitCorrection = () => {
    if (!anomaly || !sample || !run || !correctionReason.trim()) return;

    const newStatus: AnomalyStatus =
      correctionAction === 'remove' || correctionAction === 'relabel' ? 'fixed' :
      correctionAction === 'keep' ? 'rejected' : 'confirmed';

    addCorrection({
      anomalyId: anomaly.id,
      sampleId: sample.id,
      runId: run.id,
      action: correctionAction,
      reason: correctionReason,
      operator: '当前用户',
      note: correctionNote,
      newStatus
    });

    setShowCorrectionForm(false);
    setCorrectionReason('');
    setCorrectionNote('');
  };

  if (!anomaly || !cluster || !run) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        未找到异常记录
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <button
          onClick={() => onNavigate(`/batch/${batchId}`)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-3"
        >
          <ArrowLeft size={14} />
          返回聚类工作台
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${typeInfo?.bgColor} ${typeInfo?.color}`}>
                {typeInfo?.title}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${statusInfo?.bgColor} ${statusInfo?.color}`}>
                {statusInfo?.label}
              </span>
              {sample && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  {sample.sourceSplit === 'train' ? '训练集' : sample.sourceSplit === 'val' ? '验证集' : '测试集'}
                </span>
              )}
              {sample?.isDuplicate && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                  重复样本
                </span>
              )}
            </div>
            <h1 className="font-mono text-xl font-bold text-slate-100">{anomaly.title}</h1>
            <div className="text-xs text-slate-500 font-mono mt-1">
              {batch?.name} · run v{run.version} · {run.promptVersion}
            </div>
          </div>
          <button
            onClick={() => setShowCorrectionForm(!showCorrectionForm)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded border border-cyan-500 font-medium transition-all"
          >
            <Wrench size={15} />
            人工处理
          </button>
        </div>
      </div>

      {showCorrectionForm && (
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-5">
          <h3 className="font-mono text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Wrench size={14} /> 人工处理此异常
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">处理方式</label>
              <select
                value={correctionAction}
                onChange={e => setCorrectionAction(e.target.value as CorrectionAction)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              >
                {Object.entries(CORRECTION_ACTION_MAPPING).map(([key, val]) => (
                  <option key={key} value={key}>{val.label} — {val.description}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">
              处理原因 <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={correctionReason}
              onChange={e => setCorrectionReason(e.target.value)}
              rows={2}
              placeholder="请填写具体的处理原因，例如：确认该样本同时出现在训练集和验证集中，决定从验证集移除"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">备注（可选）</label>
            <textarea
              value={correctionNote}
              onChange={e => setCorrectionNote(e.target.value)}
              rows={2}
              placeholder="补充说明，如：需要同步更新原始数据切分脚本"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmitCorrection}
              disabled={!correctionReason.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded font-medium transition-all ${
                correctionReason.trim()
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Send size={14} /> 提交处理
            </button>
            <button
              onClick={() => setShowCorrectionForm(false)}
              className="px-4 py-2 text-sm text-slate-300 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded transition-all"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
        <div className="lg:col-span-2 space-y-4">
          <Card title="异常说明" icon={<Lightbulb size={14} />}>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">自然语言描述</div>
                <div className="text-slate-200 leading-relaxed">{anomaly.friendlyDescription}</div>
              </div>
              {typeInfo && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded">
                  <div className="text-xs text-emerald-400 font-medium mb-1">💡 建议操作</div>
                  <div className="text-sm text-slate-300">{typeInfo.suggestion}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-slate-500 mb-1">技术描述</div>
                <div className="text-slate-400 text-xs font-mono">{anomaly.description}</div>
              </div>
            </div>
          </Card>

          {sample && (
            <Card title="样本内容" icon={<FileText size={14} />}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-slate-500 mb-0.5">样本ID</div>
                    <div className="font-mono text-slate-300">{sample.originalId}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">所属切分</div>
                    <div className="font-mono text-slate-300">{sample.sourceSplit}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">内容</div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {sample.content}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card title="聚类与运行参数" icon={<GitBranch size={14} />}>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">聚类分组</div>
                <div className="font-mono text-slate-200">{cluster.name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">聚类严重度</div>
                <div className={`font-mono text-lg font-semibold ${
                  cluster.severityScore >= 0.8 ? 'text-rose-400' :
                  cluster.severityScore >= 0.6 ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  {Math.round(cluster.severityScore * 100)}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-slate-500 mb-0.5">eps</div>
                  <div className="font-mono text-slate-300">{run.paramConfig.eps}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">minSamples</div>
                  <div className="font-mono text-slate-300">{run.paramConfig.minSamples}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">距离度量</div>
                  <div className="font-mono text-slate-300">{DISTANCE_METRIC_MAPPING[run.paramConfig.distanceMetric].label}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">提示词版本</div>
                  <div className="font-mono text-cyan-400">{run.promptVersion}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">特征列</div>
                <div className="flex flex-wrap gap-1">
                  {run.paramConfig.featureColumns.map(col => (
                    <span key={col} className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-300">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
              {Object.keys(cluster.metrics).length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">聚类指标</div>
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-400">
                    {JSON.stringify(cluster.metrics, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {corrections.length > 0 && (
            <Card title={`处理记录 (${corrections.length})`} icon={<MessageSquare size={14} />}>
              <div className="space-y-3">
                {corrections.map(c => (
                  <div key={c.id} className="p-3 bg-slate-950/50 border border-slate-800 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {CORRECTION_ACTION_MAPPING[c.action].label}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{formatDateTime(c.correctedAt)}</span>
                    </div>
                    <div className="text-sm text-slate-200 mb-1">{c.reason}</div>
                    {c.note && (
                      <div className="text-xs text-slate-500 border-t border-slate-800 pt-2 mt-2">备注：{c.note}</div>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                      <User size={11} /> {c.operator}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3">
          <Card title="完整追溯时间线" icon={<History size={14} />} subtitle="顺着一条异常往回查：原始样本 → 提示词版本 → 聚类参数 → 处理意见">
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-700" />
              <div className="space-y-1">
                {timeline.length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-8 pl-8">暂无追溯记录</div>
                )}
                {timeline.map(event => (
                  <TimelineEventItem
                    key={event.id}
                    event={event}
                    expanded={expandedEvents.has(event.id)}
                    onToggle={() => toggleEvent(event.id)}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <h3 className="font-mono text-sm font-semibold text-slate-200 flex items-center gap-2">
          {icon && <span className="text-cyan-500">{icon}</span>}
          {title}
        </h3>
        {subtitle && <span className="text-[11px] text-slate-500">{subtitle}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function TimelineEventItem({
  event,
  expanded,
  onToggle
}: {
  event: TimelineEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const typeConfig = {
    import: { icon: <Database size={12} />, color: 'text-slate-400', bg: 'bg-slate-700' },
    run: { icon: <Play size={12} />, color: 'text-cyan-400', bg: 'bg-cyan-600' },
    cluster: { icon: <AlertTriangle size={12} />, color: 'text-rose-400', bg: 'bg-rose-500' },
    correction: { icon: <Wrench size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-500' },
    review: { icon: <CheckCircle size={12} />, color: 'text-amber-400', bg: 'bg-amber-500' }
  };
  const cfg = typeConfig[event.type] ?? typeConfig.import;

  return (
    <div className="relative pl-10 py-2">
      <div className={`absolute left-[7px] top-3 w-[17px] h-[17px] rounded-full ${cfg.bg} flex items-center justify-center text-white shadow-lg ring-4 ring-slate-900`}>
        {cfg.icon}
      </div>
      <div
        onClick={onToggle}
        className="cursor-pointer hover:bg-slate-800/30 rounded px-3 py-2 -mx-3"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${cfg.color}`}>{event.title}</span>
          {event.details && (
            expanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />
          )}
          <span className="ml-auto text-[10px] text-slate-500 font-mono">{formatDateTime(event.timestamp)}</span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{event.description}</div>
        {event.operator && (
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <User size={10} /> {event.operator}
          </div>
        )}
      </div>
      {expanded && event.details && (
        <div className="mt-2 ml-0 p-3 bg-slate-950/70 border border-slate-800 rounded">
          <pre className="text-[11px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(event.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
