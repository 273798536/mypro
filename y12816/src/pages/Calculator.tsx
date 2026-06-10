import { useState } from 'react';
import { useReportStore } from '@/store/useReportStore';
import ParameterSlider from '@/components/ParameterSlider';
import CalculationCard from '@/components/CalculationCard';
import FormulaPanel from '@/components/FormulaPanel';
import { Play, RotateCcw, Save } from 'lucide-react';
import { calculateMutationFrequency, calculateAlleleFrequency, calculateCoverageDepth, determineConclusion, formatNumber, DEFAULT_PARAMS } from '@/utils/calculator';

export default function Calculator() {
  const { params, updateParams, updateSample, samples, selectedSampleId, addChangeLog } = useReportStore();
  const selected = samples.find((s) => s.id === selectedSampleId) ?? samples[0];
  const [localTotal, setLocalTotal] = useState(selected?.totalReads ?? 10000);
  const [localMutant, setLocalMutant] = useState(selected?.mutantReads ?? 500);
  const [localQuality, setLocalQuality] = useState(selected?.qualityScore ?? 30);

  const safeTotal = isNaN(localTotal) ? 0 : localTotal;
  const safeMutant = isNaN(localMutant) ? 0 : localMutant;

  const mf = calculateMutationFrequency(safeMutant, safeTotal);
  const af = calculateAlleleFrequency(safeMutant, safeTotal);
  const cd = calculateCoverageDepth(safeTotal, params.targetRegionLength);
  const conclusion = determineConclusion(mf.value, cd.value, localQuality, params);

  const applyToSample = () => {
    if (!selected) return;
    const oldMf = calculateMutationFrequency(selected.mutantReads, selected.totalReads);
    const oldConclusion = determineConclusion(
      oldMf.value,
      calculateCoverageDepth(selected.totalReads, params.targetRegionLength).value,
      selected.qualityScore,
      params
    );
    const newMf = mf.value;

    if (
      selected.totalReads !== safeTotal ||
      selected.mutantReads !== safeMutant ||
      selected.qualityScore !== localQuality
    ) {
      updateSample(selected.id, {
        totalReads: safeTotal,
        mutantReads: safeMutant,
        qualityScore: localQuality,
        status: '计算完成',
      });
      addChangeLog({
        id: `log-${Date.now()}`,
        sampleBarcode: selected.barcode,
        fieldName: '测序参数',
        oldValue: `总读段 ${selected.totalReads}, 突变 ${selected.mutantReads}, Q${selected.qualityScore.toFixed(1)}`,
        newValue: `总读段 ${safeTotal}, 突变 ${safeMutant}, Q${localQuality.toFixed(1)}`,
        oldMutationFrequency: oldMf.value,
        newMutationFrequency: newMf,
        oldConclusion,
        newConclusion: conclusion,
        timestamp: new Date().toLocaleString('zh-CN'),
        operator: '当前用户',
      });
    }
  };

  const resetParams = () => updateParams(DEFAULT_PARAMS);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-warm-900">计算工具</h2>
          <p className="text-warm-500 text-sm mt-1">
            实时调节阈值参数和样本数据，查看公式、单位、适用范围与失败原因
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetParams} className="btn-secondary flex items-center gap-1.5">
            <RotateCcw size={14} />
            恢复默认参数
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-5 space-y-5">
          <div className="card p-5 space-y-5 stagger-1 animate-fade-in-up">
            <h3 className="font-serif text-lg font-semibold text-warm-900">阈值参数配置</h3>

            <ParameterSlider
              label="最小质量分值 (Q)"
              value={params.minQualityScore}
              min={0}
              max={40}
              step={1}
              unit=""
              description="Phred 质量分数，低于该值的碱基视为不可靠"
              onChange={(v) => updateParams({ minQualityScore: v })}
            />

            <ParameterSlider
              label="最小覆盖深度"
              value={params.minCoverageDepth}
              min={10}
              max={500}
              step={10}
              unit="×"
              description="每个位点被测序读段覆盖的最小次数"
              onChange={(v) => updateParams({ minCoverageDepth: v })}
            />

            <ParameterSlider
              label="突变频率阈值"
              value={params.mutationFrequencyThreshold}
              min={0.5}
              max={20}
              step={0.5}
              unit="%"
              description="高于该频率判为阳性，低于判为阴性"
              onChange={(v) => updateParams({ mutationFrequencyThreshold: v })}
            />

            <ParameterSlider
              label="目标区域长度"
              value={params.targetRegionLength}
              min={100}
              max={2000}
              step={50}
              unit="bp"
              description="测序捕获的目标 DNA 区域长度"
              onChange={(v) => updateParams({ targetRegionLength: v })}
            />
          </div>

          <div className="card p-5 space-y-4 stagger-2 animate-fade-in-up">
            <h3 className="font-serif text-lg font-semibold text-warm-900">
              样本数据输入
              {selected && (
                <span className="ml-2 font-mono text-xs font-normal text-warm-500">
                  {selected.barcode}
                </span>
              )}
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label-text">总读段数 (条)</label>
                <input
                  type="number"
                  value={isNaN(localTotal) ? '' : localTotal}
                  onChange={(e) => setLocalTotal(parseInt(e.target.value) || 0)}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="label-text">突变读段数 (条)</label>
                <input
                  type="number"
                  value={isNaN(localMutant) ? '' : localMutant}
                  onChange={(e) => setLocalMutant(parseInt(e.target.value) || 0)}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="label-text">质量分值 Q</label>
                <input
                  type="number"
                  step="0.1"
                  value={isNaN(localQuality) ? '' : localQuality}
                  onChange={(e) => setLocalQuality(parseFloat(e.target.value) || 0)}
                  className="input-field font-mono"
                />
              </div>
            </div>

            <button onClick={applyToSample} className="btn-primary w-full flex items-center justify-center gap-1.5">
              <Save size={14} />
              应用到当前样本并记录变更
            </button>
          </div>
        </div>

        <div className="col-span-7 space-y-5">
          <div className="card p-5 stagger-1 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <Play size={20} className="text-teal-900" />
              <h3 className="font-serif text-lg font-semibold text-warm-900">实时计算结果</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className={`rounded-lg p-4 border ${
                mf.pass ? 'bg-warm-50 border-warm-200/60' : 'bg-rose-50 border-rose-200'
              }`}>
                <p className="text-xs text-warm-500 mb-1">突变频率 (MF)</p>
                <p className="font-mono text-2xl font-semibold text-warm-900">
                  {formatNumber(mf.value)}
                  <span className="text-sm font-normal text-warm-500 ml-1">%</span>
                </p>
                {!mf.pass && mf.reason && (
                  <p className="text-xs text-rose-600 mt-1">{mf.reason}</p>
                )}
              </div>
              <div className={`rounded-lg p-4 border ${
                af.pass ? 'bg-warm-50 border-warm-200/60' : 'bg-rose-50 border-rose-200'
              }`}>
                <p className="text-xs text-warm-500 mb-1">等位基因频率 (AF)</p>
                <p className="font-mono text-2xl font-semibold text-warm-900">
                  {formatNumber(af.value)}
                  <span className="text-sm font-normal text-warm-500 ml-1">%</span>
                </p>
                {!af.pass && af.reason && (
                  <p className="text-xs text-rose-600 mt-1">{af.reason}</p>
                )}
              </div>
              <div className={`rounded-lg p-4 border ${
                cd.pass ? 'bg-warm-50 border-warm-200/60' : 'bg-rose-50 border-rose-200'
              }`}>
                <p className="text-xs text-warm-500 mb-1">覆盖深度 (CD)</p>
                <p className="font-mono text-2xl font-semibold text-warm-900">
                  {formatNumber(cd.value)}
                  <span className="text-sm font-normal text-warm-500 ml-1">×</span>
                </p>
                {!cd.pass && cd.reason && (
                  <p className="text-xs text-rose-600 mt-1">{cd.reason}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-warm-50 border border-warm-200/60">
              <div>
                <p className="text-xs text-warm-500">综合判定结论</p>
                <p className="text-sm text-warm-600 mt-0.5">
                  根据突变频率 {formatNumber(mf.value)}%、覆盖深度 {formatNumber(cd.value)}×、质量分 Q{localQuality.toFixed(1)}
                </p>
              </div>
              <span
                className={`badge text-base px-4 py-1.5 gap-1.5 ${
                  conclusion === '阳性'
                    ? 'badge-danger'
                    : conclusion === '阴性'
                    ? 'badge-success'
                    : 'badge-warning'
                }`}
              >
                <Play size={14} />
                结论：{conclusion}
              </span>
            </div>
          </div>

          <CalculationCard />
          <FormulaPanel />
        </div>
      </div>
    </div>
  );
}
