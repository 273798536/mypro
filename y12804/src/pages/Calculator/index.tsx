import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Collapsible from '@/components/common/Collapsible';
import { formulas, getFormulaCategories } from '@/data/formulas';
import { evaluateFormula } from '@/utils/formula';
import type { Formula, CalculationResult } from '@/types';
import {
  Calculator,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  FlaskConical,
  Scale,
  Ruler,
  Activity,
} from 'lucide-react';

export default function CalculatorPage() {
  const [selectedFormula, setSelectedFormula] = useState<Formula>(formulas[0]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CalculationResult | null>(null);

  const categories = getFormulaCategories();

  const categoryFormulas = useMemo(() => {
    const map: Record<string, Formula[]> = {};
    for (const cat of categories) {
      map[cat] = formulas.filter((f) => f.category === cat);
    }
    return map;
  }, [categories]);

  const handleInputChange = (paramName: string, value: string) => {
    const newInputs = { ...inputs, [paramName]: value };
    setInputs(newInputs);

    const numInputs: Record<string, number | string> = {};
    for (const param of selectedFormula.parameters) {
      const val = newInputs[param.name];
      if (val !== undefined && val !== '') {
        const num = parseFloat(val);
        numInputs[param.name] = isNaN(num) ? val : num;
      } else if (param.defaultValue !== undefined) {
        numInputs[param.name] = param.defaultValue;
      } else {
        numInputs[param.name] = '';
      }
    }

    const allFilled = selectedFormula.parameters.every(
      (p) => numInputs[p.name] !== '' && numInputs[p.name] !== undefined
    );

    if (allFilled) {
      const calcResult = evaluateFormula(selectedFormula, numInputs);
      setResult(calcResult);
    } else {
      setResult(null);
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case '生长发育':
        return <Scale className="w-4 h-4" />;
      case '生化检测':
        return <Activity className="w-4 h-4" />;
      case '组织检测':
        return <FlaskConical className="w-4 h-4" />;
      case '动物实验':
        return <Ruler className="w-4 h-4" />;
      case '质量控制':
        return <Calculator className="w-4 h-4" />;
      default:
        return <Calculator className="w-4 h-4" />;
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-4">
        <Card title="计算公式" subtitle="选择要使用的计算方式">
          <div className="space-y-3">
            {categories.map((category) => (
              <Collapsible
                key={category}
                title={category}
                icon={getIconForCategory(category)}
                defaultOpen={category === categories[0]}
                badge={<Badge variant="info">{categoryFormulas[category]?.length || 0}</Badge>}
              >
                <div className="space-y-2">
                  {categoryFormulas[category]?.map((formula) => (
                    <button
                      key={formula.id}
                      onClick={() => {
                        setSelectedFormula(formula);
                        setInputs({});
                        setResult(null);
                      }}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        selectedFormula.id === formula.id
                          ? 'bg-medical-50 border border-medical-300'
                          : 'bg-neutral-50 hover:bg-neutral-100 border border-transparent'
                      }`}
                    >
                      <p className="text-sm font-medium text-primary-800">{formula.name}</p>
                      <p className="text-xs text-neutral-500 mt-1 font-mono">
                        {formula.code}
                      </p>
                    </button>
                  ))}
                </div>
              </Collapsible>
            ))}
          </div>
        </Card>
      </div>

      <div className="col-span-2 space-y-6">
        <Card
          title={selectedFormula.name}
          subtitle={selectedFormula.description}
          headerAction={
            <Badge variant="info">{selectedFormula.category}</Badge>
          }
        >
          <div className="space-y-5">
            <div className="bg-primary-50 p-4 rounded-md border border-primary-200">
              <div className="flex items-start gap-2 mb-2">
                <Calculator className="w-4 h-4 text-primary-600 mt-0.5" />
                <span className="text-xs font-medium text-primary-700">计算公式</span>
              </div>
              <p className="font-mono text-base text-primary-900 bg-white p-3 rounded border border-primary-200">
                {selectedFormula.expression}
              </p>
              <p className="text-xs text-primary-600 mt-2">
                单位: <span className="font-mono font-medium">{selectedFormula.unit}</span>
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-primary-700 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                适用范围
              </h4>
              <p className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-md">
                {selectedFormula.applicableScope}
              </p>
            </div>

            {selectedFormula.referenceRange && (
              <div>
                <h4 className="text-sm font-medium text-primary-700 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  参考范围
                </h4>
                <div className="bg-success-50 border border-success-200 p-3 rounded-md">
                  <p className="text-sm text-success-800">
                    <span className="font-mono font-bold">
                      {selectedFormula.referenceRange.min} - {selectedFormula.referenceRange.max}
                    </span>{' '}
                    {selectedFormula.unit}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-primary-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning-600" />
                失败条件
              </h4>
              <ul className="space-y-2">
                {selectedFormula.failureConditions.map((condition, index) => (
                  <li
                    key={index}
                    className="text-sm text-neutral-600 bg-warning-50 p-2.5 rounded-md border-l-2 border-warning-400"
                  >
                    <span className="font-medium text-warning-700">注意：</span>
                    {condition}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card title="参数输入" subtitle="输入参数后将实时计算结果">
          <div className="grid grid-cols-2 gap-4">
            {selectedFormula.parameters.map((param) => (
              <div key={param.name}>
                <label className="block text-sm font-medium text-primary-700 mb-1.5">
                  {param.label}
                  {param.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={inputs[param.name] ?? param.defaultValue ?? ''}
                    onChange={(e) => handleInputChange(param.name, e.target.value)}
                    step="any"
                    min={param.min}
                    max={param.max}
                    placeholder={`请输入${param.label}`}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-medical-500 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-mono">
                    {param.unit}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  {param.min !== undefined && param.max !== undefined
                    ? `范围: ${param.min} - ${param.max} ${param.unit}`
                    : param.min !== undefined
                    ? `最小值: ${param.min} ${param.unit}`
                    : param.max !== undefined
                    ? `最大值: ${param.max} ${param.unit}`
                    : ''}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {result && (
          <Card
            title="计算结果"
            subtitle="基于输入参数的实时计算"
          >
            <div
              className={`p-6 rounded-md text-center ${
                result.status === 'normal'
                  ? 'bg-success-50 border border-success-200'
                  : result.status === 'warning'
                  ? 'bg-warning-50 border border-warning-200'
                  : result.status === 'abnormal'
                  ? 'bg-supplement-50 border border-supplement-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                {result.status === 'normal' ? (
                  <CheckCircle className="w-6 h-6 text-success-600" />
                ) : result.status === 'failed' ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-supplement-600" />
                )}
                <span
                  className={`text-sm font-medium ${
                    result.status === 'normal'
                      ? 'text-success-700'
                      : result.status === 'failed'
                      ? 'text-red-700'
                      : 'text-supplement-700'
                  }`}
                >
                  {result.status === 'normal'
                    ? '结果正常'
                    : result.status === 'warning'
                    ? '结果警告'
                    : result.status === 'abnormal'
                    ? '结果异常'
                    : '计算失败'}
                </span>
              </div>
              <p className="text-4xl font-bold text-primary-800 font-mono">
                {result.value !== null ? result.value.toFixed(2) : '—'}
                <span className="text-lg font-normal ml-2 text-neutral-500">
                  {result.unit}
                </span>
              </p>
            </div>

            {result.failureReason && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <h5 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  失败原因
                </h5>
                <p className="text-sm text-red-700">{result.failureReason}</p>
              </div>
            )}

            <div className="mt-4">
              <h5 className="text-sm font-medium text-primary-700 mb-3">计算步骤</h5>
              <div className="space-y-2">
                {result.steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-md"
                  >
                    <div>
                      <p className="text-sm font-medium text-primary-800">{step.name}</p>
                      <p className="text-xs text-neutral-500 font-mono mt-0.5">
                        {step.expression}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium text-primary-700">
                        {step.result.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
