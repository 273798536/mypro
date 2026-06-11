import { AlertOctagon, Undo2, StickyNote, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';
import { severityLabel, formatDate, typeLabel } from '@/utils/helpers';

type Section = 'overlaps' | 'withdrawn' | 'supplements';

export default function IsolationPanel() {
  const overlaps = useAppStore(s => s.overlaps);
  const points = useAppStore(s => s.points);
  const locate = useAppStore(s => s.locatePointOnCanvas);
  const withdrawn = points.filter(p => p.withdrawn);
  const withSupplements = points.filter(p => p.supplements.length > 0);

  return (
    <div className="w-[220px] flex-shrink-0 h-full bg-slate-900/50 border-r border-cold-border flex flex-col">
      <div className="px-3 py-2.5 border-b border-cold-border">
        <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-cold-danger" />
          异常记录隔离区
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">单独拎出 · 不混入正常结果</div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <SectionHeader
          id="overlaps"
          icon={<MapPin className="w-3 h-3" />}
          title="对象重叠"
          count={overlaps.length}
          countClass="text-cold-danger"
        >
          {overlaps.length === 0 ? (
            <div className="px-3 py-4 text-[10px] text-slate-500 text-center">暂无重叠检测</div>
          ) : (
            <div className="px-2 py-1 space-y-1.5">
              {overlaps.map(o => (
                <button
                  key={o.pointIds.join('-')}
                  onClick={() => locate(o.pointIds[0])}
                  className="w-full text-left p-2 rounded-[2px] bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono-data text-[10px] text-slate-200">
                      {o.pointIds[0]} ↔ {o.pointIds[1]}
                    </span>
                    <span className={`chip border py-0 ${severityLabel[o.severity].className}`}>
                      {severityLabel[o.severity].text}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    距离 {o.distance}px <span className="text-slate-600">/阈值{o.threshold}px</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionHeader>

        <SectionHeader
          id="withdrawn"
          icon={<Undo2 className="w-3 h-3" />}
          title="撤回记录"
          count={withdrawn.length}
          countClass="text-slate-400"
        >
          {withdrawn.length === 0 ? (
            <div className="px-3 py-4 text-[10px] text-slate-500 text-center">暂无撤回</div>
          ) : (
            <div className="px-2 py-1 space-y-1.5">
              {withdrawn.map(p => (
                <button
                  key={p.id}
                  onClick={() => locate(p.id)}
                  className="w-full text-left p-2 rounded-[2px] bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/40 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono-data text-[10px] text-slate-400 line-through">{p.id}</span>
                    <span className="chip chip-idle !py-0">已撤回</span>
                  </div>
                  <div className="text-[10px] text-slate-500 line-clamp-2">
                    {p.withdrawalInfo?.reason}
                  </div>
                  {p.withdrawalInfo && (
                    <div className="text-[9px] text-slate-600 mt-1 font-mono-data">
                      {p.withdrawalInfo.operator} · {formatDate(p.withdrawalInfo.timestamp)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </SectionHeader>

        <SectionHeader
          id="supplements"
          icon={<StickyNote className="w-3 h-3" />}
          title="后补说明"
          count={withSupplements.reduce((s, p) => s + p.supplements.length, 0)}
          countClass="text-cold-warning"
        >
          {withSupplements.length === 0 ? (
            <div className="px-3 py-4 text-[10px] text-slate-500 text-center">暂无补充</div>
          ) : (
            <div className="px-2 py-1 space-y-1.5">
              {withSupplements.flatMap(p =>
                p.supplements.map(sup => (
                  <button
                    key={`${p.id}-${sup.id}`}
                    onClick={() => locate(p.id)}
                    className="w-full text-left p-2 rounded-[2px] bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/25 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-data text-[10px] text-amber-400">
                        {p.id} · {typeLabel[p.type]}
                      </span>
                      <span className="text-[9px] text-amber-600 border border-amber-500/30 px-1 rounded-[1px]">补</span>
                    </div>
                    <div className="text-[10px] text-amber-200/80 line-clamp-2">{sup.content}</div>
                    <div className="text-[9px] text-amber-700/80 mt-1 font-mono-data">
                      {sup.operator} · {formatDate(sup.timestamp)}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </SectionHeader>
      </div>
    </div>
  );
}

function SectionHeader({
  id, icon, title, count, countClass, children,
}: {
  id: Section;
  icon: React.ReactNode;
  title: string;
  count: number;
  countClass: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-cold-border/60 last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 flex items-center gap-2 bg-slate-800/30 hover:bg-slate-800/50 transition"
      >
        {open ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
        <span className={`${countClass}`}>{icon}</span>
        <span className="text-[11px] text-slate-300 flex-1 text-left">{title}</span>
        <span className={`text-[10px] font-mono-data ${countClass}`}>{count}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
