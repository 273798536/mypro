import { useSceneStore } from '@/stores/useSceneStore';
import type { Axis } from '@/types';
import { SectionThumbnail } from '../common/SectionThumbnail';
import { Eye, EyeOff, RotateCcw, Info, Scissors } from 'lucide-react';

const axisConfig: { key: Axis; label: string; color: string; range: [number, number]; desc: string }[] = [
  { key: 'x', label: '横向剖切 (X轴)', color: '#ff6b6b', range: [-10, 10], desc: '从左到右切开，观察左右侧结构差异' },
  { key: 'y', label: '高程剖切 (Y轴)', color: '#51cf66', range: [0, 10], desc: '水平面剖切，观察不同水位截面' },
  { key: 'z', label: '纵向剖切 (Z轴)', color: '#339af0', range: [-7, 7], desc: '从上游到下游切开，观察输水廊道' },
];

export function SectionPanel() {
  const sectionPlanes = useSceneStore((s) => s.sectionPlanes);
  const setSectionPlane = useSceneStore((s) => s.setSectionPlane);
  const toggleSectionPlane = useSceneStore((s) => s.toggleSectionPlane);
  const waterLevel = useSceneStore((s) => s.waterLevel);

  const resetAll = () => {
    (['x', 'y', 'z'] as Axis[]).forEach((a) => {
      setSectionPlane(a, { enabled: false, position: 0, invert: false });
    });
  };

  const anyEnabled = (['x', 'y', 'z'] as Axis[]).some((a) => sectionPlanes[a].enabled);

  return (
    <div className="space-y-4 p-4">
      {/* 头部说明 */}
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
        <div className="flex items-start gap-2">
          <Info size={16} className="mt-0.5 shrink-0 text-cyan-400" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-cyan-300">剖切讲解提示：</span>
            剖切就是"把船闸切开看看里面"。给运维组讲的时候可以说："这就像把西瓜切开看瓤熟没熟，不切不知道里面有没有问题。"
            剖面图、点云切片和模型重叠要一起看。
          </div>
        </div>
      </div>

      {/* 快捷剖切预设 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200">快捷预设</h3>
          <button
            onClick={resetAll}
            disabled={!anyEnabled}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40"
          >
            <RotateCcw size={12} />
            重置
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '水位剖面', axis: 'y' as Axis, pos: waterLevel.currentLevel, desc: '切在当前水位' },
            { label: '阀门剖面', axis: 'z' as Axis, pos: 0, desc: '切在输水廊道' },
            { label: '左右对比', axis: 'x' as Axis, pos: 0, desc: '左右对称对比' },
            { label: '底部剖面', axis: 'y' as Axis, pos: 1.5, desc: '检查底部结构' },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                (['x', 'y', 'z'] as Axis[]).forEach((a) =>
                  setSectionPlane(a, { enabled: false })
                );
                setSectionPlane(preset.axis, { enabled: true, position: preset.pos });
              }}
              className="group rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5 text-left transition-all hover:border-cyan-500/40 hover:bg-slate-800"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                <Scissors size={12} />
                {preset.label}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 三轴控制 */}
      {axisConfig.map((axis) => {
        const plane = sectionPlanes[axis.key];
        return (
          <div
            key={axis.key}
            className={`rounded-lg border p-3 transition-all ${
              plane.enabled
                ? 'border-opacity-60 bg-slate-800/60'
                : 'border-slate-700/40 bg-slate-800/20'
            }`}
            style={{ borderColor: plane.enabled ? axis.color + '66' : undefined }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: axis.color }}
                />
                <span className="text-xs font-semibold text-slate-200">{axis.label}</span>
              </div>
              <button
                onClick={() => toggleSectionPlane(axis.key)}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-700"
              >
                {plane.enabled ? <Eye size={14} style={{ color: axis.color }} /> : <EyeOff size={14} />}
              </button>
            </div>

            {plane.enabled && (
              <>
                <div className="mb-2 text-[10px] text-slate-500">{axis.desc}</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-[11px] text-slate-500">{axis.range[0]}</span>
                    <input
                      type="range"
                      min={axis.range[0]}
                      max={axis.range[1]}
                      step={0.1}
                      value={plane.position}
                      onChange={(e) => setSectionPlane(axis.key, { position: parseFloat(e.target.value) })}
                      className="flex-1 accent-current"
                      style={{ accentColor: axis.color }}
                    />
                    <span className="w-6 text-[11px] text-slate-500">{axis.range[1]}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      位置: <span className="font-mono font-bold" style={{ color: axis.color }}>{plane.position.toFixed(1)}m</span>
                    </span>
                    <button
                      onClick={() => setSectionPlane(axis.key, { invert: !plane.invert })}
                      className={`rounded px-2 py-0.5 transition ${
                        plane.invert
                          ? 'bg-slate-700 text-slate-200'
                          : 'text-slate-500 hover:bg-slate-700/50'
                      }`}
                    >
                      反向剖切
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* 剖面缩略图与前后对比 */}
      {anyEnabled && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-200">剖切前后对比</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="overflow-hidden rounded-lg border border-slate-700">
              <div className="bg-slate-800/50 px-2 py-1 text-[10px] text-slate-400">剖切前</div>
              <SectionThumbnail type="before" />
            </div>
            <div className="overflow-hidden rounded-lg border border-cyan-500/40">
              <div className="bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-400">剖切后</div>
              <SectionThumbnail type="after" waterLevel={waterLevel.currentLevel} />
            </div>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-300 leading-relaxed">
            💡 <b>前后差别：</b>剖切后可以看到内部输水廊道的形状和水位在截面的分布，
            没剖切只能看到表面。点云切片能帮你发现水面那些"漂着"的离群点。
          </div>
        </div>
      )}
    </div>
  );
}
