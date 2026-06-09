import { useState } from 'react';
import { useStore } from '@/store';
import { PrimaryButton, SectionCard, ExplanationBox } from '@/components/Badges';
import FlowGraph from '@/components/FlowGraph';
import type { DraftData, FlowNode, FlowEdge } from '@/types';
import { cn } from '@/lib/utils';

function formatTimeAgo(isoString: string): string {
  const now = Date.now();
  const past = new Date(isoString).getTime();
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return '刚刚到达';
  if (diffMins < 60) return `${diffMins}分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}小时前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}天前`;
}

interface DiffStats {
  addedNodes: number;
  removedNodes: number;
  changedEdges: number;
}

function computeDiffStats(originalNodes: FlowNode[], originalEdges: FlowEdge[], draftNodes: FlowNode[], draftEdges: FlowEdge[]): DiffStats {
  const originalNodeIds = new Set(originalNodes.map((n) => n.id));
  const draftNodeIds = new Set(draftNodes.map((n) => n.id));
  const addedNodes = [...draftNodeIds].filter((id) => !originalNodeIds.has(id)).length;
  const removedNodes = [...originalNodeIds].filter((id) => !draftNodeIds.has(id)).length;

  const originalEdgeMap = new Map(originalEdges.map((e) => [e.id, e]));
  let changedEdges = 0;
  for (const de of draftEdges) {
    const oe = originalEdgeMap.get(de.id);
    if (!oe || oe.capacity !== de.capacity || oe.flow !== de.flow || oe.from !== de.from || oe.to !== de.to) {
      changedEdges++;
    }
  }
  const draftEdgeIds = new Set(draftEdges.map((e) => e.id));
  for (const oe of originalEdges) {
    if (!draftEdgeIds.has(oe.id)) changedEdges++;
  }

  return { addedNodes, removedNodes, changedEdges };
}

interface DraftCardProps {
  draft: DraftData;
}

function DraftCard({ draft }: DraftCardProps) {
  const [expanded, setExpanded] = useState(false);
  const getSampleById = useStore((s) => s.getSampleById);
  const applyDraftToSample = useStore((s) => s.applyDraftToSample);
  const dismissDraft = useStore((s) => s.dismissDraft);

  const sample = getSampleById(draft.sampleId);
  const originalNodes = sample?.nodes ?? [];
  const originalEdges = sample?.edges ?? [];
  const stats = computeDiffStats(originalNodes, originalEdges, draft.nodes, draft.edges);

  return (
    <div className="glass-panel rounded-xl overflow-hidden animate-fade-in">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-xs text-accent-cyan">{draft.id}</span>
              <span className="text-xs text-neutral-400">· {formatTimeAgo(draft.arrivedAt)}</span>
            </div>
            <a
              href={`/sample/${draft.sampleId}`}
              className="text-base font-semibold text-neutral-50 hover:text-accent-cyan transition-colors"
            >
              {draft.sampleName}
            </a>
          </div>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-deep-800/60 border border-deep-600/40">
          <div className="text-xs font-mono text-neutral-400 mb-1.5">// 差异摘要</div>
          <p className="text-sm text-neutral-100 leading-relaxed">{draft.diffSummary}</p>
        </div>

        {draft.impacts.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-mono text-neutral-400 mb-2">受影响结论</div>
            <div className="flex flex-wrap gap-2">
              {draft.impacts.map((impact, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-accent-amber/15 text-accent-amber border border-accent-amber/30"
                >
                  ⚠ {impact}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-green/10 border border-accent-green/25">
            <span className="text-xs text-accent-green">+{stats.addedNodes} 节点</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-red/10 border border-accent-red/25">
            <span className="text-xs text-accent-red">-{stats.removedNodes} 节点</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-cyan/10 border border-accent-cyan/25">
            <span className="text-xs text-accent-cyan">~{stats.changedEdges} 边变更</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PrimaryButton variant="ghost" onClick={() => setExpanded(!expanded)}>
            {expanded ? '收起对比' : '查看新旧对比'}
          </PrimaryButton>
          <PrimaryButton onClick={() => applyDraftToSample(draft.id)}>应用草稿</PrimaryButton>
          <PrimaryButton variant="ghost" onClick={() => dismissDraft(draft.id)}>
            忽略草稿
          </PrimaryButton>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-200/10 animate-fade-in">
          <div className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm text-neutral-300 font-semibold">旧结论</span>
                  <span className="text-xs text-neutral-500">原始数据</span>
                </div>
                {sample?.explanation ? (
                  <ExplanationBox summary={sample.explanation.summary}>
                    <div className="mt-3 pt-3 border-t border-deep-600/40">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-neutral-400">最大流: </span>
                          <span className="text-neutral-100 font-mono">{sample.explanation.maxFlow}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400">瓶颈值: </span>
                          <span className="text-accent-amber font-mono">{sample.explanation.bottleneckValue}</span>
                        </div>
                      </div>
                    </div>
                  </ExplanationBox>
                ) : (
                  <div className="p-4 rounded-lg bg-deep-800/60 border border-deep-600/40 text-sm text-neutral-400">
                    暂无结论
                  </div>
                )}
                <div className="mt-3">
                  <FlowGraph nodes={originalNodes} edges={originalEdges} width={560} height={320} />
                </div>
              </div>

              <div className="lg:border-l lg:border-neutral-200/10 lg:pl-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm text-accent-cyan font-semibold">新结论预览</span>
                  <span className="text-xs text-neutral-500">草稿数据</span>
                </div>
                <div className="p-4 rounded-lg bg-deep-800/60 border border-accent-cyan/25">
                  <div className="flex items-start gap-2">
                    <span className="text-accent-cyan font-mono text-xs mt-0.5">// 预览</span>
                    <p className="text-sm font-medium text-neutral-50 leading-relaxed">
                      应用草稿后将自动重新计算
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-deep-600/40">
                    <p className="text-xs text-neutral-400">
                      瓶颈位置、最大流数值等结论将基于草稿数据重新生成
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <FlowGraph nodes={draft.nodes} edges={draft.edges} width={560} height={320} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DraftManager() {
  const drafts = useStore((s) => s.drafts);

  if (drafts.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-50 mb-2">草稿增量管理</h1>
          <p className="text-sm text-neutral-400">晚到的计算草稿不会自动覆盖原结论，需人工审核后应用</p>
        </div>
        <SectionCard title="待审核草稿" className={cn('')}>
          <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-deep-700/50 border border-deep-600/50 flex items-center justify-center mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">暂无待审核草稿</h3>
            <p className="text-sm text-neutral-400">当有晚到的增量数据到达时，将在此处显示供人工审核</p>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-50 mb-2">草稿增量管理</h1>
        <p className="text-sm text-neutral-400">晚到的计算草稿不会自动覆盖原结论，需人工审核后应用</p>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-accent-amber/20 text-accent-amber border border-accent-amber/40">
          {drafts.length} 份待审核
        </span>
      </div>

      <div className="space-y-4">
        {drafts.map((draft) => (
          <DraftCard key={draft.id} draft={draft} />
        ))}
      </div>
    </div>
  );
}
