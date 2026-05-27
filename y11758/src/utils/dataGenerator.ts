import {
  Card,
  InvoiceCard,
  CustomerCard,
  PaymentCard,
  LevelConfig,
  RiskLabel,
  Anomaly,
} from '@/types';
import { DEFAULT_RISK_LABELS } from '@/config/levels';

const COMPANIES = [
  { name: '北京华信科技有限公司', taxNo: '91110101MA00A1BC23' },
  { name: '上海顺达贸易有限公司', taxNo: '91310101MA00B2CD34' },
  { name: '广州恒泰实业有限公司', taxNo: '91440101MA00C3DE45' },
  { name: '深圳创新电子有限公司', taxNo: '91440301MA00D4EF56' },
  { name: '杭州云图网络有限公司', taxNo: '91330101MA00E5FG67' },
  { name: '成都天府软件有限公司', taxNo: '91510101MA00F6GH78' },
  { name: '武汉江城物流有限公司', taxNo: '91420101MA00G7HI89' },
  { name: '南京金陵化工有限公司', taxNo: '91320101MA00H8IJ90' },
];

const INDUSTRIES = ['科技', '贸易', '制造', '电子', '网络', '软件', '物流', '化工'];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function generateInvoiceNo(): string {
  const prefix = ['011', '031', '041', '131', '141'][Math.floor(Math.random() * 5)];
  const middle = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefix}${middle}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function randomDateInRange(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface GeneratedData {
  cards: Card[];
  anomalies: Anomaly[];
  riskLabels: RiskLabel[];
}

export function generateLevelData(levelConfig: LevelConfig): GeneratedData {
  const cards: Card[] = [];
  const anomalies: Anomaly[] = [];
  const usedInvoiceNos: string[] = [];

  const normalInvoiceCount = levelConfig.cardCount.invoice - levelConfig.anomalies.duplicateInvoices;
  const customerCount = levelConfig.cardCount.customer;
  const paymentCount = levelConfig.cardCount.payment;

  const selectedCompanies = shuffleArray(COMPANIES).slice(0, customerCount);

  const customers: CustomerCard[] = [];
  for (let i = 0; i < selectedCompanies.length; i++) {
    const company = selectedCompanies[i];
    const customer: CustomerCard = {
      id: `customer-${generateId()}`,
      type: 'customer',
      isSelected: false,
      status: 'unknown',
      data: {
        companyName: company.name,
        taxNo: company.taxNo,
        role: i % 2 === 0 ? 'seller' : 'buyer',
        industry: INDUSTRIES[i % INDUSTRIES.length],
      },
    };
    customers.push(customer);
    cards.push(customer);
  }

  const sellers = customers.filter(c => c.data.role === 'seller');
  const buyers = customers.filter(c => c.data.role === 'buyer');

  const baseDate = new Date('2024-01-01');

  for (let i = 0; i < normalInvoiceCount; i++) {
    const seller = sellers[i % sellers.length];
    const buyer = buyers[i % buyers.length];
    const invoiceNo = generateInvoiceNo();
    usedInvoiceNos.push(invoiceNo);

    const invoiceDate = randomDateInRange(baseDate, new Date('2024-06-30'));

    const invoice: InvoiceCard = {
      id: `invoice-${generateId()}`,
      type: 'invoice',
      isSelected: false,
      status: 'unknown',
      data: {
        invoiceNo,
        seller: seller.data.companyName,
        buyer: buyer.data.companyName,
        amount: Math.floor(Math.random() * 90000) + 10000,
        date: formatDate(invoiceDate),
        taxRate: 0.13,
      },
    };
    cards.push(invoice);
  }

  const invoices = cards.filter(c => c.type === 'invoice') as InvoiceCard[];

  for (let i = 0; i < levelConfig.anomalies.duplicateInvoices; i++) {
    const originalInvoice = invoices[i % invoices.length];
    const duplicateInvoice: InvoiceCard = {
      ...originalInvoice,
      id: `invoice-${generateId()}`,
      isSelected: false,
      status: 'unknown',
      data: { ...originalInvoice.data },
    };
    cards.push(duplicateInvoice);

    const anomaly: Anomaly = {
      id: `anomaly-${generateId()}`,
      type: 'duplicate_invoice',
      severity: 'high',
      cardIds: [originalInvoice.id, duplicateInvoice.id],
      description: `发票号码 ${originalInvoice.data.invoiceNo} 重复出现`,
      scoreDelta: 25,
      isDetected: false,
      isWronglyMarked: false,
    };
    anomalies.push(anomaly);
  }

  for (let i = 0; i < levelConfig.anomalies.mismatchChains; i++) {
    const seller = sellers[i % sellers.length];
    const invoiceDate = randomDateInRange(baseDate, new Date('2024-06-30'));
    const invoiceNo = generateInvoiceNo();
    usedInvoiceNos.push(invoiceNo);

    const wrongBuyerName = '不存在的公司有限公司';

    const invoice: InvoiceCard = {
      id: `invoice-${generateId()}`,
      type: 'invoice',
      isSelected: false,
      status: 'unknown',
      data: {
        invoiceNo,
        seller: seller.data.companyName,
        buyer: wrongBuyerName,
        amount: Math.floor(Math.random() * 90000) + 10000,
        date: formatDate(invoiceDate),
        taxRate: 0.13,
      },
    };
    cards.push(invoice);

    const anomaly: Anomaly = {
      id: `anomaly-${generateId()}`,
      type: 'mismatch_chain',
      severity: 'high',
      cardIds: [invoice.id, seller.id],
      description: `发票 ${invoiceNo} 的购方 "${wrongBuyerName}" 不存在于客户列表`,
      scoreDelta: 30,
      isDetected: false,
      isWronglyMarked: false,
    };
    anomalies.push(anomaly);
  }

  const allInvoices = cards.filter(c => c.type === 'invoice') as InvoiceCard[];

  for (let i = 0; i < paymentCount; i++) {
    const relatedInvoice = allInvoices[i % allInvoices.length];
    const paymentDate = new Date(relatedInvoice.data.date);
    paymentDate.setDate(paymentDate.getDate() + Math.floor(Math.random() * 7) + 1);

    const payment: PaymentCard = {
      id: `payment-${generateId()}`,
      type: 'payment',
      isSelected: false,
      status: 'unknown',
      data: {
        paymentId: `PAY${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        amount: relatedInvoice.data.amount,
        date: formatDate(paymentDate),
        relatedInvoice: relatedInvoice.data.invoiceNo,
        method: 'bank',
      },
    };
    cards.push(payment);
  }

  for (let i = 0; i < levelConfig.anomalies.delayedPayments; i++) {
    const targetInvoice = allInvoices[(allInvoices.length - 1 - i + allInvoices.length) % allInvoices.length];
    const paymentDate = new Date(targetInvoice.data.date);
    paymentDate.setDate(paymentDate.getDate() + 180 + Math.floor(Math.random() * 60));

    const delayedPayment: PaymentCard = {
      id: `payment-${generateId()}`,
      type: 'payment',
      isSelected: false,
      status: 'unknown',
      data: {
        paymentId: `PAY${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        amount: targetInvoice.data.amount,
        date: formatDate(paymentDate),
        relatedInvoice: targetInvoice.data.invoiceNo,
        method: 'bank',
      },
    };
    cards.push(delayedPayment);

    const anomaly: Anomaly = {
      id: `anomaly-${generateId()}`,
      type: 'delayed_payment',
      severity: 'medium',
      cardIds: [targetInvoice.id, delayedPayment.id],
      description: `发票 ${targetInvoice.data.invoiceNo} 的付款滞后超过180天`,
      scoreDelta: 20,
      isDetected: false,
      isWronglyMarked: false,
    };
    anomalies.push(anomaly);
  }

  const shuffledCards = shuffleArray(cards);

  const riskLabels: RiskLabel[] = DEFAULT_RISK_LABELS.map(label => ({
    ...label,
    isChecked: false,
  }));

  return {
    cards: shuffledCards,
    anomalies,
    riskLabels,
  };
}
