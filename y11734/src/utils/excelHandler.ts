import * as XLSX from 'xlsx';
import type {
  PaymentReceipt,
  Invoice,
  SellerAccount,
  FactoringContract,
  FeeConfig,
  SplitResult,
  OperationLog,
  ReportData,
} from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

type WorksheetData = Record<string, unknown>[];

export const parseExcelFile = async (
  file: File
): Promise<WorksheetData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheets: WorksheetData[] = [];

        workbook.SheetNames.forEach((name) => {
          const sheet = workbook.Sheets[name];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          sheets.push(json as WorksheetData);
        });

        resolve(sheets);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};

export const detectDataType = (
  data: WorksheetData
):
  | 'payment'
  | 'invoice'
  | 'seller'
  | 'contract'
  | 'fee'
  | 'unknown' => {
  if (data.length === 0) return 'unknown';

  const headers = Object.keys(data[0]).map((h) => h.toLowerCase());

  if (
    headers.some((h) => h.includes('回款') || h.includes('receipt')) ||
    (headers.includes('流水号') && headers.includes('到账日期'))
  ) {
    return 'payment';
  }
  if (
    headers.some((h) => h.includes('发票') || h.includes('invoice')) ||
    (headers.includes('发票号') && headers.includes('金额'))
  ) {
    return 'invoice';
  }
  if (
    headers.some((h) => h.includes('卖方') || h.includes('seller')) ||
    (headers.includes('账号') && headers.includes('开户行'))
  ) {
    return 'seller';
  }
  if (
    headers.some((h) => h.includes('合同') || h.includes('contract')) ||
    (headers.includes('合同号') && headers.includes('费率'))
  ) {
    return 'contract';
  }
  if (
    headers.some((h) => h.includes('手续费') || h.includes('fee')) ||
    headers.includes('费率')
  ) {
    return 'fee';
  }

  return 'unknown';
};

const getValue = <T = string>(row: Record<string, unknown>, keys: string[]): T => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') {
      return row[key] as T;
    }
    const lowerKey = Object.keys(row).find(
      (k) => k.toLowerCase() === key.toLowerCase()
    );
    if (lowerKey && row[lowerKey] !== undefined && row[lowerKey] !== '') {
      return row[lowerKey] as T;
    }
  }
  return '' as T;
};

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
};

const parseDate = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString().split('T')[0];
};

export const parsePaymentData = (
  data: WorksheetData
): { valid: PaymentReceipt[]; errors: { row: number; message: string }[] } => {
  const valid: PaymentReceipt[] = [];
  const errors: { row: number; message: string }[] = [];

  data.forEach((row, index) => {
    try {
      const receiptNo = getValue(row, ['流水号', '回款流水号', 'receiptNo', 'id']);
      const totalAmount = parseNumber(
        getValue(row, ['金额', '回款金额', 'totalAmount', 'amount'])
      );

      if (!receiptNo || totalAmount <= 0) {
        errors.push({
          row: index + 2,
          message: `缺少必要字段：流水号或金额无效`,
        });
        return;
      }

      valid.push({
        id: generateId(),
        receiptNo: String(receiptNo),
        receiptDate: parseDate(
          getValue(row, ['到账日期', '回款日期', 'date', 'receiptDate'])
        ),
        totalAmount,
        payer: getValue(row, ['付款方', '付款人', 'payer', 'from']),
        source: getValue(row, ['来源', '备注', 'source', 'remark']),
        status: 'pending',
      });
    } catch {
      errors.push({ row: index + 2, message: '数据解析失败' });
    }
  });

  return { valid, errors };
};

