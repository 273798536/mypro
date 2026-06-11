import Papa from 'papaparse';
import type { Reconciliation, ReconciliationStatus } from '@/types';
import { parseTaxAndRate, uid } from './parser';

export interface RawBankRow {
  [key: string]: string | number;
}

export interface ParsedRow {
  source: RawBankRow;
  parsed: Omit<Reconciliation, 'id' | 'createdAt' | 'updatedAt'>;
  warnings: string[];
}

export function parseBankFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse<RawBankRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          try {
            const rows = res.data.map((r) => transformRow(r, file.name));
            resolve(rows);
          } catch (e) {
            reject(e);
          }
        },
        error: (err) => reject(err),
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import('xlsx');
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<RawBankRow>(ws);
          const rows = json.map((r) => transformRow(r, file.name));
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('不支持的文件格式：' + ext));
    }
  });
}

function pick<T>(row: RawBankRow, keys: string[], fallback: T): string | number | T {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.replace(/\s/g, '').toLowerCase() === k.replace(/\s/g, '').toLowerCase()) {
        return row[rk];
      }
    }
  }
  return fallback;
}

function transformRow(row: RawBankRow, batch: string): ParsedRow {
  const warnings: string[] = [];

  const contractCode = String(pick(row, ['合约代码', 'contract', 'contractCode', '合约'], '') || '');
  const tradeDate = String(pick(row, ['交易日期', '日期', 'tradeDate', 'date'], '') || '');
  const spotPrice = parseFloat(String(pick(row, ['现货价', '现货价格', 'spotPrice', 'spot'], '0') || '0'));
  const futuresPrice = parseFloat(String(pick(row, ['期货价', '期货价格', 'futuresPrice', 'futures'], '0') || '0'));
  const basis = parseFloat(String(pick(row, ['基差', 'basis'], String(spotPrice - futuresPrice)) || String(spotPrice - futuresPrice)));
  const amount = parseFloat(String(pick(row, ['金额', 'amount', '资金额'], '0') || '0'));
  const bankSerial = String(pick(row, ['流水号', '银行流水', 'bankSerial', 'serial'], '') || '');
  const rawMixed = String(
    pick(row, ['税费汇率', '税费/汇率', '税费及汇率', '备注', '混合字段', 'mixed', 'taxRate'], '') || ''
  );
  const isSplitRaw = String(pick(row, ['回款拆分', '是否拆分', 'isPaymentSplit', 'split'], '') || '').toLowerCase();
  const isPaymentSplit = ['是', 'y', 'yes', '1', 'true'].includes(isSplitRaw);
  const paymentGroupId = pick(row, ['回款组', '拆分组', 'paymentGroupId', 'groupId'], null) as string | null;
  const statusRaw = String(pick(row, ['状态', 'status'], 'pending') || 'pending').toLowerCase();
  const statusMap: Record<string, ReconciliationStatus> = {
    confirmed: 'confirmed',
    已确认: 'confirmed',
    done: 'confirmed',
    pending: 'pending',
    待补件: 'pending',
    待处理: 'pending',
    returned: 'returned',
    退回: 'returned',
    rejected: 'returned',
  };
  const status: ReconciliationStatus = statusMap[statusRaw] || 'pending';

  const { taxAmount, exchangeRate } = parseTaxAndRate(rawMixed);
  if (!rawMixed || (taxAmount === null && exchangeRate === null)) {
    warnings.push('未能自动识别税费或汇率，请人工确认');
  }
  if (!contractCode) warnings.push('缺少合约代码');
  if (!tradeDate) warnings.push('缺少交易日期');

  return {
    source: row,
    parsed: {
      contractCode,
      tradeDate: tradeDate || new Date().toISOString().slice(0, 10),
      spotPrice: isNaN(spotPrice) ? 0 : spotPrice,
      futuresPrice: isNaN(futuresPrice) ? 0 : futuresPrice,
      basis: isNaN(basis) ? 0 : basis,
      taxAmount,
      exchangeRate,
      rawMixedField: rawMixed,
      amount: isNaN(amount) ? 0 : amount,
      bankSerial,
      status,
      isPaymentSplit,
      paymentGroupId: isPaymentSplit ? paymentGroupId || uid('grp_') : null,
      sourceBatch: batch,
    },
    warnings,
  };
}

export function rowsToReconciliations(rows: ParsedRow[]): Reconciliation[] {
  const now = new Date().toISOString();
  return rows.map((r) => ({
    id: uid('rec_'),
    createdAt: now,
    updatedAt: now,
    ...r.parsed,
  }));
}
