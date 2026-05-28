import { get, put, post } from './api';
import type { LoanContract, SubsidyRollbackRequest } from 'shared/types';

export const contractService = {
  getById: (id: string) =>
    get<LoanContract>(`/contract/${id}`),

  update: (id: string, data: Partial<LoanContract>) =>
    put<LoanContract>(`/contract/${id}`, data),

  rollbackSubsidy: (id: string, data: SubsidyRollbackRequest) =>
    post<LoanContract>(`/contract/${id}/subsidy-rollback`, data),
};
