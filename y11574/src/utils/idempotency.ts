import crypto from 'crypto';
import { DataSource } from '../types';

export function generateIdempotencyKey(
  ticketId: string,
  dataSources: DataSource[],
  sourceIds: {
    sessionSummaryId?: string;
    slaRuleId?: string;
    compensationApprovalId?: string;
    supplierStatementId?: string;
    approvalEmailId?: string;
  } = {}
): string {
  const components = [
    ticketId,
    ...dataSources.sort().join(','),
    sourceIds.sessionSummaryId || '',
    sourceIds.slaRuleId || '',
    sourceIds.compensationApprovalId || '',
    sourceIds.supplierStatementId || '',
    sourceIds.approvalEmailId || ''
  ].filter(Boolean).join('|');

  return crypto.createHash('sha256').update(components).digest('hex');
}

export function generateIdempotencyKeyFromBatch(
  batchIdentifier: string,
  batchDate: string
): string {
  const components = [batchIdentifier, batchDate].join('|');
  return crypto.createHash('sha256').update(components).digest('hex');
}
