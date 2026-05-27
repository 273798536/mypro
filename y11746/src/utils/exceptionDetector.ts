import { Donation, Project, PhysicalGoods, Refund, Invoice, ExceptionRecord, ExceptionType, DataSource } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 10);

export const detectPhysicalValueMissing = (physicals: PhysicalGoods[]): ExceptionRecord[] => {
  return physicals
    .filter(p => p.valueMissing || p.estimatedValue <= 0)
    .map(p => ({
      id: generateId(),
      type: 'physical_value_missing' as ExceptionType,
      description: `实物捐赠「${p.goodsName}」缺少估值，数量${p.quantity}件`,
      suggestion: '请补充实物估值金额和估值方法',
      recordType: 'physical' as const,
      recordId: p.id,
      source: p.source,
      sourceLine: p.sourceLine,
      resolved: false,
      createdAt: new Date().toISOString(),
    }));
};

export const detectProjectMismatch = (donations: Donation[], projects: Project[]): ExceptionRecord[] => {
  const projectIds = new Set(projects.map(p => p.id));
  return donations
    .filter(d => !projectIds.has(d.projectId))
    .map(d => ({
      id: generateId(),
      type: 'project_mismatch' as ExceptionType,
      description: `捐赠人「${d.donorName}」所属项目「${d.projectName || d.projectId}」不存在`,
      suggestion: '请核对并修正项目编号，或在项目列表中添加该项目',
      recordType: 'donation' as const,
      recordId: d.id,
      source: d.source,
      sourceLine: d.sourceLine,
      resolved: false,
      createdAt: new Date().toISOString(),
    }));
};

export const detectRefundNotReversed = (refunds: Refund[], invoices: Invoice[]): ExceptionRecord[] => {
  const invoiceMap = new Map(invoices.map(i => [i.donationId, i]));
  return refunds
    .filter(r => !r.invoiceReversed)
    .map(r => {
      const invoice = invoiceMap.get(r.donationId);
      return {
        id: generateId(),
        type: 'refund_not_reversed' as ExceptionType,
        description: `退款记录（金额¥${r.refundAmount.toLocaleString()}）对应的票据${invoice ? `「${invoice.invoiceNumber}」` : ''}未冲销`,
        suggestion: '请对该票据执行冲销操作',
        recordType: 'refund' as const,
        recordId: r.id,
        source: r.source,
        sourceLine: r.sourceLine,
        resolved: false,
        createdAt: new Date().toISOString(),
      };
    });
};

export const detectDuplicateInvoices = (invoices: Invoice[]): ExceptionRecord[] => {
  const seen = new Map<string, Invoice>();
  const duplicates: ExceptionRecord[] = [];

  invoices.forEach(invoice => {
    if (seen.has(invoice.invoiceNumber)) {
      const existing = seen.get(invoice.invoiceNumber)!;
      duplicates.push({
        id: generateId(),
        type: 'duplicate_invoice' as ExceptionType,
        description: `票据号码「${invoice.invoiceNumber}」重复出现`,
        suggestion: '请核对票据号码，删除重复记录或修正票据编号',
        recordType: 'invoice' as const,
        recordId: invoice.id,
        source: invoice.source,
        sourceLine: invoice.sourceLine,
        resolved: false,
        createdAt: new Date().toISOString(),
      });
    } else {
      seen.set(invoice.invoiceNumber, invoice);
    }
  });

  return duplicates;
};

export const detectDataMismatch = (donations: Donation[], invoices: Invoice[]): ExceptionRecord[] => {
  const invoiceMap = new Map(invoices.map(i => [i.donationId, i]));
  const exceptions: ExceptionRecord[] = [];

  donations.forEach(donation => {
    if (donation.invoiceId) {
      const invoice = invoiceMap.get(donation.id);
      if (!invoice) {
        exceptions.push({
          id: generateId(),
          type: 'data_mismatch' as ExceptionType,
          description: `捐赠人「${donation.donorName}」的票据记录缺失`,
          suggestion: '请补充票据信息或删除捐赠记录中的票据关联',
          recordType: 'donation' as const,
          recordId: donation.id,
          source: donation.source,
          sourceLine: donation.sourceLine,
          resolved: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  });

  return exceptions;
};

export const detectAllExceptions = (
  donations: Donation[],
  projects: Project[],
  physicals: PhysicalGoods[],
  refunds: Refund[],
  invoices: Invoice[]
): ExceptionRecord[] => {
  return [
    ...detectPhysicalValueMissing(physicals),
    ...detectProjectMismatch(donations, projects),
    ...detectRefundNotReversed(refunds, invoices),
    ...detectDuplicateInvoices(invoices),
    ...detectDataMismatch(donations, invoices),
  ];
};
