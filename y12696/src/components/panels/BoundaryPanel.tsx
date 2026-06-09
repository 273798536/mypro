import { useState } from 'react';
import { boundaryCases } from '@/data/boundaryCases';
import { useSceneStore } from '@/stores/useSceneStore';
import type { BoundaryCase, BoundaryCategory } from '@/types';
import {
  AlertOctagon,
  Camera,
  Zap,
  Database,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
} from 'lucide-react';

const categoryConfig: Record<BoundaryCategory, { icon: typeof Camera; label: string; color: string; bg: string }> = {
  camera_loss: { icon: Camera, label: '视角丢失', color: '#a855f7', bg: 'bg-purple-500/10' },
  outlier_float: { icon: Zap, label: '离群点漂浮', color: '#f59e0b', bg: 'bg-amber-500/10' },
  data_gap: { icon: Database, label: '采样缺口', color: '#ef4444', bg: 'bg-rose-500/10' },
};

const severityColor = {
  danger: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  warning: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  info: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
};

const severityLabel = {
  danger: '危险',
  warning: '警告',
  info: '正常',
};

export function BoundaryPanel() {
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [showAfter, setShowAfter] = useState(false);
  const applyBoundaryState = useSceneStore((s) => s.applyBoundaryState);
  const setWaterLevel = useSceneStore((s) => s.setWaterLevel);
  const initialAnomalies = useSceneStore((s) => s.anomalies);
  const initialWater = useSceneStore((s) => s.waterLevel);
  const setActiveTab = useSceneStore((s) => s.setActiveTab);
  const setSectionPlane = useSceneStore((s) => s.setSectionPlane);

  const activeCase = boundaryCases.find((c) => c.id === activeCaseId);

  const applyCase = (c: BoundaryCase, applyAfter: boolean) => {
    const state = applyAfter ? c.afterState : c.beforeState;
    applyBoundaryState(state.waterLevel, state.anomalies);
    setShowAfter(applyAfter);
    // 自动打开Y轴剖切来展示效果
    if (c.category === 'outlier_float') {
      setSectionPlane('y', { enabled: true, position: state.waterLevel.currentLevel });
      setActiveTab('section');
    }
  };

  const resetCase = () => {
    applyBoundaryState(initialWater, initialAnomalies);
    setActiveCaseId(null);
    setShowAfter(false);
    (['x', 'y', 'z'] as const).forEach((a) => setSectionPlane(a, { enabled: false }));
  };

  return (
    <div className="space-y-4 p-4">
      {/* 头部说明 */}
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
        <div className="flex items-start gap-2">
          <AlertOctagon size={16} className="mt-0.5 shrink-0 text-purple-400" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-purple-300">边界案例库：</span>
            这些都是真实材料中经常混进来的"小麻烦"。
            每个案例都会真的改变检测结果——演示前过一遍，遇到就不会慌。
            点云切片和剖面图要一起看，别只看模型表面。
          </div>
        </div>
      </div>

      {/* 激活的案例控制 */}
      {activeCase && (
        <div className="rounded-lg border border-purple-500/40 bg-purple-500/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-purple-400" />
              <span className="text-xs font-bold text-purple-200">正在演示: {activeCase.name}</span>
            </div>
            <button
              onClick={resetCase}
              className="flex items-center gap-1 rounded border border-slate-600 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-slate-700"
            >
              <RotateCcw size={10} />
              退出案例
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => applyCase(activeCase, false)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition ${
                !showAfter
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {!showAfter && <Eye size={11} />}
              正常状态
            </button>
            <button
              onClick={() => applyCase(activeCase, true)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition ${
                showAfter
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {showAfter && <EyeOff size={11} />}
              异常状态（被掩盖）
            </button>
          </div>
          <div className="mt-2 rounded-md border border-slate-700/40 bg-slate-900/50 p-2 text-[10.5px] text-slate-400 leading-relaxed">
            {activeCase.impactExplanation}
          </div>
        </div>
      )}

      {/* 案例列表 */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-200">典型案例 ({boundaryCases.length})</h3>

        {boundaryCases.map((c) => {
          const cfg = categoryConfig[c.category];
          const CatIcon = cfg.icon;
          const isActive = activeCaseId === c.id;
          const beforeAnom = c.beforeState.anomalies[0];
          const afterAnom = c.afterState.anomalies[0];

          return (
            <div
              key={c.id}
              className={`overflow-hidden rounded-lg border transition-all ${
                isActive
                  ? 'border-purple-500/50 bg-purple-500/5 shadow-lg shadow-purple-500/10'
                  : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded ${cfg.bg}`}
                      style={{ color: cfg.color }}
                    >
                      <CatIcon size={13} />
                    </span>
                    <span className="text-sm font-bold text-slate-200">{c.name}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{c.description}</p>

                  {/* 前后对比微缩展示 */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-1.5">
                      <div className="mb-0.5 text-[9px] text-emerald-400">✓ 正常识别</div>
                      <div className="flex items-center gap-1">
                        <span className={`rounded border px-1 py-0.5 text-[9px] font-bold ${severityColor[beforeAnom.severity as keyof typeof severityColor]}`}>
                          {severityLabel[beforeAnom.severity as keyof typeof severityLabel]}
                        </span>
                        <span className="truncate text-[10px] text-slate-300">{beforeAnom.title}</span>
                      </div>
                    </div>
                    <div className="rounded border border-rose-500/30 bg-rose-500/5 p-1.5">
                      <div className="mb-0.5 text-[9px] text-rose-400">✗ 被掩盖</div>
                      <div className="flex items-center gap-1">
                        <span className={`rounded border px-1 py-0.5 text-[9px] font-bold ${severityColor[afterAnom.severity as keyof typeof severityColor]}`}>
                          {severityLabel[afterAnom.severity as keyof typeof severityLabel]}
                        </span>
                        <span className="truncate text-[10px] text-slate-400">{afterAnom.title}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveCaseId(c.id);
                    applyCase(c, false);
                  }}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
                    isActive
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-700/60 text-slate-400 hover:bg-cyan-500 hover:text-white'
                  }`}
                >
                  <Play size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 真实感说明 */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <Check size={13} className="text-emerald-400" />
          为什么这些案例够真实
        </div>
        <ul className="space-y-1 text-[10.5px] text-slate-400 leading-relaxed">
          <li>• 相机视角丢失：船只遮挡、镜头起雾是通航现场高频事件</li>
          <li>• 离群点漂浮：水面反光、气泡、浪花在LiDAR扫描中普遍存在</li>
          <li>• 采样数据缺口：传感器通讯中断每天都在发生，默认插值会"修平"故障</li>
          <li className="text-cyan-400">• 配套操作：自动联动剖切面板，剖面图+点云+模型三维同步复核</li>
        </ul>
      </div>
    </div>
  );
}
