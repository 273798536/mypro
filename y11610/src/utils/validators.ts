import { z } from 'zod';
import { Currency } from '../types';

const currencySchema = z.enum(['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'HKD', 'AUD', 'CAD']);

export const customerOrderSchema = z.object({
  orderNo: z.string().min(1, '订单号不能为空'),
  customerName: z.string().min(1, '客户名称不能为空'),
  currency: currencySchema,
  amount: z.number().positive('金额必须大于0'),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  source: z.string().optional(),
});

export const bankStatementSchema = z.object({
  referenceNo: z.string().min(1, '水单号不能为空'),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  currency: currencySchema,
  receivedAmount: z.number().positive('到账金额必须大于0'),
  bank: z.string().optional(),
  payerInfo: z.string().optional(),
  source: z.string().optional(),
});

export const platformBillSchema = z.object({
  billNo: z.string().min(1, '账单号不能为空'),
  platform: z.string().min(1, '平台名称不能为空'),
  billDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  currency: currencySchema,
  grossAmount: z.number().min(0, '总金额不能为负'),
  feeAmount: z.number().min(0, '手续费不能为负'),
  netAmount: z.number().min(0, '净金额不能为负'),
  orderNo: z.string().optional(),
  source: z.string().optional(),
});

export const exchangeRateSchema = z.object({
  baseCurrency: currencySchema,
  targetCurrency: currencySchema,
  rate: z.number().positive('汇率必须大于0'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  source: z.string().optional(),
});

export function validateCustomerOrder(data: unknown) {
  return customerOrderSchema.safeParse(data);
}

export function validateBankStatement(data: unknown) {
  return bankStatementSchema.safeParse(data);
}

export function validatePlatformBill(data: unknown) {
  return platformBillSchema.safeParse(data);
}

export function validateExchangeRate(data: unknown) {
  return exchangeRateSchema.safeParse(data);
}

export function isCurrency(value: string): value is Currency {
  return ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'HKD', 'AUD', 'CAD'].includes(value);
}

export function validateDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

export function validateAmount(amount: number): boolean {
  return !isNaN(amount) && isFinite(amount) && amount >= 0;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateRequired(value: string): boolean {
  return value.trim().length > 0;
}

export function validateNumberRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function parseAndValidateNumber(str: string): { valid: boolean; value: number } {
  const num = parseFloat(str);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, value: 0 };
  }
  return { valid: true, value: num };
}
