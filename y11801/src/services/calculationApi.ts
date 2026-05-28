import { get, post } from './api';
import type {
  CalculationResult,
  GetResultsFilters,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
} from '../../shared/types';

interface CalculationSummary {
  readyCount: number;
  needConfirmCount: number;
  cannotCalculateCount: number;
  totalReceivable: number;
  totalPayable: number;
}

export const getCalculationResults = async (
  filters?: GetResultsFilters,
  pagination?: PaginationParams
): Promise<
  ApiResponse<
    PaginatedResponse<CalculationResult> & {
      summary: CalculationSummary;
    }
  >
> => {
  return get('/calculation/results', { ...filters, ...pagination });
};

export const getCalculationResultDetail = async (
  id: string
): Promise<ApiResponse<CalculationResult>> => {
  return get<CalculationResult>(`/calculation/results/${id}`);
};

export const recalculate = async (
  id: string,
  reason: string,
  operator: string
): Promise<ApiResponse<CalculationResult>> => {
  return post<CalculationResult>(`/calculation/recalculate/${id}`, { reason, operator });
};
