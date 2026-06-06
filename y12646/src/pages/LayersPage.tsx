import { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  SplitSquareHorizontal,
  Clock,
  User,
  ArrowLeftRight,
  Maximize2,
  Info,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import type { Layer } from '@/types';

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LayersPage() {
  const { batch, toggleLayerVisible, setLayerOpacity, acupoints } = useAppStore();
  const [compareMode, setCompareMode] = useState<'split' | 'overlay' | 'diff'>('split');
  const [beforeId, setBeforeId] = useState('layer-002');
  const [afterId, setAfterId] = useState('layer-003');
  const [splitPosition, setSplitPosition] = useState(50);
  const [selectedCollision, setSelectedCollision] = useState<string | null>('anom-001');

  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  const collisionExamples = batch.anomalies.filter((a) => a.changedResult && (a.type === 'collision' || a.type === 'position_error'));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">图层管理</h2>
          <p className="section-subtitle">前后对比可直观看到导出复盘对判定结论的改变</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-ink-100/50 border border-ink-200/60">
            {[
              { k: 'split', label: '左右分屏', icon: SplitSquareHorizontal },
              { k: 'overlay', label: '叠加对比', icon: Layers },
            ].map((m) => (
              <button
                key={m.k}
                onClick={() => setCompareMode(m.k as any)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  compareMode === m.k
                    ? 'bg-white shadow-soft text-medical-700'
                    : 'text-ink-500 hover:text-ink-700'
                )}
              >
                <m.icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                {m.label}
              </button>
            ))}
          </div>
          <button className="btn-secondary">
            <Plus className="w-4 h-4" />
            <span>新建图层</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <section className="col-span-1 card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-medical-600" strokeWidth={1.8} />
              图层列表
            </h3>
            <span className="text-xs text-ink-400">{batch.layers.length} 层</span>
          </div>
          <div className="space-y-1.5">
            {batch.layers.slice().reverse().map((l) => (
              <LayerRow
                key={l.id}
                layer={l}
                onToggle={() => toggleLayerVisible(l.id)}
                onOpacity={(v) => setLayerOpacity(l.id, v)}
              />
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-ink-100">
            <h4 className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-warm-500" />
              碰撞边界示例
            </h4>
            <div className="space-y-2">
              {collisionExamples.map((a) => {
                const selected = selectedCollision === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedCollision(a.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      selected
                        ? 'border-medical-300 bg-medical-50/50 shadow-soft'
                        : 'border-ink-100 hover:border-ink-200 bg-white'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={cn('w-4 h-4 mt-0.5 shrink-0', a.severity === 'high' ? 'text-red-500' : a.severity === 'medium' ? 'text-warm-500' : 'text-medical-500')}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-ink-800 line-clamp-2">
                          {a.description}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                          <span className={cn(
                            'px-1.5 py-0.5 rounded font-medium',
                            a.changedResult ? 'bg-warm-100 text-warm-700' : 'bg-ink-100 text-ink-600'
                          )}>
                            {a.changedResult ? '改变结论' : '未改变'}
                          </span>
                          <span className="text-ink-400">·</span>
                          <span className="text-ink-400 truncate">
                            {a.materialSource.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-ink-400 leading-relaxed flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              样例仅列 2–3 个常见边界误判，每项都真实改变了最终判定结果。
            </p>
          </div>
        </section>

        <section className="col-span-3 flex flex-col gap-4">
          <div className="card p-3">
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-4">
                <CompareSelect
                  label="对比前"
                  value={beforeId}
                  onChange={setBeforeId}
                  layers={batch.layers}
                  tone="before"
                />
                <ArrowLeftRight className="w-4 h-4 text-ink-400" />
                <CompareSelect
                  label="对比后"
                  value={afterId}
                  onChange={setAfterId}
                  layers={batch.layers}
                  tone="after"
                />
              </div>
              <button className="btn-ghost">
                <Maximize2 className="w-4 h-4" />
                <span>全屏</span>
              </button>
            </div>

            <div
              ref={containerRef}
              className="relative rounded-xl overflow-hidden border border-ink-100 bg-paper"
              style={{ height: 480 }}
            >
              {compareMode === 'split' ? (
                <>
                  <div
                    className="absolute inset-y-0 left-0 overflow-hidden"
                    style={{ width: `${splitPosition}%` }}
                  >
                    <LayerCanvas variant="before" acupoints={acupoints} />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-ink-900/70 text-white text-[11px] font-medium backdrop-blur-sm">
                      {batch.layers.find(l => l.id === beforeId)?.name}（前）
                    </div>
                  </div>
                  <div
                    className="absolute inset-y-0 right-0 overflow-hidden"
                    style={{ width: `${100 - splitPosition}%` }}
                  >
                    <div style={{ width: `${100 / (100 - splitPosition) * 100}%` }}>
                      <LayerCanvas variant="after" acupoints={acupoints} />
                    </div>
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-medical-600/90 text-white text-[11px] font-medium backdrop-blur-sm">
                      {batch.layers.find(l => l.id === afterId)?.name}（后）
                    </div>
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-[3px] bg-white shadow-card cursor-ew-resize z-10 group"
                    style={{ left: `calc(${splitPosition}% - 1.5px)` }}
                    onMouseDown={(e) => {
                      dragging.current = true;
                      const move = (ev: MouseEvent) => {
                        if (!dragging.current || !containerRef.current) return;
                        const rect = containerRef.current.getBoundingClientRect();
                        const pct = ((ev.clientX - rect.left) / rect.width) * 100;
                        setSplitPosition(Math.max(10, Math.min(90, pct)));
                      };
                      window.addEventListener('mousemove', move);
                      const up = () => {
                        dragging.current = false;
                        window.removeEventListener('mousemove', move);
                      };
                      window.addEventListener('mouseup', up, { once: true });
                    }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-card flex items-center justify-center group-hover:scale-110 transition-transform">
                      <GripVertical className="w-3.5 h-3.5 text-medical-600" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative w-full h-full">
                  <LayerCanvas variant="before" acupoints={acupoints} />
                  <div className="absolute inset-0 mix-blend-multiply opacity-80">
                    <LayerCanvas variant="after" acupoints={acupoints} highlightDiff />
                  </div>
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className="px-2.5 py-1 rounded-lg bg-ink-900/70 text-white text-[11px] font-medium backdrop-blur-sm">
                      叠加对比
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-[11px] text-ink-600 border border-ink-100 shadow-soft flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-ink-500/30 border border-ink-400" />
                    原始标注
                    <span className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500" />
                    复核修正（差异高亮）
                  </div>
                </div>
              )}

              {selectedCollision && (
                <div className="absolute bottom-3 left-3 max-w-sm p-3 rounded-xl bg-white/95 backdrop-blur-sm border border-warm-200 shadow-card">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warm-600 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink-900">当前碰撞边界误判</div>
                      <p className="mt-1 text-[11px] text-ink-600 leading-relaxed">
                        {batch.anomalies.find(a => a.id === selectedCollision)?.description}
                      </p>
                      <div className="mt-1.5 text-[10px] text-warm-700 font-medium bg-warm-50 inline-flex px-1.5 py-0.5 rounded">
                        此异常已改变最终判定
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <h4 className="text-sm font-semibold text-ink-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-ink-500" />
                版本时间轴
              </h4>
              <div className="mt-4 relative pl-5">
                <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-ink-200" />
                {batch.layers.slice().reverse().map((l, i) => (
                  <div key={l.id} className="relative pb-4 last:pb-0">
                    <div className={cn(
                      'absolute -left-3 top-1 w-2.5 h-2.5 rounded-full border-2 border-white',
                      i === 0 ? 'bg-medical-600 shadow-soft' : 'bg-ink-300'
                    )} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink-800">{l.name}</div>
                        <div className="mt-0.5 text-[11px] text-ink-500">v{l.version} · {formatDate(l.timestamp)}</div>
                        <div className="mt-1 text-[11px] text-ink-500 leading-relaxed line-clamp-2">{l.description}</div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-ink-500 shrink-0">
                        <User className="w-3 h-3" />
                        {l.author}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <h4 className="text-sm font-semibold text-ink-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sage-600" />
                复核结果摘要
              </h4>
              <div className="mt-4 space-y-3">
                {[
                  { label: '原判定合格', value: 6 },
                  { label: '复核后维持', value: 4, tone: 'good' },
                  { label: '复核后改判', value: 2, tone: 'warn' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-ink-600">{s.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 rounded-full bg-ink-100 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            s.tone === 'good' ? 'bg-sage-500' : s.tone === 'warn' ? 'bg-warm-500' : 'bg-medical-500'
                          )}
                          style={{ width: `${(s.value / 6) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-ink-700 w-6 text-right">{s.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-3 rounded-xl bg-warm-50/60 border border-warm-100">
                <div className="text-[11px] font-semibold text-warm-700 mb-1">评审老师结论线索</div>
                <p className="text-[11px] text-warm-900/80 leading-relaxed">
                  2 项改判均源自「碰撞边界误判」与「旧表寸法混用」，请重点查看足三里（材料：学员李XX操作视频 02:15）和合谷（材料：2024年3月批次训练记录第17页）。
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LayerRow({
  layer,
  onToggle,
  onOpacity,
}: {
  layer: Layer;
  onToggle: () => void;
  onOpacity: (v: number) => void;
}) {
  return (
    <div className={cn(
      'p-2.5 rounded-xl border transition-all',
      layer.visible ? 'bg-white border-ink-100 hover:border-medical-200' : 'bg-ink-50/50 border-ink-100/60 opacity-70'
    )}>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className="w-7 h-7 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-500 hover:text-ink-700 transition-colors"
        >
          {layer.visible ? (
            <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
          ) : (
            <EyeOff className="w-3.5 h-3.5" strokeWidth={1.8} />
          )}
        </button>
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-medical-100 to-medical-200 border border-medical-300/60 flex items-center justify-center text-[10px] font-bold text-medical-700 shrink-0">
          L{layer.version}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-ink-800 truncate">{layer.name}</div>
          <div className="text-[10px] text-ink-400">{formatDate(layer.timestamp)}</div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-ink-300" />
      </div>
      {layer.visible && (
        <div className="mt-2 pl-9 pr-1 flex items-center gap-2">
          <span className="text-[10px] text-ink-400 shrink-0">不透明度</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(layer.opacity * 100)}
            onChange={(e) => onOpacity(Number(e.target.value) / 100)}
            className="flex-1 h-1 accent-medical-600"
          />
          <span className="text-[10px] text-ink-500 font-mono tabular-nums w-8 text-right">
            {Math.round(layer.opacity * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

function CompareSelect({
  label,
  value,
  onChange,
  layers,
  tone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  layers: Layer[];
  tone: 'before' | 'after';
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-medium border bg-white outline-none transition-colors cursor-pointer',
          tone === 'before'
            ? 'border-ink-200 text-ink-700 focus:border-ink-400'
            : 'border-medical-200 text-medical-700 bg-medical-50/50 focus:border-medical-400'
        )}
      >
        {layers.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}（v{l.version}）
          </option>
        ))}
      </select>
    </div>
  );
}

function LayerCanvas({
  variant,
  acupoints,
  highlightDiff = false,
}: {
  variant: 'before' | 'after';
  acupoints: any[];
  highlightDiff?: boolean;
}) {
  const beforeShifts: Record<string, { dx: number; dy: number }> = {
    'ap-003': { dx: 0, dy: -20 },
    'ap-002': { dx: -12, dy: -10 },
  };
  return (
    <div className="w-full h-full flex items-center justify-center bg-grid-med bg-grid-med" style={{ backgroundSize: '20px 20px' }}>
      <svg viewBox="0 0 600 780" width={420} height={540} className="select-none">
        <defs>
          <radialGradient id={`body-${variant}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={variant === 'before' ? '#e8eaee' : '#e6f0fb'} />
            <stop offset="100%" stopColor={variant === 'before' ? '#cfd3db' : '#b4cde9'} />
          </radialGradient>
        </defs>
        <g
          fill={`url(#body-${variant})`}
          stroke={variant === 'before' ? '#9aa6b3' : '#4a8fce'}
          strokeWidth={1.2}
          opacity={0.85}
        >
          <ellipse cx="300" cy="75" rx="48" ry="52" />
          <path d="M252 115 Q248 138 255 160 L230 200 Q218 225 228 260 L200 380 Q192 408 205 430 L200 520 L180 600 Q172 640 185 680 Q200 700 215 700 L260 700 L265 540 L290 540 L290 700 L310 700 L310 540 L335 540 L340 700 L385 700 Q400 700 415 680 Q428 640 420 600 L400 520 L395 430 Q408 408 400 380 L372 260 Q382 225 370 200 L345 160 Q352 138 348 115 Z" />
          <path d="M228 260 Q170 280 150 340 Q140 370 155 385 L180 375 Q182 345 200 325 L215 295 Z" />
          <path d="M372 260 Q430 280 450 340 Q460 370 445 385 L420 375 Q418 345 400 325 L385 295 Z" />
        </g>

        {variant === 'before' && (
          <g stroke="#b4bac3" strokeWidth={1} strokeDasharray="3 3" fill="none" opacity={0.5}>
            <path d="M300 30 L300 460" />
          </g>
        )}
        {variant === 'after' && (
          <g stroke="#0c8ee8" strokeWidth={1.3} strokeDasharray="4 3" fill="none" opacity={0.7}>
            <path d="M300 30 L300 460" />
            <path d="M280 280 L280 460" />
            <path d="M320 280 L320 460" />
          </g>
        )}

        {acupoints.map((ap) => {
          const shift = variant === 'before' ? beforeShifts[ap.id] || { dx: 0, dy: 0 } : { dx: 0, dy: 0 };
          const cx = ap.position.x + shift.dx;
          const cy = ap.position.y + shift.dy;
          const isDiff = (beforeShifts[ap.id]?.dx !== 0 || beforeShifts[ap.id]?.dy !== 0);
          const color = variant === 'before' ? (isDiff ? '#ef4444' : '#9aa6b3') : '#0c8ee8';
          return (
            <g key={`${variant}-${ap.id}`}>
              {variant === 'after' && (
                <circle cx={cx} cy={cy} r={18} fill="rgba(12, 142, 232, 0.06)" stroke="rgba(12, 142, 232, 0.25)" strokeDasharray="3 3" strokeWidth={1} />
              )}
              {highlightDiff && isDiff && variant === 'after' && (
                <circle cx={cx} cy={cy} r={22} fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 4" className="animate-pulse-soft" />
              )}
              <circle cx={cx} cy={cy} r={variant === 'after' ? 7 : 6} fill="white" stroke={color} strokeWidth={2} />
              <text x={cx + 11} y={cy + 4} fontSize={11} fontWeight={600} fill={variant === 'after' ? '#064d85' : '#4d505a'}>
                {ap.name}
              </text>
              {highlightDiff && isDiff && variant === 'after' && (
                <g>
                  <path d={`M${cx - 15} ${cy - 15} L${cx - 5} ${cy - 5} M${cx - 5} ${cy - 15} L${cx - 15} ${cy - 5}`} stroke="#ef4444" strokeWidth={1.5} />
                  <path d={`M${cx + 15} ${cy - 15} L${cx + 5} ${cy - 5} M${cx + 5} ${cy - 15} L${cx + 15} ${cy - 5}`} stroke="#ef4444" strokeWidth={1.5} />
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
