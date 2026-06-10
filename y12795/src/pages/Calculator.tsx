import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Zap, RefreshCw } from 'lucide-react';
import { useExperimentStore } from '@/store/experimentStore';
import { useBatchStore } from '@/store/batchStore';
import { FormulaCard } from '@/components/FormulaCard';
import { ResultGradeCard } from '@/components/ResultGradeCard';
import { calcCombustionHeat, calcConcentration } from '@/utils/calculations';
import { runQualityChecks, FAILURE_REASONS } from '@/utils/failureReasons';
import { generateRetestSuggestion } from '@/utils/retestEngine';

export function Calculator() {
  const navigate = useNavigate();
  const { batch, weighingRows, experimentRecords, reactionTimes } = useExperimentStore();
  const { addCalculationResult, addReviewItem, clearCalculationResults, addTimelineEvent, reviewItems } = useBatchStore();

  const [waterEquivalent, setWaterEquivalent] = useState(14500);
  const [wireHeat, setWireHeat] = useState(1400);
  const [tempCorrection, setTempCorrection] = useState(0.015);
  const [wireMass, setWireMass] = useState(0.012);

  const [concMass, setConcMass] = useState(1.0245);
  const [concMolarMass, setConcMolarMass] = useState(122.12);
  const [concVolume, setConcVolume] = useState(250);

  const combustionCalc = useMemo(() => {
    const sample = weighingRows.find((r) => r.sampleMass);
    const tempRec = experimentRecords.find((r) => r.tempChange);
    if (!sample?.sampleMass || !tempRec?.tempChange) return null;
    return calcCombustionHeat({
      waterEquivalent,
      initialTemp: tempRec.initialTemp ?? 23.5,
      finalTemp: tempRec.finalTemp ?? 26.0,
      tempCorrection,
      wireHeat,
      wireMass,
      sampleMass: sample.sampleMass,
    });
  }, [weighingRows, experimentRecords, waterEquivalent, tempCorrection, wireHeat, wireMass]);

  const concCalc = useMemo(() => calcConcentration({
    mass: concMass, molarMass: concMolarMass, volume: concVolume,
  }), [concMass, concMolarMass, concVolume]);

  const checkResults = useMemo(
    () => runQualityChecks(weighingRows, experimentRecords, reactionTimes, combustionCalc?.value),
    [weighingRows, experimentRecords, reactionTimes, combustionCalc]
  );

  const suggestion = useMemo(() => generateRetestSuggestion(checkResults), [checkResults]);

  const handleRunCalculations = () => {
    clearCalculationResults();

    if (combustionCalc) {
      addCalculationResult({
        batchId: batch.id,
        type: '燃烧热',
        value: combustionCalc.value,
        unit: combustionCalc.unit,
        formula: combustionCalc.formula,
        scope: combustionCalc.scope,
        grade: checkResults.some((c) => c.grade === '必须复核') ? '必须复核' :
               checkResults.some((c) => c.grade === '建议复测') ? '建议复测' : '通过',
        suggestion: suggestion.primaryReason,
      });
    }

    addCalculationResult({
      batchId: batch.id,
      type: '浓度换算',
      value: concCalc.value,
      unit: concCalc.unit,
      formula: concCalc.formula,
      scope: concCalc.scope,
      grade: '通过',
      suggestion: '浓度换算无系统误差，可直接使用',
    });

    checkResults.forEach((c) => {
      const reason = FAILURE_REASONS.find((f) => f.code === c.code);
      addReviewItem({
        batchId: batch.id,
        category: c.code === 'E001' || c.code === 'E002' ? '实验记录' :
                  c.code === 'E003' ? '反应时间' : '称量单',
        itemName: reason?.title || '质量检查项',
        status: '待复核',
        reason: reason?.explanation || c.sourceRef,
        reviewer: '',
        reviewedAt: '',
        sourceRef: c.sourceRef,
        errorCode: c.code,
      });
    });

    addTimelineEvent({
      batchId: batch.id,
      type: '计算',
      description: `完成燃烧热和浓度换算计算，检测到${checkResults.length}项质量问题`,
      operator: batch.operator || '当前用户',
      timestamp: new Date().toLocaleString('zh-CN'),
      sourceRef: checkResults.map((c) => `${c.code}`).join(', '),
    });

    navigate('/review');
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b border-lab-line sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-sm">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-serif text-xl font-semibold text-lab-navy">计算工具</h1>
              <p className="text-xs text-gray-500">燃烧热公式 · 浓度换算 · 结果分级</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="lab-btn bg-white border border-lab-line text-lab-ink hover:bg-gray-50 flex items-center gap-1.5 text-sm">
              <RefreshCw size={16} /> 重置参数
            </button>
            <button onClick={handleRunCalculations} className="lab-btn bg-lab-navy text-white hover:bg-lab-navyLight flex items-center gap-2">
              <Zap size={16} /> 运行计算并生成复核项
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="lab-card p-5">
              <h3 className="font-serif text-lg font-semibold text-lab-navy mb-4">燃烧热计算参数</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">水当量 W (J/℃)</label>
                  <input type="number" value={waterEquivalent} onChange={(e) => setWaterEquivalent(Number(e.target.value))} className="lab-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">温度校正值 Δt (℃)</label>
                  <input type="number" step="0.001" value={tempCorrection} onChange={(e) => setTempCorrection(Number(e.target.value))} className="lab-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">点火丝热值 q (J/g)</label>
                  <input type="number" value={wireHeat} onChange={(e) => setWireHeat(Number(e.target.value))} className="lab-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">点火丝质量 m (g)</label>
                  <input type="number" step="0.0001" value={wireMass} onChange={(e) => setWireMass(Number(e.target.value))} className="lab-input w-full" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                * 水当量 W 由苯甲酸标定；样品质量和温度变化值来自数据录入页
              </p>
            </div>

            <div className="lab-card p-5">
              <h3 className="font-serif text-lg font-semibold text-lab-navy mb-4">浓度换算参数</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">溶质质量 m (g)</label>
                  <input type="number" step="0.0001" value={concMass} onChange={(e) => setConcMass(Number(e.target.value))} className="lab-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">摩尔质量 Mm (g/mol)</label>
                  <input type="number" step="0.01" value={concMolarMass} onChange={(e) => setConcMolarMass(Number(e.target.value))} className="lab-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">溶液体积 V (mL)</label>
                  <input type="number" value={concVolume} onChange={(e) => setConcVolume(Number(e.target.value))} className="lab-input w-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <FormulaCard
              title="恒容燃烧热计算公式"
              formula="Qv = [W × (tn - t0 + Δt) - q × m] / M"
              unit="J/g"
              scope="恒容条件下，固体/液体有机化合物燃烧热测定，样品质量范围0.5~1.5g"
              symbols={[
                { symbol: 'Qv', meaning: '恒容燃烧热', value: 'J/g' },
                { symbol: 'W', meaning: '量热计水当量', value: String(waterEquivalent) },
                { symbol: 'tn-t0', meaning: '温度变化值', value: experimentRecords[0]?.tempChange?.toString() || '来自录入' },
                { symbol: 'Δt', meaning: '温度校正值', value: String(tempCorrection) },
                { symbol: 'q', meaning: '点火丝燃烧热', value: String(wireHeat) },
                { symbol: 'm', meaning: '点火丝质量', value: String(wireMass) },
                { symbol: 'M', meaning: '样品质量', value: weighingRows[0]?.sampleMass?.toString() || '来自录入' },
              ]}
              steps={combustionCalc?.steps}
              failureReasons={FAILURE_REASONS.filter((f) => ['E001', 'E002', 'E005'].includes(f.code)).map((f) => ({ code: f.code, title: f.title, explanation: f.explanation }))}
            />

            <FormulaCard
              title="摩尔浓度换算公式"
              formula="c = (m × 1000) / (Mm × V)"
              unit="mol/L"
              scope="室温20~25℃，常压下水溶液浓度换算；体积单位为mL"
              symbols={[
                { symbol: 'c', meaning: '摩尔浓度', value: 'mol/L' },
                { symbol: 'm', meaning: '溶质质量', value: String(concMass) + ' g' },
                { symbol: 'Mm', meaning: '摩尔质量', value: String(concMolarMass) + ' g/mol' },
                { symbol: 'V', meaning: '溶液体积', value: String(concVolume) + ' mL' },
              ]}
              steps={concCalc.steps}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {combustionCalc && (
            <ResultGradeCard
              grade={suggestion.grade}
              title="燃烧热测定结果"
              value={combustionCalc.value.toFixed(2)}
              unit={combustionCalc.unit}
              primaryReason={suggestion.primaryReason}
              suggestions={suggestion.suggestions}
              actions={suggestion.actions}
            />
          )}

          <ResultGradeCard
            grade="通过"
            title="摩尔浓度换算结果"
            value={concCalc.value.toFixed(4)}
            unit={concCalc.unit}
            primaryReason="浓度换算公式为定义式，无系统误差"
            suggestions={[
              `换算使用：${concMass}g ÷ ${concMolarMass}g/mol ÷ (${concVolume}mL/1000)`,
              '结果可直接用于后续计算',
            ]}
            actions={[{ label: '直接使用该浓度值', priority: 'high' }]}
          />
        </div>

        {checkResults.length > 0 && (
          <div className="lab-card p-5">
            <h3 className="font-serif text-lg font-semibold text-lab-navy mb-4">
              自动质量检测发现 {checkResults.length} 个问题
            </h3>
            <div className="space-y-2">
              {checkResults.map((c, i) => {
                const reason = FAILURE_REASONS.find((f) => f.code === c.code);
                return (
                  <div key={i} className={`p-3 rounded-sm border-l-4 ${
                    c.grade === '必须复核' ? 'bg-red-50 border-lab-red' : 'bg-amber-50 border-lab-amber'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          <span className="font-mono text-xs mr-2">[{c.code}]</span>
                          {reason?.title || '质量检查项'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{reason?.suggestion}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${
                        c.grade === '必须复核' ? 'bg-lab-red text-white' : 'bg-lab-amber text-white'
                      }`}>
                        {c.grade}
                      </span>
                    </div>
                    <p className="text-xs mt-2 text-gray-500">来源：{c.sourceRef}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <button onClick={() => navigate('/data-entry')} className="lab-btn bg-white border border-lab-line text-lab-ink hover:bg-gray-50">
            返回数据录入
          </button>
          <button onClick={handleRunCalculations} className="lab-btn bg-lab-amber text-lab-ink hover:bg-lab-amberLight flex items-center gap-2">
            <ClipboardCheck size={16} /> 下一步：进入复核工作台
          </button>
        </div>
      </div>
    </div>
  );
}
