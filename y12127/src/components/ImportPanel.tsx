import { useExperimentStore } from '@/store/experimentStore';
import type { ImportPhase, NoiseConfig } from '@/types';
import { Check, ArrowRight } from 'lucide-react';

export default function ImportPanel() {
  const importPhase = useExperimentStore((s) => s.importPhase);
  const setImportPhase = useExperimentStore((s) => s.setImportPhase);
  const noiseConfig = useExperimentStore((s) => s.noiseConfig);
  const setNoiseConfig = useExperimentStore((s) => s.setNoiseConfig);
  const points = useExperimentStore((s) => s.points);
  const functionType = useExperimentStore((s) => s.functionType);
  const currentResult = useExperimentStore((s) => s.currentResult);

  const phase1Complete = points.length >= 2 && !!currentResult;
  const phase2Complete = phase1Complete && !!noiseConfig;

  const handleAddNoise = () => {
    setNoiseConfig({
      type: 'gaussian',
      amplitude: 0.02,
      seed: 42,
    });
    setImportPhase(2);
  };

  const handleNoiseChange = (key: keyof NoiseConfig, value: number | string) => {
    if (!noiseConfig) return;
    setNoiseConfig({ ...noiseConfig, [key]: value });
  };

  return (
    <div className="bg-[#1a1f36] rounded-lg border border-white/10 p-4 space-y-4">
      <h3 className="text-sm font-medium text-white/80">两阶段导入</h3>

      <div className="flex items-center gap-2">
        <StepIndicator phase={1} currentPhase={importPhase} complete={phase1Complete} label="采样点 + 函数" />
        <div className={`flex-1 h-px ${phase1Complete ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
        <StepIndicator phase={2} currentPhase={importPhase} complete={phase2Complete} label="噪声参数" />
      </div>

      {importPhase === 1 && (
        <div className="space-y-3">
          <div className="bg-white/5 rounded-lg p-3 space-y-2">
            <p className="text-xs text-white/60">
              <span className="text-amber-400">第一阶段</span>：导入采样点与选择函数类型
            </p>
            <ul className="text-[10px] text-white/40 space-y-1 list-disc list-inside">
              <li>在左侧表格中添加采样点，或使用参数面板快速生成</li>
              <li>选择函数类型（Runge / Sin / Exp / 自定义）</li>
              <li>系统自动检测重复 x 值并拦截</li>
            </ul>
          </div>
          {phase1Complete && (
            <button
              onClick={() => setImportPhase(2)}
              className="w-full py-2 bg-amber-500/20 text-amber-400 rounded text-xs hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-1"
            >
              下一步：添加噪声参数
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}

      {importPhase === 2 && (
        <div className="space-y-3">
          <div className="bg-white/5 rounded-lg p-3 space-y-2">
            <p className="text-xs text-white/60">
              <span className="text-amber-400">第二阶段</span>：补充噪声参数，对比前后变化
            </p>
          </div>

          {!noiseConfig && (
            <button
              onClick={handleAddNoise}
              className="w-full py-2 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30 transition-colors"
            >
              启用噪声参数
            </button>
          )}

          {noiseConfig && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs text-white/50">噪声类型</label>
                <div className="flex gap-1.5">
                  {(['gaussian', 'uniform'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleNoiseChange('type', t)}
                      className={`flex-1 px-2 py-1.5 rounded text-xs ${
                        noiseConfig.type === t
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-white/5 text-white/50 border border-white/10'
                      }`}
                    >
                      {t === 'gaussian' ? '高斯' : '均匀'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/50">噪声振幅: {noiseConfig.amplitude.toFixed(3)}</label>
                <input
                  type="range"
                  min={0}
                  max={0.5}
                  step={0.001}
                  value={noiseConfig.amplitude}
                  onChange={(e) => handleNoiseChange('amplitude', parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/50">随机种子: {noiseConfig.seed}</label>
                <input
                  type="number"
                  value={noiseConfig.seed}
                  onChange={(e) => handleNoiseChange('seed', parseInt(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/90 outline-none"
                />
                <p className="text-[10px] text-white/30">相同种子保证重复运行结果一致</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setImportPhase(1)}
            className="w-full py-1.5 bg-white/5 text-white/50 rounded text-xs hover:bg-white/10 transition-colors"
          >
            ← 返回第一阶段
          </button>
        </div>
      )}

      {phase2Complete && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <p className="text-xs text-emerald-400">
            ✓ 两阶段导入完成。函数: {functionType}，噪声振幅: {noiseConfig!.amplitude.toFixed(3)}
          </p>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ phase, currentPhase, complete, label }: {
  phase: ImportPhase;
  currentPhase: ImportPhase;
  complete: boolean;
  label: string;
}) {
  const isActive = phase === currentPhase;
  return (
    <div className={`flex flex-col items-center gap-1 ${isActive ? 'text-amber-400' : complete ? 'text-emerald-400' : 'text-white/30'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border ${
        isActive ? 'border-amber-500 bg-amber-500/20' : complete ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/20 bg-white/5'
      }`}>
        {complete ? <Check size={12} /> : phase}
      </div>
      <span className="text-[10px]">{label}</span>
    </div>
  );
}
