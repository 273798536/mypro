import { get } from './api';
import type { AuditHistory } from 'shared/types';

export const auditService = {
  getHistory: (recordId: string) =>
    get<AuditHistory[]>(`/audit-history/${recordId}`),
};
