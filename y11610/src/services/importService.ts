import { db } from '../db/dexie';
import {
  CustomerOrder,
  BankStatement,
  PlatformBill,
  ExchangeRate,
  ImportType,
  Currency,
} from '../types';
import {
  validateCustomerOrder,
  validateBankStatement,
  validatePlatformBill,
  validateExchangeRate,
  isCurrency,
} from '../utils/validators';
import { getNow } from '../utils/date';

export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: string[];
}

export async function importOrders(
  data: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, duplicates: 0, errors: [] };
  const existingOrders = await db.customerOrders.toArray();
  const existingOrderNos = new Set(existingOrders.map((o) => o.orderNo));

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];
      const orderData = {
        orderNo: row[mapping.orderNo || '订单号'] || row[mapping.orderNo] || '',
        customerName: row[mapping.customerName || '客户名称'] || row[mapping.customerName] || '',
        currency: (row[mapping.currency || '币种'] || 'USD') as Currency,
        amount: parseFloat(row[mapping.amount || '金额'] || '0'),
        orderDate: row[mapping.orderDate || '订单日期'] || '',
        source: row[mapping.source || '来源'] || '导入',
      };

      if (!isCurrency(orderData.currency)) {
        result.errors.push(`第 ${i + 1} 行：币种 ${orderData.currency} 不支持`);
        result.failed++;
        continue;
      }

      if (existingOrderNos.has(orderData.orderNo)) {
        result.duplicates++;
        result.errors.push(`第 ${i + 1} 行：订单号 ${orderData.orderNo} 已存在`);
        continue;
      }

      const validation = validateCustomerOrder(orderData);
      if (!validation.success) {
        result.errors.push(`第 ${i + 1} 行：${validation.error.issues[0].message}`);
        result.failed++;
        continue;
      }

      const order: CustomerOrder = {
        id: crypto.randomUUID(),
        ...orderData,
        createdAt: getNow(),
      };

      await db.customerOrders.add(order);
      existingOrderNos.add(order.orderNo);
      result.success++;
    } catch (error) {
      result.errors.push(`第 ${i + 1} 行：导入失败 - ${(error as Error).message}`);
      result.failed++;
    }
  }

  return result;
}

export async function importStatements(
  data: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, duplicates: 0, errors: [] };
  const existingStatements = await db.bankStatements.toArray();
  const existingRefNos = new Set(existingStatements.map((s) => s.referenceNo));

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];
      const stmtData = {
        referenceNo: row[mapping.referenceNo || '水单号'] || row[mapping.transactionNo || '交易号'] || '',
        transactionDate: row[mapping.transactionDate || '交易日期'] || '',
        currency: (row[mapping.currency || '币种'] || 'CNY') as Currency,
        receivedAmount: parseFloat(row[mapping.receivedAmount || '到账金额'] || row[mapping.amount || '金额'] || '0'),
        bank: row[mapping.bank || '银行'] || row[mapping.bankAccount || '银行账户'] || '',
        payerInfo: row[mapping.payerInfo || '付款人信息'] || '',
        source: row[mapping.source || '来源'] || '导入',
      };

      if (!isCurrency(stmtData.currency)) {
        result.errors.push(`第 ${i + 1} 行：币种 ${stmtData.currency} 不支持`);
        result.failed++;
        continue;
      }

      if (existingRefNos.has(stmtData.referenceNo)) {
        result.duplicates++;
        result.errors.push(`第 ${i + 1} 行：水单号 ${stmtData.referenceNo} 已存在`);
        continue;
      }

      const validation = validateBankStatement(stmtData);
      if (!validation.success) {
        result.errors.push(`第 ${i + 1} 行：${validation.error.issues[0].message}`);
        result.failed++;
        continue;
      }

      const statement: BankStatement = {
        id: crypto.randomUUID(),
        ...stmtData,
        createdAt: getNow(),
      };

      await db.bankStatements.add(statement);
      existingRefNos.add(statement.referenceNo);
      result.success++;
    } catch (error) {
      result.errors.push(`第 ${i + 1} 行：导入失败 - ${(error as Error).message}`);
      result.failed++;
    }
  }

  return result;
}

