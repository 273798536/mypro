import { useMemo } from 'react';
import type { Question } from '@/types';
import { topologicalSort, type TopoSortResult } from '@/utils/topoSort';

export function useTopologicalSort(questions: Question[]): TopoSortResult {
  return useMemo(() => topologicalSort(questions), [questions]);
}
