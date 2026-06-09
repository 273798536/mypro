import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import FlowGraph from '@/components/FlowGraph';
import {
  StatusBadge,
  ReviewBadge,
  DuplicateTag,
  SectionCard,
  PrimaryButton,
  TeachingHint,
  ExplanationBox,
} from '@/components/Badges';
import {
  ArrowLeft,
  Network,
  AlertTriangle,
  AlertCircle,
  FileWarning,
  Layers,
  ArrowRightLeft,
  Check,
  X,
  BarChart3,
  List,
  Zap,
} from 'lucide-react';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getSampleById = useStore((s) => s.getSampleById);
  const setReviewStatus = useStore((s) => s.setReviewStatus);
  const samples = useStore((s) => s.samples);

  const sample = id ? getSampleById(id) : undefined;

  if (!sample) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-200 text-lg mb-4">未找到该样本</p>
          <PrimaryButton variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft size={16} />}>
            返回上一页
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const originalSample = sample.isDuplicate && sample.duplicateOf
    ? samples.find((s) => s.id === sample.duplicateOf)
    : undefined;

  return (
    <div className="min-h-screen bg-deep-900 animate-fade-in">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center gap-2 text-sm text-neutral-200 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 hover:text-accent-cyan transition-colors"
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <span className="text-neutral-400">/</span>
          <button onClick={() => navigate('/')} className="hover:text-accent-cyan transition-colors">
            分析工作台
          </button>
          <span className="text-neutral-400">/</span>
          <span className="text-neutral-50">样例详情</span>
        </div>

        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-neutral-50 mb-3">{sample.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={sample.status} />
                <ReviewBadge reviewed={sample.reviewed} status={sample.reviewStatus} />
                {sample.isDuplicate && sample.duplicatePair && (
                  <DuplicateTag score={sample.duplicatePair.similarityScore} />
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-neutral-200 font-mono">
                <span>ID: {sample.id}</span>
                <span>创建时间: {formatDate(sample.createdAt)}</span>
                <span>更新时间: {formatDate(sample.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          <div className="flex-1 lg:w-2/3 space-y-6">
            <SectionCard title="网络流拓扑图" icon={<Network size={16} />}>
              <FlowGraph nodes={sample.nodes} edges={sample.edges} />
              <div className="flex items-center gap-4 mt-4 text-xs text-neutral-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border-2 border-accent-green" />
                  <span>源点</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border-2 border-accent-amber" />
                  <span>汇点</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[rgba(148,163,184,0.35)] rounded" />
                  <span>无流边</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-accent-cyan rounded" />
                  <span>有流边</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-accent-red rounded" />
                  <span>瓶颈边</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border-2 border-accent-red" />
                  <span>瓶颈节点</span>
                </div>
              </div>
            </SectionCard>

            {sample.explanation && (
              <SectionCard title="瓶颈分析解释" icon={<Zap size={16} />}>
                <div className="space-y-4">
                  <ExplanationBox summary={sample.explanation.summary} />
                  <TeachingHint>{sample.explanation.teachingNote}</TeachingHint>

                  {(sample.explanation.affectedNodes.length > 0 || sample.explanation.affectedEdges.length > 0) && (
                    <div className="space-y-3">
                      {sample.explanation.affectedNodes.length > 0 && (
                        <div>
                          <p className="text-xs text-neutral-200 mb-2 font-medium">受影响节点</p>
                          <div className="flex flex-wrap gap-2">
                            {sample.explanation.affectedNodes.map((nid) => {
                              const node = sample.nodes.find((n) => n.id === nid);
                              return (
                                <span
                                  key={nid}
                                  className="px-2.5 py-1 rounded-md text-xs font-mono bg-accent-red/15 text-accent-red border border-accent-red/30"
                                >
                                  {node?.label ?? nid}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {sample.explanation.affectedEdges.length > 0 && (
                        <div>
                          <p className="text-xs text-neutral-200 mb-2 font-medium">受影响边</p>
                          <div className="flex flex-wrap gap-2">
                            {sample.explanation.affectedEdges.map((eid) => {
                              const edge = sample.edges.find((e) => e.id === eid);
                              return (
                                <span
                                  key={eid}
                                  className="px-2.5 py-1 rounded-md text-xs font-mono bg-accent-red/15 text-accent-red border border-accent-red/30"
                                >
                                  {edge ? `${edge.from}→${edge.to}` : eid}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-deep-800/60 rounded-lg p-4 border border-deep-600/50">
                      <p className="text-xs text-neutral-200 mb-1">最大流数值</p>
                      <p className="text-3xl font-bold font-mono text-accent-cyan text-shadow-cyan">
                        {sample.explanation.maxFlow}
                      </p>
                      <p className="text-xs text-neutral-300 mt-1">单位流量</p>
                    </div>
                    <div className="bg-deep-800/60 rounded-lg p-4 border border-accent-red/30">
                      <p className="text-xs text-neutral-200 mb-1">瓶颈数值</p>
                      <p className="text-3xl font-bold font-mono text-accent-red">
                        {sample.explanation.bottleneckValue}
                      </p>
                      <p className="text-xs text-neutral-300 mt-1">单位流量（限制上限）</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {sample.issues.length > 0 && (
              <SectionCard
                title="数据问题清单"
                icon={<FileWarning size={16} />}
                className="border-l-4 border-l-accent-amber"
              >
                <div className="space-y-3">
                  {sample.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-deep-800/60 border border-deep-600/50"
                    >
                      <div className="shrink-0 mt-0.5">
                        {issue.severity === 'error' ? (
                          <AlertCircle size={18} className="text-accent-red" />
                        ) : (
                          <AlertTriangle size={18} className="text-accent-amber" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                              issue.severity === 'error'
                                ? 'bg-accent-red/20 text-accent-red'
                                : 'bg-accent-amber/20 text-accent-amber'
                            }`}
                          >
                            {issue.severity.toUpperCase()}
                          </span>
                          <span className="text-xs font-mono text-neutral-100">{issue.type}</span>
                        </div>
                        <p className="text-sm text-neutral-50">{issue.message}</p>
                        {issue.details && (
                          <p className="text-xs text-neutral-200 mt-1 font-mono">{issue.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {sample.isDuplicate && sample.duplicatePair && (
              <SectionCard title="重复样本检测" icon={<Layers size={16} />}>
                <div className="rounded-lg border border-accent-red/30 overflow-hidden">
                  <div className="duplicate-overlay p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-deep-900/80 rounded-lg p-4 border border-accent-red/30">
                        <p className="text-xs text-accent-red font-semibold mb-2">本样本</p>
                        <p className="text-sm text-neutral-50 font-medium mb-1">{sample.name}</p>
                        <p className="text-xs font-mono text-neutral-200">ID: {sample.id}</p>
                        <p className="text-xs font-mono text-neutral-200">
                          节点: {sample.nodes.length} | 边: {sample.edges.length}
                        </p>
                      </div>
                      <div className="bg-deep-900/80 rounded-lg p-4 border border-deep-600/50">
                        <p className="text-xs text-neutral-100 font-semibold mb-2">被重复的样本</p>
                        <p className="text-sm text-neutral-50 font-medium mb-1">
                          {originalSample?.name ?? '未知样本'}
                        </p>
                        <p className="text-xs font-mono text-neutral-200">
                          ID: {sample.duplicatePair.sampleId1 === sample.id
                            ? sample.duplicatePair.sampleId2
                            : sample.duplicatePair.sampleId1}
                        </p>
                        {originalSample && (
                          <p className="text-xs font-mono text-neutral-200">
                            节点: {originalSample.nodes.length} | 边: {originalSample.edges.length}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 text-center">
                      <p className="text-xs text-neutral-200 mb-2">相似度</p>
                      <p className="text-5xl font-bold font-mono text-accent-red">
                        {(sample.duplicatePair.similarityScore * 100).toFixed(2)}%
                      </p>
                    </div>

                    <div className="mt-6 bg-deep-900/80 rounded-lg p-4 border border-deep-600/50">
                      <p className="text-xs text-neutral-100 font-semibold mb-2 flex items-center gap-1">
                        <AlertTriangle size={14} className="text-accent-amber" />
                        拦截理由说明
                      </p>
                      <p className="text-sm text-neutral-100 leading-relaxed">
                        {sample.duplicatePair.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>

          <div className="w-full lg:w-1/3 space-y-6">
            <SectionCard title="数据快速统计" icon={<BarChart3 size={16} />}>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-deep-800/60 rounded-lg p-3 text-center border border-deep-600/50">
                  <p className="text-xs text-neutral-200">节点数</p>
                  <p className="text-2xl font-bold font-mono text-accent-cyan mt-1">{sample.nodes.length}</p>
                </div>
                <div className="bg-deep-800/60 rounded-lg p-3 text-center border border-deep-600/50">
                  <p className="text-xs text-neutral-200">边数</p>
                  <p className="text-2xl font-bold font-mono text-accent-cyan mt-1">{sample.edges.length}</p>
                </div>
                <div className="bg-deep-800/60 rounded-lg p-3 text-center border border-accent-green/30">
                  <p className="text-xs text-neutral-200">源点</p>
                  <p className="text-sm font-bold font-mono text-accent-green mt-1">
                    {sample.nodes.find((n) => n.id === sample.source)?.label ?? sample.source}
                  </p>
                </div>
                <div className="bg-deep-800/60 rounded-lg p-3 text-center border border-accent-amber/30">
                  <p className="text-xs text-neutral-200">汇点</p>
                  <p className="text-sm font-bold font-mono text-accent-amber mt-1">
                    {sample.nodes.find((n) => n.id === sample.sink)?.label ?? sample.sink}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="边列表" icon={<List size={16} />}>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-neutral-200 border-b border-deep-600/50">
                      <th className="text-left py-2 px-1 font-medium">From</th>
                      <th className="text-left py-2 px-1 font-medium">To</th>
                      <th className="text-right py-2 px-1 font-medium">Cap</th>
                      <th className="text-right py-2 px-1 font-medium">Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sample.edges.map((e) => {
                      const fromNode = sample.nodes.find((n) => n.id === e.from);
                      const toNode = sample.nodes.find((n) => n.id === e.to);
                      return (
                        <tr
                          key={e.id}
                          className={`border-b border-deep-700/50 ${
                            e.isBottleneck ? 'bg-accent-red/10' : ''
                          }`}
                        >
                          <td className="py-2 px-1 font-mono">
                            <span className={e.isBottleneck ? 'text-accent-red font-semibold' : 'text-neutral-100'}>
                              {fromNode?.label ?? e.from}
                            </span>
                          </td>
                          <td className="py-2 px-1 font-mono">
                            <span className={e.isBottleneck ? 'text-accent-red font-semibold' : 'text-neutral-100'}>
                              {toNode?.label ?? e.to}
                            </span>
                          </td>
                          <td
                            className={`py-2 px-1 text-right font-mono ${
                              e.isBottleneck ? 'text-accent-red font-semibold' : 'text-neutral-200'
                            }`}
                          >
                            {e.capacity}
                          </td>
                          <td
                            className={`py-2 px-1 text-right font-mono ${
                              e.isBottleneck ? 'text-accent-red font-semibold' : 'text-neutral-100'
                            }`}
                          >
                            {e.flow}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="快捷操作" icon={<ArrowRightLeft size={16} />}>
              <div className="space-y-3">
                <PrimaryButton
                  variant="primary"
                  className="w-full justify-center"
                  icon={<Check size={16} />}
                  disabled={sample.reviewStatus === 'approved'}
                  onClick={() => setReviewStatus(sample.id, 'approved')}
                >
                  复核通过
                </PrimaryButton>
                <PrimaryButton
                  variant="danger"
                  className="w-full justify-center"
                  icon={<X size={16} />}
                  disabled={sample.reviewStatus === 'rejected'}
                  onClick={() => setReviewStatus(sample.id, 'rejected')}
                >
                  打回复核
                </PrimaryButton>
                {sample.reviewComment && (
                  <div className="mt-3 p-3 rounded-lg bg-deep-800/60 border border-deep-600/50">
                    <p className="text-xs text-neutral-200 mb-1">复核备注</p>
                    <p className="text-sm text-neutral-100">{sample.reviewComment}</p>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
