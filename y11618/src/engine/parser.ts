import type {
  Contract,
  Invoice,
  Receipt,
  RuleVersion,
  PaymentRecord,
  Override,
  SourceRef,
} from '../types';

export type DataSourceType = 'contract' | 'invoice' | 'receipt' | 'rule_version' | 'payment' | 'override';

export interface ParseResult<T> {
  data: T[];
  errors: ParseError[];
  warnings: ParseWarning[];
}

export interface ParseError {
  lineNumber: number;
  field?: string;
  message: string;
  source: DataSourceType;
}

export interface ParseWarning {
  lineNumber: number;
  field?: string;
  message: string;
  source: DataSourceType;
}

interface ParseContext {
  lineCounter: number;
  source: DataSourceType;
  errors: ParseError[];
  warnings: ParseWarning[];
}

function makeSourceRef(
  ctx: ParseContext,
  id: string,
  label: string,
): SourceRef {
  return {
    source: ctx.source === 'payment' ? 'payment_list' : ctx.source,
    lineNumber: ctx.lineCounter,
    id,
    label,
  };
}

function validateRequired(
  value: string | undefined,
  field: string,
  ctx: ParseContext,
): string | null {
  if (!value || value.trim() === '') {
    ctx.errors.push({
      lineNumber: ctx.lineCounter,
      field,
      message: `${field} 不能为空`,
      source: ctx.source,
    });
    return null;
  }
  return value.trim();
}

function validateDate(
  value: string | undefined,
  field: string,
  ctx: ParseContext,
): string | null {
  const str = validateRequired(value, field, ctx);
  if (!str) return null;

  const date = new Date(str);
  if (isNaN(date.getTime())) {
    ctx.errors.push({
      lineNumber: ctx.lineCounter,
      field,
      message: `${field} 格式错误，应为 YYYY-MM-DD`,
      source: ctx.source,
    });
    return null;
  }
  return str;
}

function validateNumber(
  value: string | undefined,
  field: string,
  ctx: ParseContext,
): number | null {
  const str = validateRequired(value, field, ctx);
  if (!str) return null;

  const num = parseFloat(str.replace(/[^\d.-]/g, ''));
  if (isNaN(num)) {
    ctx.errors.push({
      lineNumber: ctx.lineCounter,
      field,
      message: `${field} 不是有效数字`,
      source: ctx.source,
    });
    return null;
  }
  return num;
}

function validateBoolean(
  value: string | undefined,
  field: string,
  ctx: ParseContext,
  defaultValue = false,
): boolean {
  if (!value || value.trim() === '') return defaultValue;
  const lower = value.trim().toLowerCase();
  if (['true', '1', 'yes', '是', 'active', '激活'].includes(lower)) {
    return true;
  }
  if (['false', '0', 'no', '否', 'inactive', '停用'].includes(lower)) {
    return false;
  }
  ctx.warnings.push({
    lineNumber: ctx.lineCounter,
    field,
    message: `${field} 无法解析，使用默认值 ${defaultValue}`,
    source: ctx.source,
  });
  return defaultValue;
}

export function parseContracts(csvText: string): ParseResult<Contract> {
  const ctx: ParseContext = {
    lineCounter: 0,
    source: 'contract',
    errors: [],
    warnings: [],
  };

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    ctx.errors.push({
      lineNumber: 1,
      message: 'CSV 为空或只有表头',
      source: 'contract',
    });
    return { data: [], errors: ctx.errors, warnings: ctx.warnings };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const data: Contract[] = [];

  for (let i = 1; i < lines.length; i++) {
    ctx.lineCounter = i + 1;
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim();
    });

    const id = validateRequired(row['id'] || row['合同id'], 'ID', ctx);
    const supplierId = validateRequired(
      row['supplierid'] || row['供应商id'],
      '供应商ID',
      ctx,
    );
    const supplierName = validateRequired(
      row['suppliername'] || row['供应商名称'],
      '供应商名称',
      ctx,
    );
    const contractCode = validateRequired(
      row['contractcode'] || row['合同编号'],
      '合同编号',
      ctx,
    );
    const startDate = validateDate(
      row['startdate'] || row['开始日期'],
      '开始日期',
      ctx,
    );
    const isActive = validateBoolean(
      row['isactive'] || row['是否激活'],
      '是否激活',
      ctx,
      true,
    );

    if (!id || !supplierId || !supplierName || !contractCode || !startDate) {
      continue;
    }

    data.push({
      id,
      supplierId,
      supplierName,
      contractCode,
      startDate,
      endDate: row['enddate'] || row['结束日期'] || undefined,
      ruleVersionIds: (row['ruleversionids'] || row['规则版本id'])
        ?.split(';')
        .map((s) => s.trim())
        .filter(Boolean) || [],
      sourceRef: makeSourceRef(ctx, id, contractCode),
      isActive,
    });
  }

  return { data, errors: ctx.errors, warnings: ctx.warnings };
}

