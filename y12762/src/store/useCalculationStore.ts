import { create } from 'zustand';
import type {
  CalculationResult,
  BatchRecord,
  Reagent,
  SolubilityPoint,
  ResultType,
} from '../types';
import {
  generateSolubilityCurve,
  getSolubilityExplanation,
  calculateSolubility,
} from '../utils/calculator/solubility';
import {
  convertConcentration,
  getConcentrationExplanation,
} from '../utils/calculator/concentration';
import { balanceEquation } from '../utils/calculator/balancing';

interface CalculationState {
  results: CalculationResult[];
  currentSolubilityCurves: Record<string, SolubilityPoint[]>;
  isCalculating: boolean;
  runAllCalculations: (batch: BatchRecord) => CalculationResult[];
  calculateSolubilityCurve: (reagent: Reagent) => { curve: SolubilityPoint[]; result: CalculationResult };
  runConcentrationConversion: (
    reagent: Reagent,
    targetUnit: Reagent['concentrationUnit']
  ) => CalculationResult;
  runBalancing: (
    batchId: string,
    reactants: string[],
    products: string[]
  ) => CalculationResult;
  getResultsByType: (type: ResultType) => CalculationResult[];
  clearResults: () => void;
}

export const useCalculationStore = create<CalculationState>((set, get) => ({
  results: [],
  currentSolubilityCurves: {},
  isCalculating: false,

  runAllCalculations: (batch) => {
    set({ isCalculating: true });
    const allResults: CalculationResult[] = [];
    const curves: Record<string, SolubilityPoint[]> = {};

    batch.reagents.forEach((reagent) => {
      const { curve, result } = get().calculateSolubilityCurve(reagent);
      curves[reagent.id] = curve;
      allResults.push(result);
    });

    set({
      results: allResults,
      currentSolubilityCurves: curves,
      isCalculating: false,
    });

    return allResults;
  },

  calculateSolubilityCurve: (reagent) => {
    const curve = generateSolubilityCurve(reagent.name);
    const solubility = calculateSolubility(reagent.name, reagent.temperature);
    const { explanation, detailedExplanation } = getSolubilityExplanation(
      { ...reagent, solubility },
      curve
    );

    const result: CalculationResult = {
      id: `result-solubility-${reagent.id}-${Date.now()}`,
      batchId: '',
      type: 'solubility_curve',
      rawData: {
        reagentName: reagent.name,
        temperature: reagent.temperature,
        solubility,
        curve,
      },
      explanation,
      detailedExplanation,
      calculatedAt: Date.now(),
    };

    set((state) => ({
      currentSolubilityCurves: {
        ...state.currentSolubilityCurves,
        [reagent.id]: curve,
      },
      results: [...state.results, result],
    }));

    return { curve, result };
  },

  runConcentrationConversion: (reagent, targetUnit) => {
    const convResult = convertConcentration(
      reagent.concentration,
      reagent.concentrationUnit,
      targetUnit,
      reagent.molarMass
    );
    const { explanation, detailedExplanation } = getConcentrationExplanation(
      convResult,
      reagent.name
    );

    const result: CalculationResult = {
      id: `result-conv-${reagent.id}-${Date.now()}`,
      batchId: '',
      type: 'concentration_conversion',
      rawData: {
        reagentName: reagent.name,
        conversion: convResult,
      },
      explanation,
      detailedExplanation,
      calculatedAt: Date.now(),
    };

    set((state) => ({ results: [...state.results, result] }));
    return result;
  },

  runBalancing: (batchId, reactants, products) => {
    const balancingResult = balanceEquation(reactants, products);
    const result: CalculationResult = {
      id: `result-balance-${Date.now()}`,
      batchId,
      type: 'balancing',
      rawData: {
        equation: balancingResult.equation,
      },
      explanation: balancingResult.explanation,
      detailedExplanation: balancingResult.detailedExplanation,
      calculatedAt: Date.now(),
    };

    set((state) => ({ results: [...state.results, result] }));
    return result;
  },

  getResultsByType: (type) => {
    return get().results.filter((r) => r.type === type);
  },

  clearResults: () => {
    set({ results: [], currentSolubilityCurves: {} });
  },
}));
