import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function AlertBar() {
  const pending = useAppStore((s) => s.pendingConfirmation);
  const missing = useAppStore((s) => s.missingUnitProblems);
  const problems = useAppStore((s) => s.problems);
  const nodes = useAppStore((s) => s.nodes);
  const confirmUnits = useAppStore((s) => s.confirmUnits);

  if (!pending) return null;

  const missingProblems = problems.filter((p) => missing.includes(p.id));
  const involvedNodes = new Set<string>();
  missingProblems.forEach((p) => {
    involvedNodes.add(p.start);
    involvedNodes.add(p.end);
  });
  const nodeLabels = [...involvedNodes]
    .map((id) => nodes.find((n) => n.id === id)?.label ?? id)
    .join('、');

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-ochre-700 via-ochre-500 to-ochre-700 px-6 py-4 text-white shadow-card animate-fadeSlideUp">
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #fff 0 2px, transparent 2px 12px)',
        }}
      />
      <div className="relative flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
          <AlertTriangle className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <div className="font-display text-[15px]">
            待确认：题目清单存在单位 / 距离缺失，计算暂挂起
          </div>
          <div className="mt-1 text-[12.5px] text-white/90">
            <span className="font-mono-data">共 {missing.length} 条</span> 题目未填单位，涉及节点&nbsp;
            <span className="font-mono-data">{nodeLabels}</span>。
            若继续将默认单位设为 km，相关节点权重保持现状；请老叶确认口径是否一致。
          </div>
        </div>
        <button
          onClick={confirmUnits}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[13px] font-medium text-ochre-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
        >
          确认后继续计算
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