export const parseInvoiceData = (
  data: WorksheetData
): { valid: Invoice[]; errors: { row: number; message: string }[] } => {
  const valid: Invoice[] = [];
  const errors: { row: number; message: string }[] = [];

  data.forEach((row, index) => {
    try {
      const invoiceNo = getValue(row, ['发票号', '发票编号', 'invoiceNo', 'id']);
      const invoiceAmount = parseNumber(
        getValue(row, ['发票金额', '金额', 'amount', 'invoiceAmount'])
      );

      if (!invoiceNo || invoiceAmount <= 0) {
        errors.push({
          row: index + 2,
          message: `缺少必要字段：发票号或金额无效`,
        });
        return;
      }

      const statusRaw = getValue(row, ['状态', 'status']);
      let status: Invoice['status'] = 'normal';
      if (String(statusRaw).includes('争议')) status = 'disputed';
      if (String(statusRaw).includes('已结')) status = 'closed';

      const remainAmount =
        parseNumber(
          getValue(row, ['剩余金额', '未回款金额', 'remainAmount', 'balance'])
        ) || invoiceAmount;

      valid.push({
        id: generateId(),
        invoiceNo: String(invoiceNo),
        sellerId: getValue(row, ['卖方ID', 'sellerId']),
        sellerName: getValue(row, ['卖方名称', '卖方', 'sellerName', 'seller']),
        invoiceAmount,
        remainAmount,
        contractNo: getValue(row, ['合同号', '合同编号', 'contractNo']),
        status,
        issueDate: parseDate(getValue(row, ['开票日期', '日期', 'issueDate'])),
      });
    } catch {
      errors.push({ row: index + 2, message: '数据解析失败' });
    }
  });

  return { valid, errors };
};

export const parseSellerData = (
  data: WorksheetData
): { valid: SellerAccount[]; errors: { row: number; message: string }[] } => {
  const valid: SellerAccount[] = [];
  const errors: { row: number; message: string }[] = [];

  data.forEach((row, index) => {
    try {
      const sellerName = getValue(row, ['卖方名称', '卖方', 'sellerName', 'name']);
      const accountNo = getValue(row, ['账号', '银行账号', 'accountNo', 'account']);

      if (!sellerName || !accountNo) {
        errors.push({
          row: index + 2,
          message: `缺少必要字段：卖方名称或账号`,
        });
        return;
      }

      valid.push({
        id: generateId(),
        sellerName: String(sellerName),
        accountNo: String(accountNo),
        bankName: getValue(row, ['开户行', '银行', 'bankName', 'bank']),
      });
    } catch {
      errors.push({ row: index + 2, message: '数据解析失败' });
    }
  });

  return { valid, errors };
};

export const parseContractData = (
  data: WorksheetData
): { valid: FactoringContract[]; errors: { row: number; message: string }[] } => {
  const valid: FactoringContract[] = [];
  const errors: { row: number; message: string }[] = [];

  data.forEach((row, index) => {
    try {
      const contractNo = getValue(row, ['合同号', '合同编号', 'contractNo', 'id']);

      if (!contractNo) {
        errors.push({ row: index + 2, message: `缺少必要字段：合同号` });
        return;
      }

      valid.push({
        id: generateId(),
        contractNo: String(contractNo),
        sellerId: getValue(row, ['卖方ID', 'sellerId']),
        factoringRate:
          parseNumber(getValue(row, ['保理费率', '费率', 'factoringRate', 'rate'])) /
          100,
        startDate: parseDate(getValue(row, ['开始日期', '起始日期', 'startDate'])),
        endDate: parseDate(getValue(row, ['结束日期', '到期日期', 'endDate'])),
      });
    } catch {
      errors.push({ row: index + 2, message: '数据解析失败' });
    }
  });

  return { valid, errors };
};

export const parseFeeData = (
  data: WorksheetData
): { valid: FeeConfig[]; errors: { row: number; message: string }[] } => {
  const valid: FeeConfig[] = [];
  const errors: { row: number; message: string }[] = [];

  data.forEach((row, index) => {
    try {
      const name = getValue(row, ['名称', '手续费名称', 'name', 'type']);
      const rate = parseNumber(getValue(row, ['费率', 'feeRate', 'rate']));

      valid.push({
        id: generateId(),
        name: String(name) || '默认手续费',
        rate: rate / 100,
        type: getValue(row, ['扣除方式', 'type'])?.includes('内扣')
          ? 'deduct_inner'
          : 'deduct_outer',
      });
    } catch {
      errors.push({ row: index + 2, message: '数据解析失败' });
    }
  });

  if (valid.length === 0) {
    valid.push({
      id: generateId(),
      name: '默认手续费',
      rate: 0.01,
      type: 'deduct_inner',
    });
  }

  return { valid, errors };
};