export async function importBills(
  data: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, duplicates: 0, errors: [] };
  const existingBills = await db.platformBills.toArray();
  const existingBillNos = new Set(existingBills.map((b) => b.billNo));

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];
      const billData = {
        billNo: row[mapping.billNo || '账单号'] || '',
        platform: row[mapping.platform || '平台'] || '',
        billDate: row[mapping.billDate || '账单日期'] || '',
        currency: (row[mapping.currency || '币种'] || 'USD') as Currency,
        grossAmount: parseFloat(row[mapping.grossAmount || '总金额'] || '0'),
        feeAmount: parseFloat(row[mapping.feeAmount || '手续费'] || '0'),
        netAmount: parseFloat(row[mapping.netAmount || '净金额'] || '0'),
        orderNo: row[mapping.orderNo || '关联订单'] || '',
        source: row[mapping.source || '来源'] || '导入',
      };

      if (!isCurrency(billData.currency)) {
        result.errors.push(`第 ${i + 1} 行：币种 ${billData.currency} 不支持`);
        result.failed++;
        continue;
      }

      if (existingBillNos.has(billData.billNo)) {
        result.duplicates++;
        result.errors.push(`第 ${i + 1} 行：账单号 ${billData.billNo} 已存在`);
        continue;
      }

      const validation = validatePlatformBill(billData);
      if (!validation.success) {
        result.errors.push(`第 ${i + 1} 行：${validation.error.issues[0].message}`);
        result.failed++;
        continue;
      }

      const bill: PlatformBill = {
        id: crypto.randomUUID(),
        ...billData,
        createdAt: getNow(),
      };

      await db.platformBills.add(bill);
      existingBillNos.add(bill.billNo);
      result.success++;
    } catch (error) {
      result.errors.push(`第 ${i + 1} 行：导入失败 - ${(error as Error).message}`);
      result.failed++;
    }
  }

  return result;
}

export async function importRates(
  data: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, duplicates: 0, errors: [] };

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];
      const rateData = {
        baseCurrency: (row[mapping.baseCurrency || '源币种'] || row[mapping.fromCurrency || '源币种'] || 'USD') as Currency,
        targetCurrency: (row[mapping.targetCurrency || '目标币种'] || row[mapping.toCurrency || '目标币种'] || 'CNY') as Currency,
        rate: parseFloat(row[mapping.rate || '汇率'] || '0'),
        date: row[mapping.date || '日期'] || row[mapping.rateDate || '日期'] || '',
        source: row[mapping.source || '来源'] || '导入',
      };

      if (!isCurrency(rateData.baseCurrency) || !isCurrency(rateData.targetCurrency)) {
        result.errors.push(`第 ${i + 1} 行：币种不支持`);
        result.failed++;
        continue;
      }

      const existing = await db.exchangeRates
        .where('[baseCurrency+targetCurrency+date]')
        .equals([rateData.baseCurrency, rateData.targetCurrency, rateData.date])
        .first();

      if (existing) {
        result.duplicates++;
        result.errors.push(
          `第 ${i + 1} 行：${rateData.baseCurrency}->${rateData.targetCurrency} 在 ${rateData.date} 的汇率已存在`
        );
        continue;
      }

      const validation = validateExchangeRate(rateData);
      if (!validation.success) {
        result.errors.push(`第 ${i + 1} 行：${validation.error.issues[0].message}`);
        result.failed++;
        continue;
      }

      const rate: ExchangeRate = {
        id: crypto.randomUUID(),
        ...rateData,
        createdAt: getNow(),
        updatedAt: getNow(),
      };

      await db.exchangeRates.add(rate);
      result.success++;
    } catch (error) {
      result.errors.push(`第 ${i + 1} 行：导入失败 - ${(error as Error).message}`);
      result.failed++;
    }
  }

  return result;
}

export async function importData(
  type: ImportType,
  data: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportResult> {
  switch (type) {
    case 'order':
      return importOrders(data, mapping);
    case 'statement':
      return importStatements(data, mapping);
    case 'bill':
      return importBills(data, mapping);
    case 'rate':
      return importRates(data, mapping);
    default:
      throw new Error(`不支持的导入类型: ${type}`);
  }
}
