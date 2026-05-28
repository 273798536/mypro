import { run } from './connection';
import { v4 as uuidv4 } from 'uuid';

export const insertSampleData = async (): Promise<void> => {
  const now = new Date().toISOString();

  const prepaymentFlowId1 = uuidv4();
  const prepaymentFlowId2 = uuidv4();
  const prepaymentFlowId3 = uuidv4();

  await run(`
    INSERT INTO prepayment_flows (id, supplier_id, supplier_name, contract_no, prepayment_amount, paid_date, created_by, created_at, remark)
    VALUES 
      (?, 'SUP001', '华为技术有限公司', 'HT202405001', 100000.00, '2024-05-01', 'admin', ?, '首批原材料采购预付款'),
      (?, 'SUP002', '中兴通讯股份有限公司', 'HT202405002', 50000.00, '2024-05-10', 'admin', ?, '设备采购预付款'),
      (?, 'SUP003', '阿里巴巴集团', 'HT202405003', 80000.00, '2024-05-15', 'admin', ?, '云服务预付款')
  `, [prepaymentFlowId1, now, prepaymentFlowId2, now, prepaymentFlowId3, now]);

  const invoiceId1 = uuidv4();
  const invoiceId2 = uuidv4();
  const invoiceId3 = uuidv4();

  await run(`
    INSERT INTO invoices (id, prepayment_flow_id, invoice_no, invoice_date, invoice_amount, tax_amount, status, created_by, created_at, remark)
    VALUES 
      (?, ?, 'INV202405001', '2024-05-15', 40000.00, 5200.00, 'normal', 'finance', ?, '第一批货物发票'),
      (?, ?, 'INV202405002', '2024-05-20', 35000.00, 4550.00, 'normal', 'finance', ?, '第二批货物发票'),
      (?, ?, 'INV202405003', '2024-05-18', 25000.00, 3250.00, 'normal', 'finance', ?, '设备部分开票')
  `, [invoiceId1, prepaymentFlowId1, now, invoiceId2, prepaymentFlowId1, now, invoiceId3, prepaymentFlowId2, now]);

  const receiptId1 = uuidv4();
  const receiptId2 = uuidv4();
  const receiptId3 = uuidv4();

  await run(`
    INSERT INTO warehouse_receipts (id, prepayment_flow_id, receipt_no, receipt_date, total_amount, total_quantity, status, created_by, created_at, remark)
    VALUES 
      (?, ?, 'RK202405001', '2024-05-16', 38000.00, 100.00, 'normal', 'warehouse', ?, '第一批入库'),
      (?, ?, 'RK202405002', '2024-05-21', 32000.00, 80.00, 'normal', 'warehouse', ?, '第二批入库'),
      (?, ?, 'RK202405003', '2024-05-19', 24000.00, 50.00, 'normal', 'warehouse', ?, '设备入库')
  `, [receiptId1, prepaymentFlowId1, now, receiptId2, prepaymentFlowId1, now, receiptId3, prepaymentFlowId2, now]);

  const itemId1 = uuidv4();
  const itemId2 = uuidv4();
  const itemId3 = uuidv4();

  await run(`
    INSERT INTO warehouse_receipt_items (id, receipt_id, material_code, material_name, quantity, unit_price, amount)
    VALUES 
      (?, ?, 'MAT001', '芯片A', 50.00, 400.00, 20000.00),
      (?, ?, 'MAT002', '芯片B', 50.00, 360.00, 18000.00),
      (?, ?, 'MAT001', '芯片A', 80.00, 400.00, 32000.00)
  `, [itemId1, receiptId1, itemId2, receiptId1, itemId3, receiptId2]);

  const penaltyId1 = uuidv4();

  await run(`
    INSERT INTO penalty_records (id, prepayment_flow_id, penalty_type, penalty_amount, penalty_date, reason, created_by, created_at)
    VALUES 
      (?, ?, 'delay', 2000.00, '2024-05-18', '第一批货物延迟到货3天', 'quality', ?)
  `, [penaltyId1, prepaymentFlowId1, now]);

  const verificationId1 = uuidv4();

  await run(`
    INSERT INTO verification_records (id, prepayment_flow_id, invoice_id, warehouse_receipt_id, verified_amount, verification_date, status, created_by, created_at)
    VALUES 
      (?, ?, ?, ?, 38000.00, '2024-05-22', 'verified', 'finance', ?)
  `, [verificationId1, prepaymentFlowId1, invoiceId1, receiptId1, now]);

  const ledgerId1 = uuidv4();
  const ledgerId2 = uuidv4();
  const ledgerId3 = uuidv4();
  const ledgerId4 = uuidv4();

  await run(`
    INSERT INTO prepayment_ledgers (id, prepayment_flow_id, transaction_type, transaction_date, debit_amount, credit_amount, balance, reference_id, reference_type, created_by, created_at, remark)
    VALUES 
      (?, ?, 'prepayment', '2024-05-01', 100000.00, 0.00, 100000.00, ?, 'prepayment_flow', 'admin', ?, '预付款入账'),
      (?, ?, 'penalty', '2024-05-18', 0.00, 2000.00, 98000.00, ?, 'penalty', 'quality', ?, '延迟扣罚'),
      (?, ?, 'verification', '2024-05-22', 0.00, 38000.00, 60000.00, ?, 'verification', 'finance', ?, '第一批核销'),
      (?, ?, 'prepayment', '2024-05-10', 50000.00, 0.00, 50000.00, ?, 'prepayment_flow', 'admin', ?, '预付款入账')
  `, [
    ledgerId1, prepaymentFlowId1, prepaymentFlowId1, now,
    ledgerId2, prepaymentFlowId1, penaltyId1, now,
    ledgerId3, prepaymentFlowId1, verificationId1, now,
    ledgerId4, prepaymentFlowId2, prepaymentFlowId2, now
  ]);

  console.log('样例数据插入完成');
};
