import { Card, InvoiceCard, CustomerCard, PaymentCard, Anomaly } from '@/types';

export function findDuplicateInvoices(cards: Card[]): Anomaly[] {
  const invoices = cards.filter(c => c.type === 'invoice') as InvoiceCard[];
  const invoiceNoMap = new Map<string, InvoiceCard[]>();

  invoices.forEach(invoice => {
    const existing = invoiceNoMap.get(invoice.data.invoiceNo) || [];
    existing.push(invoice);
    invoiceNoMap.set(invoice.data.invoiceNo, existing);
  });

  const anomalies: Anomaly[] = [];
  invoiceNoMap.forEach((invoiceList, invoiceNo) => {
    if (invoiceList.length > 1) {
      anomalies.push({
        id: `detected-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        type: 'duplicate_invoice',
        severity: 'high',
        cardIds: invoiceList.map(i => i.id),
        description: `发票号码 ${invoiceNo} 重复出现 ${invoiceList.length} 次`,
        scoreDelta: 25,
        isDetected: true,
        isWronglyMarked: false,
      });
    }
  });

  return anomalies;
}

export function findMismatchChains(cards: Card[], selectedCardIds: string[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const selectedInvoices = cards.filter(
    c => c.type === 'invoice' && selectedCardIds.includes(c.id)
  ) as InvoiceCard[];
  const selectedCustomers = cards.filter(
    c => c.type === 'customer' && selectedCardIds.includes(c.id)
  ) as CustomerCard[];

  const customerNames = new Set(selectedCustomers.map(c => c.data.companyName));

  selectedInvoices.forEach(invoice => {
    const hasSeller = customerNames.has(invoice.data.seller);
    const hasBuyer = customerNames.has(invoice.data.buyer);

    if (!hasSeller || !hasBuyer) {
      const missingParties = [];
      if (!hasSeller) missingParties.push(`销方"${invoice.data.seller}"`);
      if (!hasBuyer) missingParties.push(`购方"${invoice.data.buyer}"`);

      anomalies.push({
        id: `detected-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        type: 'mismatch_chain',
        severity: 'high',
        cardIds: [invoice.id],
        description: `发票 ${invoice.data.invoiceNo} 的${missingParties.join('、')}不在客户列表中`,
        scoreDelta: 30,
        isDetected: true,
        isWronglyMarked: false,
      });
    }
  });

  return anomalies;
}

export function findDelayedPayments(cards: Card[], selectedCardIds: string[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const selectedInvoices = cards.filter(
    c => c.type === 'invoice' && selectedCardIds.includes(c.id)
  ) as InvoiceCard[];
  const selectedPayments = cards.filter(
    c => c.type === 'payment' && selectedCardIds.includes(c.id)
  ) as PaymentCard[];

  const invoiceByNo = new Map(selectedInvoices.map(i => [i.data.invoiceNo, i]));

  selectedPayments.forEach(payment => {
    const relatedInvoice = invoiceByNo.get(payment.data.relatedInvoice);
    if (relatedInvoice) {
      const invoiceDate = new Date(relatedInvoice.data.date);
      const paymentDate = new Date(payment.data.date);
      const daysDiff = Math.floor(
        (paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 90) {
        anomalies.push({
          id: `detected-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          type: 'delayed_payment',
          severity: 'medium',
          cardIds: [relatedInvoice.id, payment.id],
          description: `发票 ${payment.data.relatedInvoice} 付款滞后 ${daysDiff} 天（发票日期：${relatedInvoice.data.date}，付款日期：${payment.data.date}）`,
          scoreDelta: 20,
          isDetected: true,
          isWronglyMarked: false,
        });
      }
    }
  });

  return anomalies;
}

export function findAmountAnomalies(cards: Card[], selectedCardIds: string[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const selectedInvoices = cards.filter(
    c => c.type === 'invoice' && selectedCardIds.includes(c.id)
  ) as InvoiceCard[];
  const selectedPayments = cards.filter(
    c => c.type === 'payment' && selectedCardIds.includes(c.id)
  ) as PaymentCard[];

  const invoiceByNo = new Map(selectedInvoices.map(i => [i.data.invoiceNo, i]));

  selectedPayments.forEach(payment => {
    const relatedInvoice = invoiceByNo.get(payment.data.relatedInvoice);
    if (relatedInvoice && Math.abs(relatedInvoice.data.amount - payment.data.amount) > 0.01) {
      anomalies.push({
        id: `detected-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        type: 'amount_anomaly',
        severity: 'medium',
        cardIds: [relatedInvoice.id, payment.id],
        description: `发票 ${payment.data.relatedInvoice} 金额（${relatedInvoice.data.amount}）与付款金额（${payment.data.amount}）不一致`,
        scoreDelta: 15,
        isDetected: true,
        isWronglyMarked: false,
      });
    }
  });

  return anomalies;
}

export function detectAllAnomalies(cards: Card[], selectedCardIds: string[]): Anomaly[] {
  const duplicates = findDuplicateInvoices(
    cards.filter(c => selectedCardIds.includes(c.id))
  );
  const mismatches = findMismatchChains(cards, selectedCardIds);
  const delays = findDelayedPayments(cards, selectedCardIds);
  const amounts = findAmountAnomalies(cards, selectedCardIds);

  return [...duplicates, ...mismatches, ...delays, ...amounts];
}

export function validateAnomalyDetection(
  detectedAnomalies: Anomaly[],
  actualAnomalies: Anomaly[]
): {
  correctDetections: Anomaly[];
  wrongMarks: Anomaly[];
  missedAnomalies: Anomaly[];
} {
  const correctDetections: Anomaly[] = [];
  const wrongMarks: Anomaly[] = [];
  const missedAnomalies: Anomaly[] = [];

  const actualAnomalyMap = new Map(
    actualAnomalies.map(a => [a.type + '-' + a.cardIds.sort().join(','), a])
  );

  detectedAnomalies.forEach(detected => {
    const key = detected.type + '-' + detected.cardIds.slice().sort().join(',');
    const actual = actualAnomalyMap.get(key);
    if (actual) {
      correctDetections.push({ ...detected, isDetected: true, isWronglyMarked: false });
      actualAnomalyMap.delete(key);
    } else {
      wrongMarks.push({ ...detected, isDetected: false, isWronglyMarked: true });
    }
  });

  actualAnomalyMap.forEach(anomaly => {
    missedAnomalies.push({ ...anomaly, isDetected: false, isWronglyMarked: false });
  });

  return { correctDetections, wrongMarks, missedAnomalies };
}
