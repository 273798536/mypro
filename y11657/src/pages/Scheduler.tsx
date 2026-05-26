import { useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { AlertTriangle, Gauge, Play, Snowflake, Trash2, Plus } from 'lucide-react';
import { minutesToLabel } from '@/utils/importExport';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { simulate } from '@/engine/simulator';

const TOTAL_MIN = 24 * 60;
const ROW_HEIGHT = 56;

export default function SchedulerPage() {
  const { materials, updateDefrost, removeDefrost, addDefrost, runSimulation } = useGameStore();
  const { evaporators, zones, tasks, defrostSlots, tempLayers } = materials;

  const sim = useMemo(() => simulate(materials), [materials]);
  const alerts = sim.alerts;

  const currentTemps = useMemo(() => {
    const latest: Record<string, number> = {};
    sim.temperatureSeries.forEach((p) => {
      latest[p.zoneId] = p.temperature;
    });
    return latest;
  }, [sim]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-wider">排程竞技</h1>
          <p className="text-white/60 text-sm mt-1">
            拖拽或点击调整除霜时段；实时查看温度曲线、出库冲突与告警。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-ghost flex items-center gap-2"
            onClick={() => {
              addDefrost({
                id: `d-${Date.now()}`,
                evaporatorId: evaporators[0]?.id ?? 'e1',
                start: 8 * 60,
                end: 8 * 60 + 20,
                status: 'planned',
              });
            }}
          >
            <Plus size={14} /> 新增除霜
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={runSimulation}>
            <Play size={14} /> 运行评分
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-3 space-y-4">
          <div className="card p-4">
            <div className="text-xs text-white/50 mb-2">当前温层温度</div>
            {zones.map((z) => {
              const temp = currentTemps[z.id] ?? z.targetTemp;
              const layer = tempLayers.find((l) => l.zoneId === z.id);
              const over = layer && temp > layer.tempCeiling;
              return (
                <div key={z.id} className="mb-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/80">{z.name}</span>
                    <span className={`font-display ${over ? 'text-red-400 alert-pulse px-2 rounded' : 'text-emerald-300'}`}>
                      {temp.toFixed(2)}℃
                    </span>
                  </div>
                  <div className="text-[10px] text-white/40">
                    目标 {z.targetTemp}℃ · 阈值 {layer?.tempCeiling ?? '-'}℃
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card p-4">
            <div className="text-xs text-white/50 mb-2 flex items-center gap-1">
              <Gauge size={12} /> 蒸发器列表
            </div>
            {evaporators.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm py-1">
                <div>
                  <div className="text-white/80">{e.name}</div>
                  <div className="text-[10px] text-white/40">{zones.find((z) => z.id === e.zoneId)?.name}</div>
                </div>
                <div className="text-xs text-white/60">标准 {e.defrostDurationMin}分</div>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <div className="text-xs text-white/50 mb-2">出入库任务</div>
            {tasks.map((t) => {
              const related = defrostSlots.filter((s) => {
                const e = evaporators.find((ev) => ev.id === s.evaporatorId);
                return e?.zoneId === t.zoneId;
              });
              const overlaps = related.some((s) => s.end > t.scheduledStart && s.start < t.scheduledEnd);
              return (
                <div key={t.id} className={`mb-2 p-2 rounded border ${overlaps ? 'border-red-400/60 bg-red-500/10' : 'border-white/10 bg-white/5'}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/80">
                      {t.type === 'out' ? '出库' : '入库'} · {zones.find((z) => z.id === t.zoneId)?.name}
                    </span>
                    {overlaps && <AlertTriangle size={14} className="text-red-400 alert-pulse" />}
                  </div>
                  <div className="text-[10px] text-white/50">
                    {minutesToLabel(t.scheduledStart)} - {minutesToLabel(t.scheduledEnd)} · 延误 -{t.penaltyPerMin}/分
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="col-span-9 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-white/70">24 小时除霜排程</div>
              <div className="text-xs text-white/50">拖拽移动，右侧边缘可拉伸</div>
            </div>
            <Timeline
              evaporators={evaporators}
              slots={defrostSlots}
              tasks={tasks}
              onUpdate={updateDefrost}
              onRemove={removeDefrost}
            />
          </div>

          <div className="card p-4">
            <div className="text-sm text-white/70 mb-2">温层温度曲线</div>
            <TemperatureChart zones={zones} tempLayers={tempLayers} series={sim.temperatureSeries} />
          </div>

          {alerts.length > 0 && (
            <div className="card p-4 border-red-500/40">
              <div className="flex items-center gap-2 mb-2 text-red-400">
                <AlertTriangle size={16} className="alert-pulse" />
                <span className="font-semibold">告警（{alerts.length}）</span>
              </div>
              <div className="space-y-1 max-h-40 scroll-y">
                {alerts.slice(0, 50).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-white/80 p-2 bg-red-500/10 rounded">
                    <span className="text-white/50 w-12">{minutesToLabel(a.time)}</span>
                    <span className="w-14 text-red-300 font-semibold">
                      {a.type === 'overtime' ? '超时' : a.type === 'temp' ? '越阈' : '延误'}
                    </span>
                    <span>{a.message}</span>
                  </div>
                ))}
                {alerts.length > 50 && (
                  <div className="text-xs text-white/40">...还有 {alerts.length - 50} 条告警</div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Timeline({
  evaporators,
  slots,
  tasks,
  onUpdate,
  onRemove,
}: {
  evaporators: any[];
  slots: any[];
  tasks: any[];
  onUpdate: (id: string, patch: any) => void;
  onRemove: (id: string) => void;
}) {
  const [drag, setDrag] = useState<{ id: string; mode: 'move' | 'resize' | null; startX: number; slotStart: number; slotEnd: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const pxPerMin = 1000 / TOTAL_MIN;

  const onPointerDown = (e: React.PointerEvent, slot: any, mode: 'move' | 'resize') => {
    e.stopPropagation();
    setDrag({ id: slot.id, mode, startX: e.clientX, slotStart: slot.start, slotEnd: slot.end });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const deltaMin = Math.round(dx / pxPerMin);
    if (drag.mode === 'move') {
      const newStart = Math.max(0, Math.min(TOTAL_MIN - (drag.slotEnd - drag.slotStart), drag.slotStart + deltaMin));
      const dur = drag.slotEnd - drag.slotStart;
      onUpdate(drag.id, { start: newStart, end: newStart + dur });
    } else if (drag.mode === 'resize') {
      const newEnd = Math.max(drag.slotStart + 5, Math.min(TOTAL_MIN, drag.slotEnd + deltaMin));
      onUpdate(drag.id, { end: newEnd });
    }
  };

  const onPointerUp = () => setDrag(null);

  return (
    <div
      ref={trackRef}
      className="relative select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="grid" style={{ gridTemplateColumns: '120px 1fr', gap: 8 }}>
        <div />
        <div className="relative" style={{ height: 22 }}>
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="absolute text-[10px] text-white/40" style={{ left: `${(i / 24) * 100}%`, transform: 'translateX(-50%)' }}>
              {i.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '120px 1fr', gap: 8 }}>
        <div />
        <div className="relative h-6 border-l border-white/10">
          {tasks.map((t) => (
            <div
              key={t.id}
              className={`absolute top-0 bottom-0 ${t.type === 'out' ? 'bg-emerald-400/20' : 'bg-sky-400/15'} border-l-2 ${t.type === 'out' ? 'border-emerald-400' : 'border-sky-400'}`}
              style={{
                left: `${(t.scheduledStart / TOTAL_MIN) * 100}%`,
                width: `${((t.scheduledEnd - t.scheduledStart) / TOTAL_MIN) * 100}%`,
              }}
              title={`${t.type === 'out' ? '出库' : '入库'} ${minutesToLabel(t.scheduledStart)}-${minutesToLabel(t.scheduledEnd)}`}
            />
          ))}
        </div>
      </div>

      {evaporators.map((ev) => (
        <div
          key={ev.id}
          className="grid items-center"
          style={{ gridTemplateColumns: '120px 1fr', gap: 8, height: ROW_HEIGHT }}
        >
          <div className="text-xs text-white/70 flex items-center gap-1">
            <Snowflake size={12} className="text-sky-400" />
            {ev.name}
          </div>
          <div className="relative h-10 bg-white/5 border border-white/10 rounded">
            {slots
              .filter((s) => s.evaporatorId === ev.id)
              .map((s) => {
                const duration = s.end - s.start;
                const overStd = duration - ev.defrostDurationMin;
                const hasConflict = slots.some(
                  (other) =>
                    other.id !== s.id &&
                    other.evaporatorId === s.evaporatorId &&
                    other.end > s.start &&
                    other.start < s.end,
                );
                const bg = hasConflict
                  ? 'bg-red-500/80'
                  : overStd > 0
                  ? 'bg-orange-500/80'
                  : 'bg-gradient-to-r from-sky-500 to-indigo-500';
                return (
                  <div
                    key={s.id}
                    className={`absolute top-1 bottom-1 rounded flex items-center px-2 cursor-grab ${bg} ${hasConflict ? 'alert-pulse' : ''}`}
                    style={{
                      left: `${(s.start / TOTAL_MIN) * 100}%`,
                      width: `${((s.end - s.start) / TOTAL_MIN) * 100}%`,
                      minWidth: 20,
                    }}
                    onPointerDown={(e) => onPointerDown(e, s, 'move')}
                  >
                    <div className="text-[10px] text-white font-semibold whitespace-nowrap">
                      {minutesToLabel(s.start)} - {minutesToLabel(s.end)}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                      onPointerDown={(e) => onPointerDown(e, s, 'resize')}
                    />
                    <button
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] opacity-0 hover:opacity-100 transition"
                      onClick={() => onRemove(s.id)}
                      title="删除"
                    >
                      <Trash2 size={10} className="mx-auto" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemperatureChart({
  zones,
  tempLayers,
  series,
}: {
  zones: any[];
  tempLayers: any[];
  series: any[];
}) {
  const data = useMemo(() => {
    const byTime: Record<number, any> = {};
    series.forEach((p) => {
      if (!byTime[p.time]) byTime[p.time] = { time: p.time, label: minutesToLabel(p.time) };
      byTime[p.time][p.zoneId] = p.temperature;
    });
    return Object.values(byTime).sort((a, b) => a.time - b.time);
  }, [series]);

  const colors = ['#38bdf8', '#a78bfa', '#fb923c', '#34d399'];

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
          <Tooltip contentStyle={{ background: '#0a1a30', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, fontSize: 12 }} />
          {zones.map((z, i) => {
            const layer = tempLayers.find((l: any) => l.zoneId === z.id);
            return (
              <g key={z.id}>
                <Line type="monotone" dataKey={z.id} stroke={colors[i % colors.length]} dot={false} strokeWidth={2} name={z.name} />
                {layer && (
                  <ReferenceLine y={layer.tempCeiling} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `${z.name} 阈值`, fill: '#ef4444', fontSize: 10 }} />
                )}
              </g>
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
