import type { PaymentSplit, PaymentStatus } from '@shared/types';

export class PaymentSplitService {
  private randomRow(base = 3): number {
    return base + Math.floor(Math.random() * 20);
  }

  splitTotalAmount(totalAmount: number, taxRates: { stamp?: number; trade?: number; settle?: number } = {}): PaymentSplit[] {
    const { stamp = 0.001, trade = 0.00005, settle = 0.00002 } = taxRates;
    const baseRow = this.randomRow();
    const result: PaymentSplit[] = [];
    const splits = [
      { key: 'stamp', label: 'T+0结算', ratio: 0.55, tax: stamp },
      { key: 'trade', label: 'T+1交收', ratio: 0.3, tax: trade },
      { key: 'settle', label: 'T+1交收', ratio: 0.15, tax: settle },
    ] as const;
    splits.forEach((s, i) => {
      const amt = Math.round(totalAmount * s.ratio);
      result.push({
        id: `split-${Date.now()}-${i}`,
        sourceRow: baseRow + i * 3,
        affectedScope: [s.label],
        amount: amt,
        tax: Number((amt * s.tax).toFixed(2)),
        status: 'matched' as PaymentStatus,
      });
    });
    return result;
  }

  markRevised(payments: PaymentSplit[], ids: string[]): PaymentSplit[] {
    return payments.map((p) => (ids.includes(p.id) ? { ...p, status: 'revised' as PaymentStatus } : p));
  }
}

export const paymentSplitService = new PaymentSplitService();