export const exportSplitReport = (
  reportData: ReportData,
  splits: SplitResult[],
  payments: PaymentReceipt[],
  logs: OperationLog[]
): void => {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['保理回款拆分报告'],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    [''],
    ['统计概览'],
    ['回款总数', reportData.summary.totalPayments],
    ['回款总额', reportData.summary.totalAmount],
    ['已完成', reportData.summary.completedCount],
    ['待处理', reportData.summary.pendingCount],
    ['异常项', reportData.summary.exceptionCount],
    ['需人工确认', reportData.summary.needConfirmCount],
    ['已修正', reportData.summary.adjustedCount],
    ['争议项', reportData.summary.disputedCount],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, '统计概览');

  const splitsData = splits.map((s) => ({
    回款ID: s.paymentId,
    发票号: s.invoiceNo,
    卖方名称: s.sellerName,
    拆分金额: s.splitAmount,
    手续费: s.feeAmount,
    实际到账: s.actualAmount,
    拆分比例: s.splitRatio,
    状态: s.status === 'normal' ? '正常' : s.status === 'adjusted' ? '已修正' : s.status === 'disputed' ? '争议' : '待确认',
    是否争议: s.isDispute ? '是' : '否',
    来源: s.source,
    备注: s.remark || '',
  }));
  const splitsSheet = XLSX.utils.json_to_sheet(splitsData);
  XLSX.utils.book_append_sheet(wb, splitsSheet, '拆分明细');

  const paymentsData = payments.map((p) => ({
    流水号: p.receiptNo,
    到账日期: p.receiptDate,
    回款总额: p.totalAmount,
    付款方: p.payer,
    来源: p.source,
    状态: p.status === 'pending' ? '待处理' : p.status === 'processing' ? '处理中' : p.status === 'completed' ? '已完成' : '异常',
  }));
  const paymentsSheet = XLSX.utils.json_to_sheet(paymentsData);
  XLSX.utils.book_append_sheet(wb, paymentsSheet, '回款列表');

  if (reportData.unhandledItems.length > 0) {
    const unhandledData = reportData.unhandledItems.map((s) => ({
      发票号: s.invoiceNo,
      卖方名称: s.sellerName,
      拆分金额: s.splitAmount,
      状态: '未处理',
    }));
    const unhandledSheet = XLSX.utils.json_to_sheet(unhandledData);
    XLSX.utils.book_append_sheet(wb, unhandledSheet, '未处理项');
  }

  if (reportData.needConfirmItems.length > 0) {
    const confirmData = reportData.needConfirmItems.map((s) => ({
      发票号: s.invoiceNo,
      卖方名称: s.sellerName,
      拆分金额: s.splitAmount,
      状态: '需人工确认',
    }));
    const confirmSheet = XLSX.utils.json_to_sheet(confirmData);
    XLSX.utils.book_append_sheet(wb, confirmSheet, '需人工确认');
  }

  const logsData = logs.map((l) => ({
    操作时间: new Date(l.operateTime).toLocaleString('zh-CN'),
    操作人: l.operator,
    操作类型: l.action === 'create' ? '创建' : l.action === 'update' ? '更新' : l.action === 'delete' ? '删除' : l.action === 'confirm' ? '确认' : l.action === 'dispute' ? '标记争议' : '调整',
    操作对象: l.targetType,
    修改前: l.beforeValue,
    修改后: l.afterValue,
  }));
  const logsSheet = XLSX.utils.json_to_sheet(logsData);
  XLSX.utils.book_append_sheet(wb, logsSheet, '操作痕迹');

  XLSX.writeFile(wb, `保理回款拆分报告_${new Date().toISOString().split('T')[0]}.xlsx`);
};
