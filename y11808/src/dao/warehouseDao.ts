import { get, all, run } from '../database/connection';
import { WarehouseReceipt, WarehouseReceiptItem, WarehouseStatus } from '../types';

export const findWarehouseReceiptById = async (id: string): Promise<WarehouseReceipt | undefined> => {
  return get<WarehouseReceipt>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      receipt_no as receiptNo,
      receipt_date as receiptDate,
      total_amount as totalAmount,
      total_quantity as totalQuantity,
      status,
      parent_receipt_id as parentReceiptId,
      created_by as createdBy,
      created_at as createdAt,
      remark
    FROM warehouse_receipts
    WHERE id = ?
  `, [id]);
};

export const findWarehouseReceiptsByPrepaymentFlowId = async (flowId: string): Promise<WarehouseReceipt[]> => {
  return all<WarehouseReceipt>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      receipt_no as receiptNo,
      receipt_date as receiptDate,
      total_amount as totalAmount,
      total_quantity as totalQuantity,
      status,
      parent_receipt_id as parentReceiptId,
      created_by as createdBy,
      created_at as createdAt,
      remark
    FROM warehouse_receipts
    WHERE prepayment_flow_id = ?
    ORDER BY created_at DESC
  `, [flowId]);
};

export const findWarehouseReceiptItemsByReceiptId = async (receiptId: string): Promise<WarehouseReceiptItem[]> => {
  return all<WarehouseReceiptItem>(`
    SELECT 
      id,
      receipt_id as receiptId,
      material_code as materialCode,
      material_name as materialName,
      quantity,
      unit_price as unitPrice,
      amount
    FROM warehouse_receipt_items
    WHERE receipt_id = ?
  `, [receiptId]);
};

export const insertWarehouseReceipt = async (receipt: WarehouseReceipt): Promise<void> => {
  await run(`
    INSERT INTO warehouse_receipts 
    (id, prepayment_flow_id, receipt_no, receipt_date, total_amount, total_quantity, status, parent_receipt_id, created_by, created_at, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    receipt.id,
    receipt.prepaymentFlowId,
    receipt.receiptNo,
    receipt.receiptDate,
    receipt.totalAmount,
    receipt.totalQuantity,
    receipt.status,
    receipt.parentReceiptId,
    receipt.createdBy,
    receipt.createdAt,
    receipt.remark
  ]);
};

export const insertWarehouseReceiptItem = async (item: WarehouseReceiptItem): Promise<void> => {
  await run(`
    INSERT INTO warehouse_receipt_items 
    (id, receipt_id, material_code, material_name, quantity, unit_price, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    item.id,
    item.receiptId,
    item.materialCode,
    item.materialName,
    item.quantity,
    item.unitPrice,
    item.amount
  ]);
};

export const updateWarehouseReceiptStatus = async (id: string, status: WarehouseStatus): Promise<void> => {
  await run(`
    UPDATE warehouse_receipts 
    SET status = ?
    WHERE id = ?
  `, [status, id]);
};