export function parseInvoices(csvText: string): ParseResult<Invoice> {
  const ctx: ParseContext = {
    lineCounter: 0,
    source: 'invoice',
    errors: [],
    warnings: [],
  };

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    ctx.errors.push({
      lineNumber: 1,
      message: 'CSV 为空或只有表头',
      source: 'invoice',
    });
    return { data: [], errors: ctx.errors, warnings: ctx.warnings };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const data: Invoice[] = [];

  for (let i = 1; i < lines.length; i++) {
    ctx.lineCounter = i + 1;
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim();
    });

    const id = validateRequired(row['id'] || row['发票id'], 'ID', ctx);
    const supplierId = validateRequired(
      row['supplierid'] || row['供应商id'],
      '供应商ID',
      ctx,
    );
    const contractId = validateRequired(
      row['contractid'] || row['合同id'],
      '合同ID',
      ctx,
    );
    const invoiceCode = validateRequired(
      row['invoicecode'] || row['发票编号'],
      '发票编号',
      ctx,
    );
    const invoiceDate = validateDate(
      row['invoicedate'] || row['开票日期'],
      '开票日期',
      ctx,
    );
    const amount = validateNumber(
      row['amount'] || row['金额'],
      '金额',
      ctx,
    );

    if (!id || !supplierId || !contractId || !invoiceCode || !invoiceDate || amount === null) {
      continue;
    }

    const statusRaw = (row['status'] || row['状态'] || 'pending').toLowerCase();
    let status: Invoice['status'] = 'pending';
    if (['matched', '已匹配', '匹配'].includes(statusRaw)) status = 'matched';
    else if (['disputed', '争议', '争议中'].includes(statusRaw)) status = 'disputed';
    else if (['overridden', '改判', '已改判'].includes(statusRaw)) status = 'overridden';

    data.push({
      id,
      supplierId,
      contractId,
      invoiceCode,
      invoiceDate,
      amount,
      currency: row['currency'] || row['币种'] || 'CNY',
      receiptIds: (row['receiptids'] || row['入库单id'])
        ?.split(';')
        .map((s) => s.trim())
        .filter(Boolean) || [],
      sourceRef: makeSourceRef(ctx, id, invoiceCode),
      status,
    });
  }

  return { data, errors: ctx.errors, warnings: ctx.warnings };
}

