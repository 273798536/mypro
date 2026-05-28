import { get, all, run } from '../database/connection';
import { PrepaymentFlow } from '../types';

export const findPrepaymentFlowById = async (id: string): Promise<PrepaymentFlow | undefined> => {
  return get<PrepaymentFlow>(`
    SELECT 
      id,
      supplier_id as supplierId,
      supplier_name as supplierName,
      contract_no as contractNo,
      prepayment_amount as prepaymentAmount,
      paid_date as paidDate,
      created_by as createdBy,
      created_at as createdAt,
      remark
    FROM prepayment_flows
    WHERE id = ?
  `, [id]);
};

export const findAllPrepaymentFlows = async (): Promise<PrepaymentFlow[]> => {
  return all<PrepaymentFlow>(`
    SELECT 
      id,
      supplier_id as supplierId,
      supplier_name as supplierName,
      contract_no as contractNo,
      prepayment_amount as prepaymentAmount,
      paid_date as paidDate,
      created_by as createdBy,
      created_at as createdAt,
      remark
    FROM prepayment_flows
    ORDER BY created_at DESC
  `);
};

export const insertPrepaymentFlow = async (flow: PrepaymentFlow): Promise<void> => {
  await run(`
    INSERT INTO prepayment_flows 
    (id, supplier_id, supplier_name, contract_no, prepayment_amount, paid_date, created_by, created_at, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    flow.id,
    flow.supplierId,
    flow.supplierName,
    flow.contractNo,
    flow.prepaymentAmount,
    flow.paidDate,
    flow.createdBy,
    flow.createdAt,
    flow.remark
  ]);
};
