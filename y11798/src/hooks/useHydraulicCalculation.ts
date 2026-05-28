import { useState, useCallback, useEffect } from 'react';
import { CalculationInput, CalculationResult, ValidationError, Correction } from '../types';
import { calculateHydraulicJack } from '../utils/calculator';
import { validateInput, hasCriticalErrors } from '../utils/validator';

const DEFAULT_INPUT: CalculationInput = {
  smallPistonArea: 10,
  smallPistonAreaUnit: 'cm²',
  largePistonArea: 100,
  largePistonAreaUnit: 'cm²',
  inputForce: 500,
  inputForceUnit: 'N',
  inputStroke: 10,
  inputStrokeUnit: 'cm',
  efficiency: 0.9,
  source: '',
};

export function useHydraulicCalculation() {
  const [input, setInput] = useState<CalculationInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const performCalculation = useCallback(() => {
    const validationErrors = validateInput(input);
    setErrors(validationErrors);

    if (hasCriticalErrors(validationErrors)) {
      setResult(null);
      return;
    }

    const calculationResult = calculateHydraulicJack(input);
    setResult(calculationResult);
  }, [input]);

  useEffect(() => {
    performCalculation();
  }, [performCalculation]);

  const updateInput = useCallback((field: keyof CalculationInput, value: string | number) => {
    const oldValue = String(input[field]);
    const newValue = String(value);

    if (oldValue !== newValue) {
      setInput(prev => ({ ...prev, [field]: value }));

      const fieldNames: Record<string, string> = {
        smallPistonArea: '小活塞面积',
        smallPistonAreaUnit: '小活塞面积单位',
        largePistonArea: '大活塞面积',
        largePistonAreaUnit: '大活塞面积单位',
        inputForce: '输入力',
        inputForceUnit: '输入力单位',
        inputStroke: '输入行程',
        inputStrokeUnit: '输入行程单位',
        efficiency: '效率',
        source: '材料来源',
      };

      const correction: Correction = {
        field,
        oldValue,
        newValue,
        reason: `用户修改${fieldNames[field] || field}`,
        timestamp: Date.now(),
      };
      setCorrections(prev => [...prev.slice(-20), correction]);
    }
  }, [input]);

  const resetInput = useCallback(() => {
    setInput(DEFAULT_INPUT);
    setCorrections([]);
  }, []);

  const loadExample = useCallback((example: number) => {
    const examples: CalculationInput[] = [
      {
        smallPistonArea: 5,
        smallPistonAreaUnit: 'cm²',
        largePistonArea: 50,
        largePistonAreaUnit: 'cm²',
        inputForce: 200,
        inputForceUnit: 'N',
        inputStroke: 20,
        inputStrokeUnit: 'cm',
        efficiency: 0.92,
        source: '教材例题1',
      },
      {
        smallPistonArea: 200,
        smallPistonAreaUnit: 'mm²',
        largePistonArea: 2000,
        largePistonAreaUnit: 'mm²',
        inputForce: 1,
        inputForceUnit: 'kN',
        inputStroke: 150,
        inputStrokeUnit: 'mm',
        efficiency: 0.88,
        source: '工程案例A',
      },
      {
        smallPistonArea: 0.001,
        smallPistonAreaUnit: 'm²',
        largePistonArea: 0.05,
        largePistonAreaUnit: 'm²',
        inputForce: 50,
        inputForceUnit: 'kgf',
        inputStroke: 0.3,
        inputStrokeUnit: 'm',
        efficiency: 0.95,
        source: '大型液压系统',
      },
    ];
    const selected = examples[example % examples.length];
    setInput(selected);
    setCorrections([]);
  }, []);

  const triggerAnimation = useCallback(() => {
    if (result && result.isValid) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
    }
  }, [result]);

  return {
    input,
    result,
    errors,
    corrections,
    isAnimating,
    updateInput,
    resetInput,
    loadExample,
    triggerAnimation,
    hasCriticalErrors: hasCriticalErrors(errors),
  };
}