export function parseReceipts(csvText: string): ParseResult<Receipt> {
  const ctx: ParseContext = {
    lineCounter: 0,
    source: 'receipt',
    errors: [],
    warnings: [],
  };

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    ctx.errors.push({
      lineNumber: 1,
      message: 'CSV 为空或只有表头',
      source: 'receipt',
    });
    return { data: [], errors: ctx.errors, warnings: ctx.warnings };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const data: Receipt[] = [];

  for (let i = 1; i < lines.length; i++) {
    ctx.lineCounter = i + 1;
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim();
    });

    const id = validateRequired(row['id'] || row['入库单id'], 'ID', ctx);
    const supplierId = validateRequired(
      row['supplierid'] || row['供应商id'],
      '供应商ID',
      ctx,
    );
    const contractId = validateRequired(
      row['contractid'] || row['合同id'],
      '合同ID',
      ctx,
    );
    const receiptCode = validateRequired(
      row['receiptcode'] || row['入库单编号'],
      '入库单编号',
      ctx,
    );
    const receiptDate = validateDate(
      row['receiptdate'] || row['入库日期'],
      '入库日期',
      ctx,
    );
    const amount = validateNumber(
      row['amount'] || row['金额'],
      '金额',
      ctx,
    );

    if (!id || !supplierId || !contractId || !receiptCode || !receiptDate || amount === null) {
      continue;
    }

    data.push({
      id,
      supplierId,
      contractId,
      receiptCode,
      receiptDate,
      amount,
      isPartial: validateBoolean(
        row['ispartial'] || row['是否部分'],
        '是否部分入库',
        ctx,
        false,
      ),
      relatedReceiptIds: (row['relatedreceiptids'] || row['关联入库单id'])
        ?.split(';')
        .map((s) => s.trim())
        .filter(Boolean) || undefined,
      sourceRef: makeSourceRef(ctx, id, receiptCode),
    });
  }

  return { data, errors: ctx.errors, warnings: ctx.warnings };
}

export function parseRuleVersions(csvText: string): ParseResult<RuleVersion> {
  const ctx: ParseContext = {
    lineCounter: 0,
    source: 'rule_version',
    errors: [],
    warnings: [],
  };

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    ctx.errors.push({
      lineNumber: 1,
      message: 'CSV 为空或只有表头',
      source: 'rule_version',
    });
    return { data: [], errors: ctx.errors, warnings: ctx.warnings };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const data: RuleVersion[] = [];

  for (let i = 1; i < lines.length; i++) {
    ctx.lineCounter = i + 1;
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim();
    });

    const id = validateRequired(row['id'] || row['规则id'], 'ID', ctx);
    const supplierId = validateRequired(
      row['supplierid'] || row['供应商id'],
      '供应商ID',
      ctx,
    );
    const versionLabel = validateRequired(
      row['versionlabel'] || row['版本标签'],
      '版本标签',
      ctx,
    );
    const effectiveDate = validateDate(
      row['effectivedate'] || row['生效日期'],
      '生效日期',
      ctx,
    );
    const baseDays = validateNumber(
      row['basedays'] || row['基准账期'],
      '基准账期',
      ctx,
    );
    const contractId = validateRequired(
      row['contractid'] || row['合同id'],
      '合同ID',
      ctx,
    );

    if (!id || !supplierId || !versionLabel || !effectiveDate || baseDays === null || !contractId) {
      continue;
    }

    data.push({
      id,
      supplierId,
      versionLabel,
      effectiveDate,
      baseDays,
      discountDays: (row['discountdays'] || row['折扣天数'])
        ? (parseInt(row['discountdays'] || row['折扣天数'] || '0', 10) || undefined)
        : undefined,
      discountRate: (row['discountrate'] || row['折扣率'])
        ? (parseFloat(row['discountrate'] || row['折扣率'] || '0') || undefined)
        : undefined,
      contractId,
      sourceRef: makeSourceRef(ctx, id, versionLabel),
      isActive: validateBoolean(
        row['isactive'] || row['是否激活'],
        '是否激活',
        ctx,
        true,
      ),
      notes: row['notes'] || row['备注'] || undefined,
    });
  }

  return { data, errors: ctx.errors, warnings: ctx.warnings };
}

