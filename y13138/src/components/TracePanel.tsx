import { ChevronDown, ChevronRight, GitBranch, FileText, Circle, Calculator } from 'lucide-react';
import { useTraceStore } from '@/store/traceStore';
import { useChartStore } from '@/store/chartStore';
import { useParamStore } from '@/store/paramStore';
import { useEffect } from 'react';
import EvidenceBoard from './EvidenceBoard';

const stepTypeConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  node: { icon: Circle, color: 'text-abnormal-brick', bg: 'bg-abnormal-brick/10 border-abnormal-brick/50' },
  param: { icon: GitBranch, color: 'text-academic-navy', bg: 'bg-academic-navy/10 border-academic-navy/50' },
  record: { icon: FileText, color: 'text-late-ochre', bg: 'bg-late-ochre/10 border-late-ochre/50' },
  calc: { icon: Calculator, color: 'text-success-ink', bg: 'bg-success-ink/10 border-success-ink/50' },
};

function TraceStepView({ step, depth = 0 }: { step: any; depth?: number }) {
  const { toggleStepExpand } = useTraceStore();
  const cfg = stepTypeConfig[step.stepType] || stepTypeConfig.param;
  const Icon = cfg.icon;
  return (
    <div className="relative pl-8">
      {depth === 0 && <div className="timeline-line" />}
      <div
        className={`relative mb-2.5 ml-2 panel-card rounded-sm ${cfg.bg} border p-2.5 transition-all animate-slide-up`}
        style={{ animationDelay: `${depth * 40}ms` }}
      >
        <div
          className={`absolute -left-[18px] top-2.5 w-7 h-7 rounded-full flex items-center justify-center ${cfg.bg} border ${cfg.color}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div
          className="flex items-start justify-between cursor-pointer select-none"
          onClick={() => toggleStepExpand(step.id)}
        >
          <div className="flex-1 pr-2">
            <div className={`text-[12px] font-serif font-semibold ${cfg.color}`}>
              {step.title}
            </div>
            {step.refId && (
              <div className="text-[10px] mono text-academic-navy/50 mt-0.5">
                引用ID: {step.refId}
              </div>
            )}
          </div>
          {step.expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-academic-navy/50 flex-shrink-0 mt-1" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-academic-navy/50 flex-shrink-0 mt-1" />
          )}
        </div>

        {step.expanded && (
          <div className="mt-2 pt-2 border-t border-black/5 whitespace-pre-wrap text-[11px] leading-relaxed text-academic-navy/85 mono">
            {step.content}
          </div>
        )}
      </div>

      {step.children && step.children.length > 0 && step.expanded && (
        <div className="ml-2">
          {step.children.map((c: any) => (
            <TraceStepView key={c.id} step={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TracePanel() {
  const { rightTab, setRightTab, steps, activeNodeId, buildTraceFromNode } = useTraceStore();
  const selectedNodeId = useChartStore((s) => s.selectedNodeId);
  const nodes = useChartStore((s) => s.nodes);
  const paramRows = useParamStore((s) => s.groups[s.activeGroupId].rows);

  useEffect(() => {
    if (steps.length === 0 && selectedNodeId) {
      buildTraceFromNode(selectedNodeId, nodes, paramRows);
    }
  }, [selectedNodeId, nodes, paramRows, steps.length, buildTraceFromNode]);

  return (
    <aside className="w-[360px] flex-shrink-0 border-l border-academic-navy/15 flex flex-col bg-white">
      <div className="flex border-b border-academic-navy/15 bg-academic-paper-dark/50">
        <button
          onClick={() => setRightTab('trace')}
          className={`flex-1 px-3 py-2.5 font-serif text-sm transition-all ${
            rightTab === 'trace' ? 'tab-active' : 'tab-inactive'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            溯源链路
          </div>
        </button>
        <button
          onClick={() => setRightTab('evidence')}
          className={`flex-1 px-3 py-2.5 font-serif text-sm transition-all ${
            rightTab === 'evidence' ? 'tab-active' : 'tab-inactive'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            证据追踪
          </div>
        </button>
      </div>

      {rightTab === 'trace' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-academic-navy/10 bg-academic-paper/60">
            <div className="text-[10px] mono text-academic-navy/60">
              溯源方向：异常点 → 参数表原文 → 原始材料 → 计算过程
            </div>
            <div className="font-serif text-[12px] text-academic-navy mt-0.5">
              {activeNodeId
                ? `当前追踪节点：${activeNodeId}（点击图表其他节点可切换）`
                : '👈 点击左图任意节点，自动生成溯源链路'}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scroll px-3 py-3">
            {steps.length === 0 ? (
              <div className="text-center py-12 text-academic-navy/50 text-sm font-serif">
                <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div>未选择节点</div>
                <div className="text-xs mt-1 mono">在中间图表区点击节点开始追踪</div>
              </div>
            ) : (
              steps.map((s) => <TraceStepView key={s.id} step={s} />)
            )}
          </div>
        </div>
      ) : (
        <EvidenceBoard />
      )}
    </aside>
  );
}
