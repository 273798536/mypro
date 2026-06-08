import type { CageStatus } from '@/types';

const items: { status: CageStatus; label: string; color: string; desc: string }[] = [
  { status: 'normal', label: '正常', color: '#22c55e', desc: '排布合规、坐标无异常' },
  { status: 'pending', label: '待确认', color: '#f59e0b', desc: '需甲方或工程师进一步确认' },
  { status: 'error', label: '异常', color: '#ef4444', desc: '越界、漂浮或数据错误' },
];

export default function Legend() {
  return (
    <div className="absolute top-4 right-4 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-lg px-4 py-3 text-slate-100 shadow-xl">
      <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">颜色图例</div>
      <div className="flex flex-col gap-2">
        {items.map((it) => (
          <div key={it.status} className="flex items-center gap-3">
            <span
              className="inline-block w-4 h-4 rounded-sm border border-white/20"
              style={{ background: it.color }}
            />
            <div className="leading-tight">
              <div className="text-sm font-medium">{it.label}</div>
              <div className="text-[11px] text-slate-400">{it.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
