import { create } from 'zustand';
import type { AppStore, PartitionConditions, ProblemResult } from '../types';
import { generatePartitions } from '../algorithms/partition';
import { deduplicateAndSort } from '../algorithms/deduplication';
import { compareAnswers } from '../algorithms/compare';
import { detectAnomalies } from '../algorithms/detection';
import { parseBatchInput } from '../utils/validator';

const defaultConditions: PartitionConditions = {
  allowDuplicate: false
};

export const usePartitionStore = create<AppStore>((set, get) => ({
  rawInput: '',
  globalConditions: defaultConditions,
  problems: [],
  errors: [],
  isGenerating: false,
  progress: 0,

  setRawInput: (input: string) => {
    set({ rawInput: input });
  },

  setGlobalConditions: (conditions: PartitionConditions) => {
    set({ globalConditions: conditions });
  },

  generateAll: async () => {
    const { rawInput, globalConditions } = get();
    set({ isGenerating: true, progress: 0 });

    const { problems: parsedProblems, errors } = parseBatchInput(rawInput, globalConditions);
    set({ errors });

    const results: ProblemResult[] = [];

    for (let i = 0; i < parsedProblems.length; i++) {
      const problem = parsedProblems[i];

      const result: ProblemResult = {
        problemId: problem.id,
        input: problem,
        partitions: [],
        rawPartitions: [],
        recursionSteps: [],
        dedupSteps: [],
        answerComparison: {
          correctAnswers: [],
          wrongAnswers: [],
          missedAnswers: [],
          duplicateAnswers: []
        },
        warnings: [],
        isProcessing: true
      };

      results.push(result);
      set({ problems: [...results] });

      await new Promise(resolve => setTimeout(resolve, 50));

      const rawPartitions = generatePartitions(problem.targetNumber, problem.conditions);
      result.rawPartitions = rawPartitions;

      const { partitions, steps } = deduplicateAndSort(rawPartitions);
      result.partitions = partitions;
      result.dedupSteps = steps;

      result.answerComparison = compareAnswers(problem.studentAnswer, partitions);

      result.warnings = detectAnomalies(result);
      result.isProcessing = false;

      set({ progress: (i + 1) / parsedProblems.length * 100 });
    }

    set({ problems: results, isGenerating: false, progress: 100 });
  },

  confirmWarning: (warningId: string) => {
    set(state => ({
      problems: state.problems.map(p => ({
        ...p,
        warnings: p.warnings.map(w =>
          w.id === warningId ? { ...w, confirmed: true } : w
        )
      }))
    }));
  },

  clearAll: () => {
    set({
      rawInput: '',
      problems: [],
      errors: [],
      isGenerating: false,
      progress: 0
    });
  }
}));
