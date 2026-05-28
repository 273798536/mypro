import { get, all, run } from '../database/connection';
import { Invoice, InvoiceStatus } from '../types';

export const findInvoiceById = async (id: string): Promise<Invoice | undefined> => {
  return get<Invoice>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      invoice_no as invoiceNo,
      invoice_date as invoiceDate,
      invoice_amount as invoiceAmount,
      tax_amount as taxAmount,
      status,
      original_invoice_id as originalInvoiceId,
      red_flush_date as redFlushDate,
      created_by as createdBy,
      created_at as createdAt,
      remark
    FROM invoices
    WHERE id = ?
  `, [id]);
};

export const findInvoicesByPrepaymentFlowId = async (flowId: string): Promise<Invoice[]> => {
  return all<Invoice>(`
    SELECT 
      id,
      prepayment_flow_id as prepaymentFlowId,
      invoice_no as invoiceNo,
      invoice_date as invoiceDate,
      invoice_amount as invoiceAmount,
      tax_amount as taxAmount,
      status,
      original_invoice_id as originalInvoiceId,
      red_flush_date as redFlushDate,
      created_by as createdBy,
      created_at as createdAt,
      remark
    FROM invoices
    WHERE prepayment_flow_id = ?
    ORDER BY created_at DESC
  `, [flowId]);
};

export const insertInvoice = async (invoice: Invoice): Promise<void> => {
  await run(`
    INSERT INTO invoices 
    (id, prepayment_flow_id, invoice_no, invoice_date, invoice_amount, tax_amount, status, original_invoice_id, red_flush_date, created_by, created_at, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    invoice.id,
    invoice.prepaymentFlowId,
    invoice.invoiceNo,
    invoice.invoiceDate,
    invoice.invoiceAmount,
    invoice.taxAmount,
    invoice.status,
    invoice.originalInvoiceId,
    invoice.redFlushDate,
    invoice.createdBy,
    invoice.createdAt,
    invoice.remark
  ]);
};

export const updateInvoiceStatus = async (id: string, status: InvoiceStatus, redFlushDate?: string): Promise<void> => {
  await run(`
    UPDATE invoices 
    SET status = ?, red_flush_date = ?
    WHERE id = ?
  `, [status, redFlushDate || null, id]);
};
