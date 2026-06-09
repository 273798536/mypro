import { useState, useMemo, useEffect } from 'react';
import { useBatchStore } from '@/store/useBatchStore';
import { useCalculationStore } from '@/store/useCalculationStore';
import { useAnomalyStore } from '@/store/useAnomalyStore';
import SolubilityChart from '@/components/SolubilityChart';
import ExplanationCard from '@/components/ExplanationCard';
import AnomalyBadge from '@/components/AnomalyBadge';
import { calculateSolubility } from '@/utils/calculator/solubility';
import { convertConcentration } from '@/utils/calculator/concentration';
import { DEMO_REACTIONS } from '@/utils/calculator/balancing';
import { checkPhValue } from '@/utils/calculator/phCheck';
import type { ConcentrationUnit, CalculationResult } from '@/types';
import { FlaskConical, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'balancing' | 'conversion' | 'ph';

const unitOptions: { value: ConcentrationUnit; label: string }[] = [
  { value: 'mol/L', label: '摩尔浓度 (mol/L)' },
  { value: 'g/L', label: '质量浓度 (g/L)' },
  { value: 'mass_fraction', label: '质量分数 (%)' },
];

export default function CurveView() {
  const { currentBatch, currentBatchId } = useBatchStore();
  const {
    calculateSolubilityCurve,
    runConcentrationConversion,
    runBalancing,
    currentSolubilityCurves,
    results,
  } = useCalculationStore();
  const { anomalies, getAnomaliesByReagent } = useAnomalyStore();

  const [selectedReagentId, setSelectedReagentId] = useState<string | null>(null);
  const [reagentDropdownOpen, setReagentDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('balancing');

  const [reactants, setReactants] = useState<string[]>(['H2', 'O2']);
  const [products, setProducts] = useState<string[]>(['H2O']);
  const [balancingResult, setBalancingResult] = useState<CalculationResult | null>(null);

  const [targetUnit, setTargetUnit] = useState<ConcentrationUnit>('g/L');
  const [conversionResult, setConversionResult] = useState<CalculationResult | null>(null);

  const selectedReagent = useMemo(() => {
    if (!currentBatch || !selectedReagentId) return null;
    return currentBatch.reagents.find((r) => r.id === selectedReagentId) || null;
  }, [currentBatch, selectedReagentId]);

  const solubilityCurve = useMemo(() => {
    if (!selectedReagentId) return [];
    return currentSolubilityCurves[selectedReagentId] || [];
  }, [selectedReagentId, currentSolubilityCurves]);

  const solubilityResult = useMemo(() => {
    if (!selectedReagentId) return null;
    return results.find(
      (r) => r.type === 'solubility_curve' && r.rawData?.reagentName === selectedReagent?.name
    );
  }, [results, selectedReagentId, selectedReagent]);

  const reagentAnomalies = useMemo(() => {
    if (!selectedReagentId) return [];
    return getAnomaliesByReagent(selectedReagentId);
  }, [selectedReagentId, getAnomaliesByReagent]);

  useEffect(() => {
    if (currentBatch && currentBatch.reagents.length > 0 && !selectedReagentId) {
      setSelectedReagentId(currentBatch.reagents[0].id);
    }
  }, [currentBatch, selectedReagentId]);

  useEffect(() => {
    if (selectedReagent && solubilityCurve.length === 0) {
      calculateSolubilityCurve(selectedReagent);
    }
  }, [selectedReagent, solubilityCurve.length, calculateSolubilityCurve]);

  const handleReagentSelect = (reagentId: string) => {
    setSelectedReagentId(reagentId);
    setReagentDropdownOpen(false);
    setConversionResult(null);
  };

  const handleBalancing = () => {
    if (!currentBatchId) return;
    const validReactants = reactants.filter((r) => r.trim());
    const validProducts = products.filter((p) => p.trim());
    if (validReactants.length === 0 || validProducts.length === 0) return;
    const result = runBalancing(currentBatchId, validReactants, validProducts);
    setBalancingResult(result);
  };

  const handleConversion = () => {
    if (!selectedReagent) return;
    const result = runConcentrationConversion(selectedReagent, targetUnit);
    setConversionResult(result);
  };

  const loadDemoReaction = (demo: typeof DEMO_REACTIONS[0]) => {
    setReactants([...demo.reactants]);
    setProducts([...demo.products]);
    setBalancingResult(null);
  };

  const updateReactant = (idx: number, value: string) => {
    setReactants((prev) => prev.map((r, i) => (i === idx ? value : r)));
  };

  const updateProduct = (idx: number, value: string) => {
    setProducts((prev) => prev.map((p, i) => (i === idx ? value : p)));
  };

  const addReactant = () => setReactants((prev) => [...prev, '']);
  const addProduct = () => setProducts((prev) => [...prev, '']);
  const removeReactant = (idx: number) => {
    if (reactants.length > 1) setReactants((prev) => prev.filter((_, i) => i !== idx));
  };
  const removeProduct = (idx: number) => {
    if (products.length > 1) setProducts((prev) => prev.filter((_, i) => i !== idx));
  };

  const currentSolubility = selectedReagent
    ? calculateSolubility(selectedReagent.name, selectedReagent.temperature)
    : undefined;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'balancing', label: '配平计算' },
    { key: 'conversion', label: '浓度换算' },
    { key: 'ph', label: 'pH检测结果' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">曲线计算展示</h1>
          <p className="text-gray-500 mt-1">查看溶解度曲线、配平计算和浓度换算结果</p>
        </div>
        <div className="relative min-w-[280px]">
          <label className="block text-sm font-medium text-gray-600 mb-1.5">选择试剂</label>
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg hover:border-gray-300 bg-white"
            onClick={() => setReagentDropdownOpen(!reagentDropdownOpen)}
          >
            <span className="text-gray-800 flex items-center gap-2">
              <FlaskConical size={16} className="text-[#0d9488]" />
              {selectedReagent ? selectedReagent.name : '请选择试剂'}
            </span>
            <ChevronDown size={18} className="text-gray-400" />
          </button>
          {reagentDropdownOpen && currentBatch && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
              {currentBatch.reagents.map((reagent) => (
                <button
                  key={reagent.id}
                  className={cn(
                    'w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between',
                    selectedReagentId === reagent.id && 'bg-teal-50 text-[#0d9488]'
                  )}
                  onClick={() => handleReagentSelect(reagent.id)}
                >
                  <span>
                    {reagent.name}
                    {reagent.formula && (
                      <span className="text-gray-400 ml-2">({reagent.formula})</span>
                    )}
                  </span>
                  {selectedReagentId === reagent.id && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!currentBatch || currentBatch.reagents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center text-gray-400">
          <FlaskConical size={48} className="mx-auto mb-4 text-gray-300" />
          <p>当前批次暂无试剂，请先在数据录入页面添加试剂</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedReagent && (
              <SolubilityChart
                data={solubilityCurve}
                reagentName={selectedReagent.name}
                currentTemp={selectedReagent.temperature}
                currentSolubility={currentSolubility}
              />
            )}

            <div className="space-y-4">
              {selectedReagent && (
                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">试剂信息</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">名称：</span>
                      <span className="text-gray-800 font-medium">{selectedReagent.name}</span>
                    </div>
                    {selectedReagent.formula && (
                      <div>
                        <span className="text-gray-500">化学式：</span>
                        <span className="text-gray-800 font-medium">{selectedReagent.formula}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">浓度：</span>
                      <span className="text-gray-800 font-medium">
                        {selectedReagent.concentration} {selectedReagent.concentrationUnit}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">温度：</span>
                      <span className="text-gray-800 font-medium">{selectedReagent.temperature}°C</span>
                    </div>
                    <div>
                      <span className="text-gray-500">pH值：</span>
                      <span className="text-gray-800 font-medium">{selectedReagent.phValue}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">溶解度：</span>
                      <span className="text-[#0d9488] font-medium">
                        {currentSolubility} g/100g水
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {solubilityResult && <ExplanationCard result={solubilityResult} defaultExpanded />}

              {reagentAnomalies.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700 text-sm">检测到的异常</h3>
                  {reagentAnomalies.map((anomaly) => (
                    <AnomalyBadge key={anomaly.id} anomaly={anomaly} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={cn(
                    'px-6 py-3.5 font-medium text-sm transition-colors relative',
                    activeTab === tab.key
                      ? 'text-[#0d9488]'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d9488]" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === 'balancing' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        反应物
                      </label>
                      <div className="space-y-2">
                        {reactants.map((r, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              value={r}
                              onChange={(e) => updateReactant(idx, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none"
                              placeholder="化学式，如 H2"
                            />
                            <button
                              className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              onClick={() => removeReactant(idx)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          className="text-sm text-[#0d9488] hover:text-[#0f766e] font-medium"
                          onClick={addReactant}
                        >
                          + 添加反应物
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        生成物
                      </label>
                      <div className="space-y-2">
                        {products.map((p, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              value={p}
                              onChange={(e) => updateProduct(idx, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none"
                              placeholder="化学式，如 H2O"
                            />
                            <button
                              className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              onClick={() => removeProduct(idx)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          className="text-sm text-[#0d9488] hover:text-[#0f766e] font-medium"
                          onClick={addProduct}
                        >
                          + 添加生成物
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      演示反应
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DEMO_REACTIONS.map((demo) => (
                        <button
                          key={demo.name}
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:border-[#0d9488] hover:text-[#0d9488] transition-colors"
                          onClick={() => loadDemoReaction(demo)}
                        >
                          {demo.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d4f7a] transition-colors font-medium"
                    onClick={handleBalancing}
                  >
                    执行配平计算
                  </button>

                  {balancingResult && <ExplanationCard result={balancingResult} defaultExpanded />}
                </div>
              )}

              {activeTab === 'conversion' && selectedReagent && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">原始浓度</div>
                      <div className="text-xl font-bold text-gray-800 mt-1">
                        {selectedReagent.concentration}
                      </div>
                      <div className="text-sm text-gray-600">{selectedReagent.concentrationUnit}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        换算目标单位
                      </label>
                      <select
                        value={targetUnit}
                        onChange={(e) => setTargetUnit(e.target.value as ConcentrationUnit)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none bg-white"
                      >
                        {unitOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-teal-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">换算结果</div>
                      <div className="text-xl font-bold text-[#0d9488] mt-1">
                        {convertConcentration(
                          selectedReagent.concentration,
                          selectedReagent.concentrationUnit,
                          targetUnit,
                          selectedReagent.molarMass
                        ).toValue}
                      </div>
                      <div className="text-sm text-gray-600">{targetUnit}</div>
                    </div>
                  </div>

                  <button
                    className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] transition-colors font-medium"
                    onClick={handleConversion}
                  >
                    生成详细换算说明
                  </button>

                  {conversionResult && <ExplanationCard result={conversionResult} defaultExpanded />}
                </div>
              )}

              {activeTab === 'conversion' && !selectedReagent && (
                <div className="text-center py-8 text-gray-400">
                  请先选择试剂
                </div>
              )}

              {activeTab === 'ph' && (
                <div className="space-y-5">
                  {currentBatch.reagents.map((reagent) => {
                    const check = checkPhValue(reagent.phValue);
                    const reagentAnomalies = anomalies.filter((a) => a.reagentId === reagent.id && a.type === 'ph_out_of_range');
                    return (
                      <div
                        key={reagent.id}
                        className="p-4 border border-gray-100 rounded-xl"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-medium text-gray-800">
                            {reagent.name}
                            {reagent.formula && (
                              <span className="text-gray-400 ml-2">({reagent.formula})</span>
                            )}
                          </div>
                          <span
                            className={cn(
                              'text-sm px-3 py-1 rounded-full font-medium',
                              check.isNormal && check.isInCommonRange
                                ? 'bg-green-100 text-green-700'
                                : check.isNormal
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            )}
                          >
                            pH: {reagent.phValue}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{check.userFriendlyMessage}</p>
                        {check.possibleCauses.length > 0 && (
                          <div className="text-sm text-gray-500 space-y-1">
                            <div className="font-medium text-gray-600">可能原因：</div>
                            <ul className="list-disc list-inside space-y-0.5">
                              {check.possibleCauses.map((cause, i) => (
                                <li key={i}>{cause}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {reagentAnomalies.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {reagentAnomalies.map((a) => (
                              <AnomalyBadge key={a.id} anomaly={a} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
