import { Hash, Cpu, Scale, User, Route, Ruler } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

function Row({
  icon: Icon,
  label,
  value,
  highlight,
  flash,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
  flash?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
        flash && 'animate-flashHighlight',
        highlight && 'bg-gold-900/5'
      )}
    >
      <Icon
        className={`h-3.5 w-3.5 ${highlight ? 'text-gold-900' : 'text-slateData-500'}`}
      />
      <span className="text-[11.5px] text-slateData-500">{label}</span>
      <span
        className={`ml-auto font-mono-data text-[12px] ${
          highlight ? 'font-semibold text-gold-900' : 'text-ink-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function CalibrationPanel() {
  const v = useAppStore((s) => s.paramVersion);
  const selected = useAppStore((s) => s.selectedNodeId);
  const shortestPath = useAppStore((s) => s.shortestPath);
  const shortestDistance = useAppStore((s) => s.shortestDistance);
  const pending = useAppStore((s) => s.pendingConfirmation);
  const selectedProblem = useAppStore((s) => s.selectedProblemId);
  const problems = useAppStore((s) => s.problems);

  const curProblem = problems.find((p) => p.id === selectedProblem);

  return (
    <div
      className="paper-card mt-4 rounded-xl p-4 animate-fadeSlideUp"
      style={{ animationDelay: '200ms' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-[14px] text-ink-900">
          本次计算口径
        </h3>
        <div className="stamp inline-flex h-11 w-11 items-center justify-center rounded-full bg-paper-50">
          <div className="flex flex-col items-center leading-none">
            <span className="font-display text-[10px] text-ink-900">PARAM</span>
            <span className="font-mono-data text-[11px] font-bold text-ink-900">
              {v.version}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-2 divide-y divide-gold-700/15">
        <Row icon={Hash} label="参数版本" value={v.version} highlight />
        <Row icon={Ruler} label="时间戳" value={v.timestamp.slice(5)} highlight />
        <Row icon={Cpu} label="算法类型" value={v.algorithm} />
        <Row icon={Scale} label="权重规则" value="正权/无向" />
        <Row icon={Hash} label="节点/边" value={`${v.nodeCount} / ${v.edgeCount}`} />
        <Row icon={User} label="操作人" value={v.operator.slice(0, 3)} />
      </div>

      {!pending && shortestPath && curProblem && (
        <div className="mt-2.5 rounded-md border border-gold-700/30 bg-gold-900/5 px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] text-gold-900">
            <Route className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">当前路径结果</span>
          </div>
          <div className="mt-1 font-mono-data text-[12.5px] text-ink-900">
            {shortestPath.join(' → ')}
          </div>
          <div className="text-[11.5px] text-slateData-700">
            总长度：
            <span className="font-mono-data font-semibold text-gold-900">
              {shortestDistance} {curProblem.unit || 'km'}
            </span>
          </div>
        </div>
      )}

      {selected && !pending && (
        <div className="mt-2 rounded-md border border-ink-900/20 bg-ink-900/5 px-3 py-1.5 text-[11.5px] text-ink-900 animate-fadeSlideUp">
          已联动节点{' '}
          <span className="font-mono-data font-semibold">{selected}</span>
          ，请对照左侧题目清单与上方图表复核权重是否一致。
        </div>
      )}
    </div>
  );
}
