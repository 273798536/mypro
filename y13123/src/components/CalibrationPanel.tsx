import { Ruler, Hash, Cpu, Scale, User } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

function Row({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-ink-900/5">
      <Icon
        className={`h-3.5 w-3.5 ${highlight ? 'text-gold-900' : 'text-slateData-500'}`}
      />
      <span className="text-[11.5px] text-slateData-500">{label}</span>
      <span
        className={`ml-auto font-mono-data text-[12px] ${
          highlight ? 'text-gold-900 font-semibold' : 'text-ink-900'
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

  return (
    <div
      className="paper-card mt-4 rounded-xl p-4 animate-fadeSlideUp"
      style={{ animationDelay: '200ms' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-[14px] text-ink-900">本次计算口径</h3>
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
        <Row icon={Scale} label="权重规则" value={v.weightRule} />
        <Row icon={Hash} label="节点/边" value={`${v.nodeCount} / ${v.edgeCount}`} />
        <Row icon={User} label="操作人" value={v.operator} />
      </div>
      {selected && (
        <div className="mt-2 rounded-md border border-gold-700/30 bg-gold-900/5 px-3 py-1.5 text-[11.5px] text-gold-900 animate-fadeSlideUp">
          已联动节点 <span className="font-mono-data font-semibold">{selected}</span>，请对照左侧题目清单与上方图表复核权重是否一致。
        </div>
      )}
    </div>
  );
}
