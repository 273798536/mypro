import { get, all, run } from '../database/connection';
import { PenaltyRecord } from '../types';

export const findPenaltyById = async (id: string): Promise<PenaltyRecord | undefined> => {
  return get<PenaltyRecord>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      penalty_type as penaltyType,
      penalty_amount as penaltyAmount,
      penalty_date as penaltyDate,
      reason,
      created_by as createdBy,
      created_at as createdAt
    FROM penalty_records
    WHERE id = ?
  `, [id]);
};

export const findPenaltiesByPrepaymentFlowId = async (flowId: string): Promise<PenaltyRecord[]> => {
  return all<PenaltyRecord>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      penalty_type as penaltyType,
      penalty_amount as penaltyAmount,
      penalty_date as penaltyDate,
      reason,
      created_by as createdBy,
      created_at as createdAt
    FROM penalty_records
    WHERE prepayment_flow_id = ?
    ORDER BY created_at DESC
  `, [flowId]);
};

export const insertPenalty = async (penalty: PenaltyRecord): Promise<void> => {
  await run(`
    INSERT INTO penalty_records 
    (id, prepayment_flow_id, penalty_type, penalty_amount, penalty_date, reason, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    penalty.id,
    penalty.prepaymentFlowId,
    penalty.penaltyType,
    penalty.penaltyAmount,
    penalty.penaltyDate,
    penalty.reason,
    penalty.createdBy,
    penalty.createdAt
  ]);
};

export const getTotalPenaltyAmount = async (flowId: string): Promise<number> => {
  const result = await get<{ total: number }>(`
    SELECT COALESCE(SUM(penalty_amount), 0) as total
    FROM penalty_records
    WHERE prepayment_flow_id = ?
  `, [flowId]);
  return result?.total || 0;
};
