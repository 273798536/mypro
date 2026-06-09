import { useState } from 'react';
import { useSceneStore } from '@/stores/useSceneStore';
import type { ImpactLevel, CameraView } from '@/types';
import {
  Camera,
  Save,
  Trash2,
  AlertTriangle,
  Check,
  Info,
  MapPin,
  Eye,
} from 'lucide-react';

const impactStyle: Record<ImpactLevel, { color: string; bg: string; label: string; icon: typeof Info }> = {
  none: { color: '#51cf66', bg: 'bg-emerald-500/10', label: '无影响', icon: Check },
  low: { color: '#94d82d', bg: 'bg-lime-500/10', label: '轻微', icon: Check },
  medium: { color: '#ffaa00', bg: 'bg-amber-500/10', label: '中等', icon: AlertTriangle },
  high: { color: '#ff3355', bg: 'bg-rose-500/10', label: '严重', icon: AlertTriangle },
};

export function ViewPanel() {
  const savedViews = useSceneStore((s) => s.savedViews);
  const saveView = useSceneStore((s) => s.saveView);
  const deleteView = useSceneStore((s) => s.deleteView);
  const waterLevel = useSceneStore((s) => s.waterLevel);
  const [newViewName, setNewViewName] = useState('');

  const handleSave = () => {
    const view: Omit<CameraView, 'id' | 'createdAt'> = {
      name: newViewName || `视角 ${savedViews.length + 1}`,
      description: '手动保存的关键视角',
      position: [0, 18, 20],
      target: [0, 3, 0],
      impactLevel: 'medium',
      impactNote: '请在演示前复核该视角下的水位判断是否与标准视角一致',
    };
    saveView(view);
    setNewViewName('');
  };

  return (
    <div className="space-y-4 p-4">
      {/* 头部说明 */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-amber-300">视角影响判断：</span>
            同一个船闸，不同角度看可能得出完全不同的结论。
            比如仰视角度会让0.6米的水位差"看起来"只有0.1米。演示前务必保存标准视角。
          </div>
        </div>
      </div>

      {/* 保存新视角 */}
      <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Camera size={14} className="text-cyan-400" />
          <span className="text-xs font-bold text-slate-200">保存当前视角</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            placeholder="给视角起个名字..."
            className="flex-1 rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition focus:border-cyan-500/60"
          />
          <button
            onClick={handleSave}
            className="flex items-center gap-1 rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-500/40"
          >
            <Save size={12} />
            保存
          </button>
        </div>
      </div>

      {/* 已保存视角列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200">已保存视角 ({savedViews.length})</h3>
          <span className="text-[10px] text-slate-500">点击卡片加载视角</span>
        </div>

        {savedViews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">
            还没有保存视角
          </div>
        ) : (
          <div className="space-y-2">
            {savedViews.map((view) => {
              const impact = impactStyle[view.impactLevel];
              const ImpactIcon = impact.icon;
              return (
                <div
                  key={view.id}
                  className="group rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 transition-all hover:border-cyan-500/30 hover:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Eye size={13} className="text-cyan-400" />
                        <span className="truncate text-sm font-semibold text-slate-200">
                          {view.name}
                        </span>
                        <span
                          className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${impact.bg}`}
                          style={{ color: impact.color }}
                        >
                          <ImpactIcon size={9} />
                          {impact.label}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        {view.description}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-600">
                        <span className="flex items-center gap-0.5">
                          <MapPin size={10} />
                          [{view.position.map((n) => n.toFixed(0)).join(',')}]
                        </span>
                        <span>{new Date(view.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteView(view.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {view.impactLevel !== 'none' && (
                    <div
                      className="mt-2 rounded-md border p-1.5 text-[10px] leading-relaxed"
                      style={{ borderColor: impact.color + '33', background: impact.bg }}
                    >
                      <span style={{ color: impact.color }}>⚠ 视角影响提示：</span>
                      <span className="text-slate-300"> {view.impactNote}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 视角影响案例说明 */}
      <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
        <div className="mb-1.5 text-xs font-bold text-rose-300">真实教训：相机视角丢失</div>
        <div className="text-[11px] text-slate-400 leading-relaxed">
          某次现场演示，镜头被路过的船碰歪了15度，原本红色的"水位不平衡危险"在演示画面里变成了绿色的"正常"。
          运维组差点没发现这个问题——所以保存视角+检查影响等级是给运维演示前的必做项。
        </div>
      </div>
    </div>
  );
}
