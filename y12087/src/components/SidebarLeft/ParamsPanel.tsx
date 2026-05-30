import { useMemo } from 'react';
import { Gauge, Ruler, Target, Zap } from 'lucide-react';
import { useVectorFieldStore } from '@/store/vectorFieldStore';
import { useDetectionStore } from '@/store/detectionStore';
import { useStreamlineStats } from '@/hooks/useStreamline';

export function ParamsPanel() {
  const currentFormula = useVectorFieldStore((s) =>
    s.formulas.find((f) => f.id === s.currentFormulaId)
  );
  const currentResult = useDetectionStore((s) => s.currentResult);
  const colorScale = useVectorFieldStore((s) => s.colorScale);

  const stats = useStreamlineStats(currentResult?.streamlines || []);

  const params = useMemo(() => {
    if (!currentFormula) return [];
    return [
      {
        label: 'X 范围',
        value: `[${currentFormula.params.xRange[0]}, ${currentFormula.params.xRange[1]}]`,
        icon: Ruler,
        color: 'text-cyan-400',
      },
      {
        label: 'Y 范围',
        value: `[${currentFormula.params.yRange[0]}, ${currentFormula.params.yRange[1]}]`,
        icon: Ruler,
        color: 'text-emerald-400',
      },
      {
        label: 'Z 范围',
        value: `[${currentFormula.params.zRange[0]}, ${currentFormula.params.zRange[1]}]`,
        icon: Ruler,
        color: 'text-violet-400',
      },
      {
        label: '爆炸阈值',
        value: currentFormula.thresholds.explosion.toString(),
        icon: Zap,
        color: 'text-red-400',
      },
      {
        label: '反转阈值',
        value: `${currentFormula.thresholds.directionFlip}°`,
        icon: Target,
        color: 'text-amber-400',
      },
      {
        label: '越界阈值',
        value: currentFormula.thresholds.outOfBounds.toString(),
        icon: Target,
        color: 'text-purple-400',
      },
    ];
  }, [currentFormula]);

  const statsItems = useMemo(() => {
    if (!currentResult) return [];
    return [
      {
        label: '流线总数',
        value: stats.totalStreamlines.toString(),
        icon: Gauge,
        color: 'text-blue-400',
      },
      {
        label: '数据点数',
        value: stats.totalPoints.toLocaleString(),
        icon: Gauge,
        color: 'text-cyan-400',
      },
      {
        label: '平均速度',
        value: stats.avgSpeed.toFixed(3),
        icon: Zap,
        color: 'text-emerald-400',
      },
      {
        label: '最大速度',
        value: stats.maxSpeed.toFixed(3),
        icon: Zap,
        color: 'text-red-400',
      },
    ];
  }, [currentResult, stats]);

  if (!currentFormula) {
    return (
      <div className="text-center text-slate-500 text-sm py-8">
        请选择一个向量场公式
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          公式详情
        </h3>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 mb-3">
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 w-8">Fx =</span>
              <span className="text-slate-300 break-all">
                {currentFormula.fx}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 w-8">Fy =</span>
              <span className="text-slate-300 break-all">
                {currentFormula.fy}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-violet-400 w-8">Fz =</span>
              <span className="text-slate-300 break-all">
                {currentFormula.fz}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          参数配置
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {params.map((param, index) => (
            <div
              key={index}
              className="bg-slate-800/50 rounded-lg p-2 border border-slate-700"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <param.icon size={12} className={param.color} />
                <span className="text-[10px] text-slate-500">
                  {param.label}
                </span>
              </div>
              <div className="text-sm font-mono text-slate-300">
                {param.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {currentResult && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            统计数据
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {statsItems.map((stat, index) => (
              <div
                key={index}
                className="bg-slate-800/50 rounded-lg p-2 border border-slate-700"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon size={12} className={stat.color} />
                  <span className="text-[10px] text-slate-500">
                    {stat.label}
                  </span>
                </div>
                <div className="text-sm font-mono text-slate-300">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {colorScale && (
        <div className="bg-gradient-to-r from-cyan-900/30 to-violet-900/30 rounded-lg p-3 border border-cyan-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-red-400" />
            <span className="text-xs font-medium text-cyan-300">
              颜色标尺已启用
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex mb-2">
            {colorScale.colors.map((c, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <p className="text-[10px] text-slate-400">
            类型: 速度映射
            <br />
            范围: [{colorScale.min}, {colorScale.max}]
          </p>
        </div>
      )}
    </div>
  );
}
