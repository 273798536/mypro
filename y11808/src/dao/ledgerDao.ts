import { get, all, run } from '../database/connection';
import { PrepaymentLedger } from '../types';

export const findLedgerById = async (id: string): Promise<PrepaymentLedger | undefined> => {
  return get<PrepaymentLedger>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      transaction_type as transactionType,
      transaction_date as transactionDate,
      debit_amount as debitAmount,
      credit_amount as creditAmount,
      balance,
      reference_id as referenceId,
      reference_type as referenceType,
      created_by as createdBy,
      created_at as createdAt,
      remark
    FROM prepayment_ledgers
    WHERE id = ?
  `, [id]);
};

export const findLedgersByPrepaymentFlowId = async (flowId: string): Promise<PrepaymentLedger[]> => {
  return all<PrepaymentLedger>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      transaction_type as transactionType,
      transaction_date as transactionDate,
      debit_amount as debitAmount,
      credit_amount as creditAmount,
      balance,
      reference_id as referenceId,
      reference_type as referenceType,
      created_by as createdBy,
      created_at as createdAt,
      remark
    FROM prepayment_ledgers
    WHERE prepayment_flow_id = ?
    ORDER BY created_at ASC
  `, [flowId]);
};

export const findLatestLedger = async (flowId: string): Promise<PrepaymentLedger | undefined> => {
  return get<PrepaymentLedger>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      transaction_type as transactionType,
      transaction_date as transactionDate,
      debit_amount as debitAmount,
      credit_amount as creditAmount,
      balance,
      reference_id as referenceId,
      reference_type as referenceType,
      created_by as createdBy,
      created_at as createdAt,
      remark
    FROM prepayment_ledgers
    WHERE prepayment_flow_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `, [flowId]);
};

export const insertLedger = async (ledger: PrepaymentLedger): Promise<void> => {
  await run(`
    INSERT INTO prepayment_ledgers 
    (id, prepayment_flow_id, transaction_type, transaction_date, debit_amount, credit_amount, balance, reference_id, reference_type, created_by, created_at, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    ledger.id,
    ledger.prepaymentFlowId,
    ledger.transactionType,
    ledger.transactionDate,
    ledger.debitAmount,
    ledger.creditAmount,
    ledger.balance,
    ledger.referenceId,
    ledger.referenceType,
    ledger.createdBy,
    ledger.createdAt,
    ledger.remark
  ]);
};

export const getCurrentBalance = async (flowId: string): Promise<number> => {
  const latest = await findLatestLedger(flowId);
  return latest?.balance || 0;
};
