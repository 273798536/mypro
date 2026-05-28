import { get, post } from './api';
import type { CalculationResult, GetResultsFilters, PaginatedResponse, ApiResponse, RecalculateRequest } from 'shared/types';

interface CalculationSummary {
  readyCount: number;
  needConfirmCount: number;
  cannotCalculateCount: number;
  totalReceivable: number;
  totalPayable: number;
}

export const calculationService = {
  getResults: (filters?: GetResultsFilters) =>
    get<PaginatedResponse<CalculationResult> & { summary: CalculationSummary }>('/calculation/results', filters),

  getResultById: (id: string) =>
    get<CalculationResult>(`/calculation/results/${id}`),

  recalculate: (id: string, data: RecalculateRequest) =>
    post<CalculationResult>(`/calculation/recalculate/${id}`, data),

  exportSingle: (id: string) =>
    get<Blob>(`/calculation/export/${id}`),
};
