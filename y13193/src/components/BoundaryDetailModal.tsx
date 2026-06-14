import { useAppStore } from '../store/useAppStore';
import { X, AlertTriangle, Thermometer, Battery, ArrowRight, Target } from 'lucide-react';

export function BoundaryDetailModal() {
  const {
    boundaryDetailVisible,
    selectedSampleId,
    samples,
    currentResult,
    parameterSets,
    activeParamSetId,
    actions: { toggleBoundaryDetail }
  } = useAppStore();

  const sample = samples.find(s => s.id === selectedSampleId);
  const paramSet = parameterSets.find(p => p.id === activeParamSetId);

  if (!boundaryDetailVisible || !sample || sample.type !== 'boundary' || !currentResult || !paramSet) {
    return null;
  }

  const tempDiff = sample.temperature - paramSet.baseTemperature;
  const socDiff = sample.soc - paramSet.baseSoc;
  const remainingTolerance = paramSet.tolerance - Math.abs(currentResult.totalError);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-orange-500/10 to-amber-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">边界样本影响分析</h2>
              <p className="text-xs text-slate-400">{sample.name}</p>
            </div>
          </div>
          <button
            onClick={toggleBoundaryDetail}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800">
              <img src={sample.photoUrl} alt={sample.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 grid grid-cols-3 gap-3">
              <StatCard
                icon={<Thermometer className="w-4 h-4" />}
                label="温度"
                value={`${sample.temperature}°C`}
                subValue={`${tempDiff > 0 ? '+' : ''}${tempDiff}°C`}
                status={tempDiff > 5 ? 'warning' : 'normal'}
              />
              <StatCard
                icon={<Battery className="w-4 h-4" />}
                label="SOC"
                value={`${sample.soc}%`}
                subValue={`${socDiff > 0 ? '+' : ''}${socDiff}%`}
                status={socDiff < -20 ? 'warning' : 'normal'}
              />
              <StatCard
                icon={<Target className="w-4 h-4" />}
                label="剩余裕度"
                value={`${remainingTolerance.toFixed(3)}`}
                subValue="mΩ"
                status={remainingTolerance < 0.2 ? 'danger' : 'warning'}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-orange-400" />
              影响传导路径
            </h3>

            <div className="space-y-3">
              <PathStep
                step="1"
                title="高温环境"
                detail={`环境温度 ${sample.temperature}°C，高于基准 ${paramSet.baseTemperature}°C`}
                impact={`温度贡献误差 +${currentResult.components[0].value.toFixed(3)} mΩ`}
              />
              <PathStep
                step="2"
                title="低荷电状态"
                detail={`SOC ${sample.soc}%，低于基准 ${paramSet.baseSoc}%`}
                impact={`SOC贡献误差 ${currentResult.components[1].value >= 0 ? '+' : ''}${currentResult.components[1].value.toFixed(3)} mΩ`}
              />
              <PathStep
                step="3"
                title="综合作用"
                detail="温度与SOC共同推高内阻"
                impact={`总误差 +${currentResult.totalError.toFixed(3)} mΩ（${currentResult.totalErrorPercentage.toFixed(2)}%）`}
                highlight
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <h3 className="text-sm font-semibold text-orange-300 mb-2">边界判断说明</h3>
            <p className="text-sm text-orange-200/80 leading-relaxed">
              {currentResult.boundaryImpact}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">参数对照（为什么边界很重要）</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">当前参数组</div>
                <div className="text-cyan-300 font-medium">{paramSet.name} ({paramSet.version})</div>
                <div className="text-slate-400 text-xs mt-1">
                  容许误差：±{paramSet.tolerance} mΩ
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">当前样本</div>
                <div className="text-orange-300 font-medium">{sample.name}</div>
                <div className="text-slate-400 text-xs mt-1">
                  实测内阻：{sample.internalResistance} mΩ
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/50">
              <div className="text-xs text-slate-400 mb-2">误差余量可视化</div>
              <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((currentResult.totalError / paramSet.tolerance) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0 mΩ</span>
                <span>{paramSet.tolerance} mΩ (上限)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 flex justify-end">
          <button
            onClick={toggleBoundaryDetail}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200
              hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  status
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  status: 'normal' | 'warning' | 'danger';
}) {
  const colors = {
    normal: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    danger: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  };

  return (
    <div className={`p-3 rounded-lg border ${colors[status]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-lg font-bold font-mono">{value}</div>
      <div className="text-[11px] opacity-70">{subValue}</div>
    </div>
  );
}

function PathStep({
  step,
  title,
  detail,
  impact,
  highlight
}: {
  step: string;
  title: string;
  detail: string;
  impact: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex gap-3 p-3 rounded-lg ${
      highlight ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-slate-900/50'
    }`}>
      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
        highlight ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'
      }`}>
        {step}
      </div>
      <div className="flex-1">
        <div className={`font-medium text-sm ${highlight ? 'text-orange-300' : 'text-slate-200'}`}>
          {title}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{detail}</div>
        <div className={`text-xs mt-1.5 font-mono ${highlight ? 'text-orange-400' : 'text-cyan-400'}`}>
          {impact}
        </div>
      </div>
    </div>
  );
}
