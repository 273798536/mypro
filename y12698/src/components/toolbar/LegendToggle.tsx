import { X, Thermometer, Waves, Layers, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useReviewStore } from '../../store/reviewStore';

const legendGroups = [
  {
    title: '温度',
    icon: Thermometer,
    items: [
      { color: '#FF4757', label: '越界 (>380℃)', desc: '超出阈值上限' },
      { color: '#FF6B35', label: '高温黑烟 (300~380℃)', desc: '典型黑烟囱喷口' },
      { color: '#FFA94D', label: '中温 (100~300℃)', desc: '扩散流区' },
      { color: '#4DABF7', label: '低温 (<100℃)', desc: '背景海水环境' },
    ],
  },
  {
    title: '流速',
    icon: Waves,
    items: [
      { color: '#FF4757', label: '越界 (>5.0 m/s)', desc: '异常高速喷流' },
      { color: '#00D4AA', label: '正常 (0.1~5.0 m/s)', desc: '在阈值范围内' },
    ],
  },
  {
    title: '评审状态',
    icon: Layers,
    items: [
      { color: '#00D4AA', label: '已通过', desc: '评审确认', Icon: CheckCircle2 },
      { color: '#FFD93D', label: '有异议/重复', desc: '待进一步确认', Icon: AlertTriangle },
      { color: '#748ffc', label: '待复核', desc: '初始导入', Icon: Clock },
    ],
  },
];

export default function LegendPanel() {
  const show = useReviewStore((s) => s.showLegend);
  const toggle = useReviewStore((s) => s.toggleLegend);

  if (!show) return null;

  return (
    <div className="absolute right-2 top-2 z-20 w-64 overflow-hidden rounded-lg border border-slate-700 bg-slate-950/90 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-900/70 px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">颜色图例</span>
        <button
          onClick={toggle}
          className="ml-auto rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <X size={13} />
        </button>
      </div>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
        {legendGroups.map((g) => (
          <div key={g.title}>
            <div className="mb-1.5 flex items-center gap-1.5">
              <g.icon size={11} className="text-[#00D4AA]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                {g.title}
              </span>
            </div>
            <div className="space-y-1 pl-1">
              {g.items.map((item) => {
                const ItemIcon = (item as any).Icon;
                return (
                  <div key={item.label} className="flex items-center gap-2">
                    <div
                      className="flex h-4 w-4 items-center justify-center rounded-sm"
                      style={{ backgroundColor: item.color }}
                    >
                      {ItemIcon && <ItemIcon size={9} className="text-slate-950" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-300">{item.label}</p>
                      <p className="text-[9px] text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
