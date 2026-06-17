import { useState, useCallback, useMemo, useEffect } from 'react';
import { CalculationParameters, CalculationOutput, CalculationResult } from '@/types/experiment';
import { DEFAULT_PARAMETERS, PARAMETER_LEVELS, PARAMETER_RANGES, LEVEL_LABELS } from '@/constants/parameters';
import { performCalculation as calculateOutput, performBoundaryAnalysis, getFormulaForResult } from '@/utils/calculationEngine';
import { useExperimentStore } from '@/store/useExperimentStore';

export const useCalculation = (recordId?: string | null, initialParameters?: CalculationParameters) => {
  const [parameters, setParameters] = useState<CalculationParameters>(initialParameters || DEFAULT_PARAMETERS);
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultHistory, setResultHistory] = useState<CalculationOutput[]>([]);
  const [gearLevel, setGearLevel] = useState<number>(2);
  const [currentResult, setCurrentResult] = useState<CalculationResult | null>(null);
  
  const performCalculationForRecord = useExperimentStore(state => state.performCalculationForRecord);
  const addOperationLog = useExperimentStore(state => state.addOperationLog);
  const getResultsForRecord = useExperimentStore(state => state.getResultsForRecord);
  const selectResult = useExperimentStore(state => state.selectResult);

  useEffect(() => {
    if (recordId) {
      const results = getResultsForRecord(recordId);
      if (results.length > 0) {
        setCurrentResult(results[results.length - 1]);
        selectResult(results[results.length - 1].id);
      }
    }
  }, [recordId, getResultsForRecord, selectResult]);

  const boundaryAnalysis = useMemo(() => {
    if (!currentResult) return null;
    return currentResult.boundaryAnalysis;
  }, [currentResult]);

  const sensitivityReport = useMemo(() => {
    if (!boundaryAnalysis) return null;
    return boundaryAnalysis.sensitivityReport;
  }, [boundaryAnalysis]);
  
  const setParameterLevel = useCallback((level: 'level1' | 'level2' | 'level3') => {
    const levelParams = PARAMETER_LEVELS[level];
    setParameters(prev => ({
      ...prev,
      ...levelParams,
      parameterLevel: level,
    }));
  }, []);

  const applyGearShift = useCallback((gear: number) => {
    const levels: ('level1' | 'level2' | 'level3')[] = ['level1', 'level2', 'level3'];
    const normalizedGear = Math.max(1, Math.min(3, gear));
    setGearLevel(normalizedGear);
    setParameterLevel(levels[normalizedGear - 1]);
  }, [setParameterLevel]);
  
  const updateParameter = useCallback(<K extends keyof CalculationParameters>(
    key: K,
    value: CalculationParameters[K]
  ) => {
    setParameters(prev => {
      const updated = { ...prev, [key]: value, parameterLevel: 'custom' as const };
      return updated;
    });
  }, []);
  
  const resetToDefault = useCallback(() => {
    setParameters(DEFAULT_PARAMETERS);
    setGearLevel(2);
  }, []);

  const resetToDefaults = resetToDefault;
  
  const performCalculationHandler = useCallback(async (params: CalculationParameters) => {
    if (!recordId) return null;

    setIsCalculating(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const beforeParams = { ...parameters };
      const result = performCalculationForRecord(recordId, params);

      if (result) {
        setCurrentResult(result);
        selectResult(result.id);
        setResultHistory(prev => [result.result, ...prev].slice(0, 10));

        addOperationLog(
          result.id,
          'parameter_change',
          beforeParams,
          params,
          `参数调节：${LEVEL_LABELS[params.parameterLevel] || '自定义'}`
        );
      }

      return result;
    } finally {
      setIsCalculating(false);
    }
  }, [recordId, parameters, performCalculationForRecord, selectResult, addOperationLog]);

  const executeCalculation = performCalculationHandler;

  const getPreviewResult = useMemo(() => {
    return calculateOutput(parameters);
  }, [parameters]);

  const getFormula = useCallback((resultKey: keyof CalculationOutput, result: number) => {
    return getFormulaForResult(resultKey, parameters, result);
  }, [parameters]);

  const getBoundaryAnalysis = useCallback((baseResult: CalculationOutput) => {
    return performBoundaryAnalysis(parameters, baseResult);
  }, [parameters]);

  const compareWithLevel = useCallback((level: 'level1' | 'level2' | 'level3') => {
    const levelParams = { ...DEFAULT_PARAMETERS, ...PARAMETER_LEVELS[level], parameterLevel: level } as CalculationParameters;
    const currentResult = calculateOutput(parameters);
    const levelResult = calculateOutput(levelParams);
    
    const diff: Record<string, { current: number; level: number; diff: number; diffPercent: number }> = {};
    
    (['liftCoefficient', 'dragCoefficient', 'reynoldsNumber', 'flowVelocity'] as const).forEach(key => {
      const current = currentResult[key] as number;
      const levelVal = levelResult[key] as number;
      diff[key] = {
        current,
        level: levelVal,
        diff: current - levelVal,
        diffPercent: levelVal !== 0 ? ((current - levelVal) / levelVal * 100) : 0,
      };
    });
    
    return {
      level,
      parameters: levelParams,
      currentResult,
      levelResult,
      differences: diff,
    };
  }, [parameters]);
  
  const validateParameters = useCallback(() => {
    const errors: string[] = [];
    
    (Object.keys(parameters) as (keyof CalculationParameters)[]).forEach(key => {
      if (key === 'parameterLevel') return;
      
      const value = parameters[key] as number;
      const range = PARAMETER_RANGES[key];
      
      if (value < range.min || value > range.max) {
        errors.push(`${key} 超出范围: ${value} ${range.unit} (允许: ${range.min}-${range.max} ${range.unit})`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }, [parameters]);
  
  return {
    parameters,
    setParameters,
    isCalculating,
    resultHistory,
    setParameterLevel,
    updateParameter,
    resetToDefault,
    resetToDefaults,
    executeCalculation,
    performCalculation: executeCalculation,
    getPreviewResult,
    getFormula,
    getBoundaryAnalysis,
    compareWithLevel,
    validateParameters,
    gearLevel,
    applyGearShift,
    currentResult,
    boundaryAnalysis,
    sensitivityReport,
  };
};
