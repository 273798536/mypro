import { get, all, run } from '../database/connection';
import { VerificationRecord, VerificationStatus } from '../types';

export const findVerificationById = async (id: string): Promise<VerificationRecord | undefined> => {
  return get<VerificationRecord>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      invoice_id as invoiceId,
      warehouse_receipt_id as warehouseReceiptId,
      verified_amount as verifiedAmount,
      verification_date as verificationDate,
      status,
      created_by as createdBy,
      created_at as createdAt,
      reversed_by_id as reversedById,
      reversed_at as reversedAt,
      reverse_reason as reverseReason
    FROM verification_records
    WHERE id = ?
  `, [id]);
};

export const findVerificationsByPrepaymentFlowId = async (flowId: string): Promise<VerificationRecord[]> => {
  return all<VerificationRecord>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      invoice_id as invoiceId,
      warehouse_receipt_id as warehouseReceiptId,
      verified_amount as verifiedAmount,
      verification_date as verificationDate,
      status,
      created_by as createdBy,
      created_at as createdAt,
      reversed_by_id as reversedById,
      reversed_at as reversedAt,
      reverse_reason as reverseReason
    FROM verification_records
    WHERE prepayment_flow_id = ?
    ORDER BY created_at DESC
  `, [flowId]);
};

export const findVerificationsByInvoiceId = async (invoiceId: string): Promise<VerificationRecord[]> => {
  return all<VerificationRecord>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      invoice_id as invoiceId,
      warehouse_receipt_id as warehouseReceiptId,
      verified_amount as verifiedAmount,
      verification_date as verificationDate,
      status,
      created_by as createdBy,
      created_at as createdAt,
      reversed_by_id as reversedById,
      reversed_at as reversedAt,
      reverse_reason as reverseReason
    FROM verification_records
    WHERE invoice_id = ? AND status != 'reversed'
    ORDER BY created_at DESC
  `, [invoiceId]);
};

export const insertVerification = async (verification: VerificationRecord): Promise<void> => {
  await run(`
    INSERT INTO verification_records 
    (id, prepayment_flow_id, invoice_id, warehouse_receipt_id, verified_amount, verification_date, status, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    verification.id,
    verification.prepaymentFlowId,
    verification.invoiceId,
    verification.warehouseReceiptId || null,
    verification.verifiedAmount,
    verification.verificationDate,
    verification.status,
    verification.createdBy,
    verification.createdAt
  ]);
};

export const updateVerificationStatus = async (
  id: string, 
  status: VerificationStatus, 
  reversedById?: string, 
  reversedAt?: string, 
  reverseReason?: string
): Promise<void> => {
  await run(`
    UPDATE verification_records 
    SET status = ?, reversed_by_id = ?, reversed_at = ?, reverse_reason = ?
    WHERE id = ?
  `, [status, reversedById || null, reversedAt || null, reverseReason || null, id]);
};

export const getTotalVerifiedAmount = async (flowId: string): Promise<number> => {
  const result = await get<{ total: number }>(`
    SELECT COALESCE(SUM(verified_amount), 0) as total
    FROM verification_records
    WHERE prepayment_flow_id = ? AND status = 'verified'
  `, [flowId]);
  return result?.total || 0;
};