export function parsePayments(csvText: string): ParseResult<PaymentRecord> {
  const ctx: ParseContext = {
    lineCounter: 0,
    source: 'payment',
    errors: [],
    warnings: [],
  };

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    ctx.errors.push({
      lineNumber: 1,
      message: 'CSV 为空或只有表头',
      source: 'payment',
    });
    return { data: [], errors: ctx.errors, warnings: ctx.warnings };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const data: PaymentRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    ctx.lineCounter = i + 1;
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim();
    });

    const id = validateRequired(row['id'] || row['付款id'], 'ID', ctx);
    const invoiceId = validateRequired(
      row['invoiceid'] || row['发票id'],
      '发票ID',
      ctx,
    );
    const supplierId = validateRequired(
      row['supplierid'] || row['供应商id'],
      '供应商ID',
      ctx,
    );
    const contractId = validateRequired(
      row['contractid'] || row['合同id'],
      '合同ID',
      ctx,
    );
    const plannedDate = validateDate(
      row['planneddate'] || row['计划付款日期'],
      '计划付款日期',
      ctx,
    );
    const amount = validateNumber(
      row['amount'] || row['金额'],
      '金额',
      ctx,
    );

    if (!id || !invoiceId || !supplierId || !contractId || !plannedDate || amount === null) {
      continue;
    }

    const statusRaw = (row['status'] || row['状态'] || 'not_due').toLowerCase();
    let status: PaymentRecord['status'] = 'not_due';
    if (['paid', '已付款', '已结清'].includes(statusRaw)) status = 'paid';
    else if (['partially_paid', '部分付款', '部分支付'].includes(statusRaw)) status = 'partially_paid';
    else if (['overdue', '逾期', '已逾期'].includes(statusRaw)) status = 'overdue';
    else if (['due_soon', '即将到期'].includes(statusRaw)) status = 'due_soon';
    else if (['disputed', '争议', '争议中'].includes(statusRaw)) status = 'disputed';
    else if (['void', '作废', '已作废'].includes(statusRaw)) status = 'void';

    data.push({
      id,
      invoiceId,
      supplierId,
      contractId,
      plannedDate,
      actualDate: row['actualdate'] || row['实际付款日期'] || undefined,
      amount,
      status,
      sourceRef: makeSourceRef(ctx, id, id),
    });
  }

  return { data, errors: ctx.errors, warnings: ctx.warnings };
}

export function parseOverrides(csvText: string): ParseResult<Override> {
  const ctx: ParseContext = {
    lineCounter: 0,
    source: 'override',
    errors: [],
    warnings: [],
  };

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    ctx.errors.push({
      lineNumber: 1,
      message: 'CSV 为空或只有表头',
      source: 'override',
    });
    return { data: [], errors: ctx.errors, warnings: ctx.warnings };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const data: Override[] = [];

  for (let i = 1; i < lines.length; i++) {
    ctx.lineCounter = i + 1;
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim();
    });

    const id = validateRequired(row['id'] || row['改判id'], 'ID', ctx);
    const targetId = validateRequired(
      row['targetid'] || row['目标id'],
      '目标ID',
      ctx,
    );
    const reason = validateRequired(
      row['reason'] || row['改判理由'],
      '改判理由',
      ctx,
    );

    if (!id || !targetId || !reason) {
      continue;
    }

    const targetTypeRaw = (row['targettype'] || row['目标类型'] || 'invoice').toLowerCase();
    let targetType: Override['targetType'] = 'invoice';
    if (['payment', '付款'].includes(targetTypeRaw)) targetType = 'payment';
    else if (['rule_version', '规则', '规则版本'].includes(targetTypeRaw)) targetType = 'rule_version';

    const scopeRaw = (row['scope'] || row['范围'] || 'single').toLowerCase();
    let scope: Override['scope'] = 'single';
    if (['batch', '批量'].includes(scopeRaw)) scope = 'batch';
    else if (['supplier_all', '供应商全部'].includes(scopeRaw)) scope = 'supplier_all';

    data.push({
      id,
      targetType,
      targetId,
      reason,
      newRuleVersionId: row['newruleversionid'] || row['新规则版本id'] || undefined,
      newDays: row['newdays'] || row['新账期']
        ? parseInt(row['newdays'] || row['新账期'], 10) || undefined
        : undefined,
      operator: row['operator'] || row['操作人'] || 'system',
      timestamp: row['timestamp'] || row['时间'] || new Date().toISOString(),
      scope,
      sourceRef: makeSourceRef(ctx, id, `改判-${id}`),
    });
  }

  return { data, errors: ctx.errors, warnings: ctx.warnings };
}
