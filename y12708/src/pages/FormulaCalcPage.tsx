import { useState, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { FORMULAS, calculateNutrition, isValidUnit } from "@/services/calculationEngine";
import { useAppStore } from "@/store/appStore";
import Alert from "@/components/ui/Alert";
import { ProblemBadge, StatusBadge } from "@/components/ui/Badges";
import {
  Calculator,
  BookOpen,
  Target,
  Ruler,
  ShieldAlert,
  ChevronDown,
  History,
  Play,
  RotateCcw,
  Save,
  CheckCircle2,
  XCircle,
  Lightbulb,
} from "lucide-react";
import type { IngredientNutrition } from "@/types";
import { cn } from "@/lib/utils";

type FormulaKey = "total_calories" | "nutrition_ratio" | "lp_optimization";

export default function FormulaCalcPage() {
  const [selectedFormula, setSelectedFormula] = useState<FormulaKey>("total_calories");
  const [showFormulaDropdown, setShowFormulaDropdown] = useState(false);

  const [name, setName] = useState("鸡胸肉");
  const [quantity, setQuantity] = useState<string>("200");
  const [unit, setUnit] = useState("g");
  const [protein, setProtein] = useState<string>("23.1");
  const [fat, setFat] = useState<string>("3.6");
  const [carbohydrate, setCarbohydrate] = useState<string>("0");
  const [calories, setCalories] = useState<string>("133");
  const [questionId, setQuestionId] = useState("");
  const [rawNote, setRawNote] = useState("");

  const [calcResult, setCalcResult] = useState<ReturnType<typeof calculateNutrition> | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const addRecord = useAppStore((s) => s.addRecord);
  const addResult = useAppStore((s) => s.addResult);
  const records = useAppStore((s) => s.records);

  const formula = FORMULAS[selectedFormula];

  const unitValidation = useMemo(() => {
    if (!quantity || quantity.trim() === "") return null;
    if (!unit || unit.trim() === "") return { valid: false, message: "单位不能为空" };
    if (!isValidUnit(unit)) return { valid: false, message: `单位"${unit}"不规范` };
    return { valid: true, message: "单位校验通过" };
  }, [quantity, unit]);

  const handleCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const qtyNum = quantity ? Number(quantity) : undefined;
      const nutrition: IngredientNutrition = {
        protein: protein ? Number(protein) : undefined,
        fat: fat ? Number(fat) : undefined,
        carbohydrate: carbohydrate ? Number(carbohydrate) : undefined,
        calories: calories ? Number(calories) : undefined,
      };
      const result = calculateNutrition(qtyNum, unit, nutrition);
      setCalcResult(result);
      setHasCalculated(true);
      setIsCalculating(false);
    }, 400);
  };

  const handleSaveRecord = () => {
    if (!calcResult?.success) return;
    const problems: string[] = [];
    if (!unitValidation?.valid) problems.push("unit_missing");
    if (!name.trim()) problems.push("empty_value");
    if (rawNote && /\d+(\.\d+)?/.test(rawNote) && /g|kg|ml|份|个/.test(rawNote)) {
      problems.push("note_mixed");
    }

    const nutrition: IngredientNutrition = {};
    if (protein) nutrition.protein = Number(protein);
    if (fat) nutrition.fat = Number(fat);
    if (carbohydrate) nutrition.carbohydrate = Number(carbohydrate);
    if (calories) nutrition.calories = Number(calories);

    const rec = addRecord({
      name: name.trim(),
      questionId: questionId.trim() || undefined,
      quantity: quantity ? Number(quantity) : undefined,
      unit: unit.trim() || undefined,
      nutrition,
      rawNote: rawNote.trim() || undefined,
      problems: problems as never,
      status: problems.length > 0 ? "pending" : "confirmed",
    });

    addResult({
      recordId: rec.id,
      success: calcResult.success,
      value: calcResult.calories,
      unit: calcResult.caloriesUnit,
      breakdown: calcResult.breakdown,
    });

    alert("已保存记录到数据中心");
  };

  const handleReset = () => {
    setName("");
    setQuantity("");
    setUnit("");
    setProtein("");
    setFat("");
    setCarbohydrate("");
    setCalories("");
    setQuestionId("");
    setRawNote("");
    setCalcResult(null);
    setHasCalculated(false);
  };

  const formulaOptions: { key: FormulaKey; label: string; desc: string }[] = [
    { key: "total_calories", label: "总热量计算", desc: "单食材热量核算" },
    { key: "nutrition_ratio", label: "营养配比计算", desc: "三大供能比分析" },
    { key: "lp_optimization", label: "线性规划配餐优化", desc: "多食材最优组合求解" },
  ];

  return (
    <AppLayout
      title="公式计算"
      subtitle="日常入口 · 单条记录计算、公式说明、结果诊断"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
        {/* Left: Formula Info Card */}
        <div className="xl:col-span-1 space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.5} />
              <h3 className="section-title">公式说明</h3>
            </div>

            <div className="relative mb-5">
              <button
                onClick={() => setShowFormulaDropdown(!showFormulaDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-primary-200 dark:border-primary-800 rounded hover:border-primary-400 transition-colors"
              >
                <div className="text-left">
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{formula.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{formula.description}</div>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-slate-500 transition-transform", showFormulaDropdown && "rotate-180")} strokeWidth={1.5} />
              </button>

              {showFormulaDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-card-hover z-10 overflow-hidden">
                  {formulaOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setSelectedFormula(opt.key);
                        setShowFormulaDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0",
                        selectedFormula === opt.key && "bg-primary-50 dark:bg-primary-900/30"
                      )}
                    >
                      <div className="font-medium text-slate-800 dark:text-slate-100">{opt.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900 dark:bg-slate-950 rounded p-4 mb-5">
              <p className="text-xs text-primary-300 font-mono mb-2">公式 (LaTeX)</p>
              <div className="text-accent-300 font-serif-sc text-lg text-center py-2">
                {formula.latex}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Ruler className="w-4 h-4 text-primary-600" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">单位定义</span>
                </div>
                <div className="space-y-1.5 ml-5.5">
                  {formula.units.map((u, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <code className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded text-xs font-mono">
                        {u.symbol}
                      </code>
                      <span className="text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200">{u.name}</strong>
                        {" — "}{u.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="w-4 h-4 text-primary-600" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">适用范围</span>
                </div>
                <ul className="ml-5.5 space-y-1">
                  {formula.scope.map((s, idx) => (
                    <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-primary-500 rounded-full" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldAlert className="w-4 h-4 text-warning-600" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">约束条件</span>
                </div>
                <ul className="ml-5.5 space-y-1">
                  {formula.constraints.map((c, idx) => (
                    <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                      <span className="w-1 h-1 bg-warning-500 rounded-full mt-1.5 flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {records.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.5} />
                <h3 className="section-title">最近记录</h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {records.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{r.name}</p>
                      <p className="text-xs text-slate-400">
                        {r.quantity ?? "?"}{r.unit ?? "?"} · v{r.version}
                      </p>
                    </div>
                    <StatusBadge status={r.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Calculation Area */}
        <div className="xl:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.5} />
                <h3 className="section-title">计算输入</h3>
              </div>
              <div className="flex items-center gap-2">
                {unitValidation && (
                  unitValidation.valid ? (
                    <span className="badge-success">
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
                      <span>{unitValidation.message}</span>
                    </span>
                  ) : (
                    <span className="badge-warning">
                      <XCircle className="w-3.5 h-3.5" strokeWidth={2} />
                      <span>{unitValidation.message}</span>
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">食材名称 <span className="text-danger-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn("input-field", !name.trim() && "input-field-error")}
                  placeholder="如：鸡胸肉"
                />
              </div>

              <div>
                <label className="form-label">题目编号</label>
                <input
                  type="text"
                  value={questionId}
                  onChange={(e) => setQuestionId(e.target.value)}
                  className="input-field"
                  placeholder="如：Q202401-001（可选）"
                />
              </div>

              <div>
                <label className="form-label">数量</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-field"
                  placeholder="请输入数字"
                />
              </div>

              <div>
                <label className="form-label">
                  单位
                  {quantity && !unit && <span className="text-danger-500 ml-1">*</span>}
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className={cn("input-field", quantity && !unit && "input-field-warning")}
                >
                  <option value="">请选择单位</option>
                  <option value="g">克 (g)</option>
                  <option value="kg">千克 (kg)</option>
                  <option value="mg">毫克 (mg)</option>
                  <option value="ml">毫升 (ml)</option>
                  <option value="L">升 (L)</option>
                  <option value="份">份</option>
                  <option value="个">个</option>
                  <option value="勺">勺</option>
                  <option value="碗">碗</option>
                  <option value="杯">杯</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="form-label">备注（原始记录）</label>
                <input
                  type="text"
                  value={rawNote}
                  onChange={(e) => setRawNote(e.target.value)}
                  className="input-field"
                  placeholder="如包含数量/单位信息将被标记为备注混写"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">营养成分</span>
                  <span className="text-xs text-slate-400">（每100g含量）</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">蛋白质 (g)</label>
                    <input type="number" step="0.1" value={protein} onChange={(e) => setProtein(e.target.value)} className="input-field" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">脂肪 (g)</label>
                    <input type="number" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} className="input-field" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">碳水 (g)</label>
                    <input type="number" step="0.1" value={carbohydrate} onChange={(e) => setCarbohydrate(e.target.value)} className="input-field" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">热量 (kcal)</label>
                    <input type="number" step="1" value={calories} onChange={(e) => setCalories(e.target.value)} className="input-field" placeholder="0" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
              <div className="flex gap-2">
                {quantity && !unit && <ProblemBadge type="unit_missing" />}
                {!name.trim() && <ProblemBadge type="empty_value" />}
              </div>
              <div className="flex gap-2">
                <button onClick={handleReset} className="btn-secondary">
                  <RotateCcw className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  重置
                </button>
                <button
                  onClick={handleCalculate}
                  disabled={isCalculating}
                  className="btn-primary"
                >
                  {isCalculating ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                  ) : (
                    <Play className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  )}
                  执行计算
                </button>
              </div>
            </div>
          </div>

          {/* Results Area */}
          {hasCalculated && calcResult && (
            <div className="card p-5 animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  {calcResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-success-600" strokeWidth={2} />
                  ) : (
                    <XCircle className="w-5 h-5 text-danger-600" strokeWidth={2} />
                  )}
                  <h3 className="section-title">
                    {calcResult.success ? "计算结果" : "计算失败"}
                  </h3>
                </div>
                {calcResult.success && (
                  <button onClick={handleSaveRecord} className="btn-accent">
                    <Save className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                    保存为记录
                  </button>
                )}
              </div>

              {calcResult.success ? (
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded p-4 text-center">
                      <p className="text-xs text-primary-600 dark:text-primary-400 mb-1">总热量</p>
                      <p className="text-3xl font-bold text-primary-800 dark:text-primary-200 font-serif-sc">
                        {calcResult.calories}
                      </p>
                      <p className="text-xs text-primary-500 mt-0.5">kcal</p>
                    </div>
                    <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded p-4 text-center">
                      <p className="text-xs text-success-600 dark:text-success-400 mb-1">蛋白质供能比</p>
                      <p className="text-3xl font-bold text-success-700 dark:text-success-300 font-serif-sc">
                        {calcResult.proteinRatio}%
                      </p>
                      <p className="text-xs text-success-500 mt-0.5">推荐 10-15%</p>
                    </div>
                    <div className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded p-4 text-center">
                      <p className="text-xs text-accent-600 dark:text-accent-400 mb-1">脂肪供能比</p>
                      <p className="text-3xl font-bold text-accent-700 dark:text-accent-300 font-serif-sc">
                        {calcResult.fatRatio}%
                      </p>
                      <p className="text-xs text-accent-500 mt-0.5">推荐 20-30%</p>
                    </div>
                    <div className="bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded p-4 text-center">
                      <p className="text-xs text-info-600 dark:text-info-400 mb-1">碳水供能比</p>
                      <p className="text-3xl font-bold text-info-700 dark:text-info-300 font-serif-sc">
                        {calcResult.carbRatio}%
                      </p>
                      <p className="text-xs text-info-500 mt-0.5">推荐 55-65%</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">营养构成明细</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {calcResult.breakdown?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {item.value} <span className="text-xs text-slate-500 font-sans">{item.unit}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Alert
                  type="danger"
                  title="失败原因"
                  message={calcResult.failureReason ?? "未知错误"}
                  suggestion={calcResult.suggestion}
                />
              )}
            </div>
          )}

          {!hasCalculated && (
            <div className="card p-10 text-center">
              <Lightbulb className="w-12 h-12 text-accent-400 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-slate-500 dark:text-slate-400">
                输入食材数据后点击"执行计算"，结果将在此处展示
              </p>
              <p className="text-xs text-slate-400 mt-2">
                如遇单位缺失、空值等问题，记录将被标记进入人工修正工作台
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
