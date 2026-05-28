import { get, put } from './api';
import type {
  LoanContract,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  SubsidyRollbackRequest,
} from '../../shared/types';

interface ContractFilters {
  customerName?: string;
  contractNo?: string;
  vin?: string;
}

export const getContracts = async (
  filters?: ContractFilters,
  pagination?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<LoanContract>>> => {
  return get('/contract/list', { ...filters, ...pagination });
};

export const getContractDetail = async (id: string): Promise<ApiResponse<LoanContract>> => {
  return get<LoanContract>(`/contract/${id}`);
};

export const rollbackSubsidy = async (
  request: SubsidyRollbackRequest
): Promise<ApiResponse<LoanContract>> => {
  return put<LoanContract>(`/contract/${request.contractId}/rollback-subsidy`, request);
};
