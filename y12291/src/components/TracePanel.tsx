import { ChevronRight, ArrowDown } from 'lucide-react';
import { useBlochSphereStore } from '@/store/blochSphereStore';
import type { TraceLink, QuantumState } from '@/types/quantum';
import { cn } from '@/lib/utils';

const CYN = '#00e5ff';
const AMB = '#ffb300';

function isAnomalyLink(link: TraceLink, state: QuantumState): boolean {
  const issues = state.validationStatus.issues.filter((i) => i.resolvedAt === null);
  return issues.some(
    (i) =>
      (link.relation === 'parameter-to-result' && i.relatedField !== 'measurementBasis') ||
      (link.relation === 'result-to-basis' && i.type === 'BASIS_CONFUSION')
  );
}

function TraceNode({
  label,
  detail,
  color,
  onClick,
}: {
  label: string;
  detail: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border p-3 transition-colors',
        'bg-[#0f1629] hover:bg-[#151d35]'
      )}
      style={{ borderColor: color + '40' }}
    >
      <div className="text-xs font-medium mb-0.5" style={{ color }}>
        {label}
      </div>
      <div className="text-sm text-gray-300 truncate">{detail}</div>
    </button>
  );
}

function ArrowConnector({ color }: { color: string }) {
  return (
    <div className="flex flex-col items-center py-0.5">
      <div className="w-px h-3" style={{ backgroundColor: color }} />
      <ArrowDown className="h-3.5 w-3.5" style={{ color }} />
    </div>
  );
}

function TraceChain({
  title,
  links,
  state,
  direction,
}: {
  title: string;
  links: TraceLink[];
  state: QuantumState;
  direction: 'forward' | 'backward';
}) {
  if (links.length === 0) return null;

  const ordered = direction === 'forward' ? links : [...links].reverse();

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <ChevronRight
          className={cn('h-4 w-4', direction === 'backward' && 'rotate-180')}
          style={{ color: CYN }}
        />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="flex flex-col items-stretch">
        {ordered.map((link, i) => {
          const anom = isAnomalyLink(link, state);
          const color = anom ? AMB : CYN;

          let nodeLabel: string;
          let nodeDetail: string;
          if (link.relation === 'parameter-to-result') {
            nodeLabel = '量子态参数';
            nodeDetail = link.label;
          } else if (link.relation === 'result-to-basis') {
            nodeLabel = '测量基';
            nodeDetail = link.label;
          } else {
            nodeLabel = '测量结果反查';
            nodeDetail = link.label;
          }

          return (
            <div key={`${link.from}-${link.to}-${i}`}>
              <TraceNode label={nodeLabel} detail={nodeDetail} color={color} />
              {i < ordered.length - 1 && <ArrowConnector color={color} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TracePanel() {
  const quantumStates = useBlochSphereStore((s) => s.quantumStates);
  const selectedStateId = useBlochSphereStore((s) => s.selectedStateId);
  const getTraceForward = useBlochSphereStore((s) => s.getTraceForward);
  const getTraceBackward = useBlochSphereStore((s) => s.getTraceBackward);

  if (!selectedStateId || !quantumStates[selectedStateId]) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        请选择一个量子态查看追溯链路
      </div>
    );
  }

  const state = quantumStates[selectedStateId];
  const forwardLinks = getTraceForward(selectedStateId);
  const backwardLinks = getTraceBackward(selectedStateId);

  return (
    <div className="p-3 space-y-2">
      <div className="text-sm font-medium text-gray-300 mb-1">
        追溯链路 · <span style={{ color: CYN }}>{state.label}</span>
      </div>
      <TraceChain title="正向追溯" links={forwardLinks} state={state} direction="forward" />
      <TraceChain title="反向追溯" links={backwardLinks} state={state} direction="backward" />
      {forwardLinks.length === 0 && backwardLinks.length === 0 && (
        <div className="text-xs text-gray-500">当前量子态无追溯数据</div>
      )}
    </div>
  );
}
