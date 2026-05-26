import { DataStore } from '../models/store';
import { Transaction, TaxRecord, TokenSymbol } from '../models/types';

interface Holding {
  symbol: TokenSymbol;
  amount: number;
  costBasisUsd: number;
  avgPriceUsd: number;
  acquiredAt: Date;
}

export class TaxCalculator {
  private store: DataStore;

  constructor() {
    this.store = DataStore.getInstance();
  }

  calculateTaxRecords(ownerId: string, taxYear?: number): {
    records: TaxRecord[];
    summary: {
      totalIncomeUsd: number;
      totalCapitalGainsUsd: number;
      totalCapitalLossesUsd: number;
      totalExpensesUsd: number;
      totalGasFeesUsd: number;
      netGainsUsd: number;
    };
  } {
    const transactions = this.store.getTransactionsByOwner(ownerId)
      .filter(tx => !tx.isInternal)
      .filter(tx => tx.warnings.length === 0)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (taxYear) {
      transactions.filter(tx => new Date(tx.timestamp).getFullYear() === taxYear);
    }

    const holdings: Map<TokenSymbol, Holding[]> = new Map();
    const records: TaxRecord[] = [];
    let totalIncomeUsd = 0;
    let totalCapitalGainsUsd = 0;
    let totalCapitalLossesUsd = 0;
    let totalExpensesUsd = 0;
    let totalGasFeesUsd = 0;

    for (const tx of transactions) {
      const txYear = new Date(tx.timestamp).getFullYear();
      const amountUsd = this.calculateAmountUsd(tx);
      const ownerAddresses = new Set(
        this.store.getAddressesByOwner(ownerId).map(a => a.address.toLowerCase())
      );
      
      const isOutgoing = ownerAddresses.has(tx.fromAddress.toLowerCase());
      const isIncoming = ownerAddresses.has(tx.toAddress.toLowerCase());

      if (tx.gasFee > 0 && amountUsd > 0) {
        const gasUsd = tx.gasFee * (tx.priceUsdAtTime || 0);
        totalGasFeesUsd += gasUsd;
        
        records.push(this.store.addTaxRecord({
          transactionId: tx.id,
          ownerId,
          taxYear: txYear,
          category: 'gas_fee',
          amountUsd: gasUsd,
          isFinalized: false,
          notes: `Gas fee for ${tx.txHash}`
        }));
      }

      if (isIncoming && !isOutgoing) {
        if (tx.type === 'income' || tx.type === 'exchange_withdraw') {
          totalIncomeUsd += amountUsd;
          records.push(this.store.addTaxRecord({
            transactionId: tx.id,
            ownerId,
            taxYear: txYear,
            category: 'income',
            amountUsd,
            isFinalized: false,
            notes: `Income from ${tx.fromAddress}`
          }));
        }

        this.addToHoldings(holdings, tx, amountUsd);
      }

      if (isOutgoing && !isIncoming) {
        if (tx.type === 'expense' || tx.type === 'exchange_deposit') {
          totalExpensesUsd += amountUsd;
          records.push(this.store.addTaxRecord({
            transactionId: tx.id,
            ownerId,
            taxYear: txYear,
            category: 'expense',
            amountUsd,
            isFinalized: false,
            notes: `Expense to ${tx.toAddress}`
          }));
        }

        if (tx.type === 'transfer' || tx.type === 'expense') {
          const result = this.calculateCapitalGainLoss(holdings, tx, amountUsd);
          if (result) {
            if (result.gainLossUsd >= 0) {
              totalCapitalGainsUsd += result.gainLossUsd;
            } else {
              totalCapitalLossesUsd += Math.abs(result.gainLossUsd);
            }

            records.push(this.store.addTaxRecord({
              transactionId: tx.id,
              ownerId,
              taxYear: txYear,
              category: result.gainLossUsd >= 0 ? 'capital_gain' : 'capital_loss',
              amountUsd: Math.abs(result.gainLossUsd),
              costBasisUsd: result.costBasisUsd,
              proceedsUsd: result.proceedsUsd,
              gainLossUsd: result.gainLossUsd,
              holdingPeriod: result.holdingPeriod,
              isFinalized: false,
              notes: `FIFO disposal of ${tx.amount} ${tx.tokenSymbol}`
            }));
          }
        }
      }
    }

    return {
      records,
      summary: {
        totalIncomeUsd,
        totalCapitalGainsUsd,
        totalCapitalLossesUsd,
        totalExpensesUsd,
        totalGasFeesUsd,
        netGainsUsd: totalCapitalGainsUsd - totalCapitalLossesUsd
      }
    };
  }

  private calculateAmountUsd(tx: Transaction): number {
    if (tx.priceUsdAtTime) {
      return tx.amount * tx.priceUsdAtTime;
    }
    return 0;
  }

  private addToHoldings(holdings: Map<TokenSymbol, Holding[]>, tx: Transaction, amountUsd: number): void {
    const symbolHoldings = holdings.get(tx.tokenSymbol) || [];
    symbolHoldings.push({
      symbol: tx.tokenSymbol,
      amount: tx.amount,
      costBasisUsd: amountUsd,
      avgPriceUsd: amountUsd / tx.amount,
      acquiredAt: tx.timestamp
    });
    holdings.set(tx.tokenSymbol, symbolHoldings);
  }

  private calculateCapitalGainLoss(
    holdings: Map<TokenSymbol, Holding[]>,
    tx: Transaction,
    proceedsUsd: number
  ): {
    costBasisUsd: number;
    proceedsUsd: number;
    gainLossUsd: number;
    holdingPeriod: 'short_term' | 'long_term';
  } | null {
    const symbolHoldings = holdings.get(tx.tokenSymbol);
    if (!symbolHoldings || symbolHoldings.length === 0) {
      return null;
    }

    let remainingAmount = tx.amount;
    let totalCostBasis = 0;
    let oldestAcquiredAt: Date | null = null;

    for (let i = 0; i < symbolHoldings.length && remainingAmount > 0; i++) {
      const holding = symbolHoldings[i];
      const disposeAmount = Math.min(remainingAmount, holding.amount);
      const costBasisPortion = (disposeAmount / holding.amount) * holding.costBasisUsd;
      
      totalCostBasis += costBasisPortion;
      
      if (!oldestAcquiredAt || holding.acquiredAt < oldestAcquiredAt) {
        oldestAcquiredAt = holding.acquiredAt;
      }

      holding.amount -= disposeAmount;
      holding.costBasisUsd -= costBasisPortion;
      remainingAmount -= disposeAmount;

      if (holding.amount <= 0) {
        symbolHoldings.splice(i, 1);
        i--;
      }
    }

    if (!oldestAcquiredAt) {
      oldestAcquiredAt = tx.timestamp;
    }

    const holdingDays = (tx.timestamp.getTime() - oldestAcquiredAt.getTime()) / (1000 * 60 * 60 * 24);
    const holdingPeriod = holdingDays >= 365 ? 'long_term' : 'short_term';

    return {
      costBasisUsd: totalCostBasis,
      proceedsUsd,
      gainLossUsd: proceedsUsd - totalCostBasis,
      holdingPeriod
    };
  }

  getTaxSummary(ownerId: string, year?: number): {
    byCategory: Record<string, number>;
    byMonth: Record<string, Record<string, number>>;
    total: number;
  } {
    const records = this.store.getTaxRecordsByOwner(ownerId, year);
    const byCategory: Record<string, number> = {};
    const byMonth: Record<string, Record<string, number>> = {};
    let total = 0;

    for (const record of records) {
      if (!byCategory[record.category]) {
        byCategory[record.category] = 0;
      }
      byCategory[record.category] += record.amountUsd;

      const monthKey = record.taxYear.toString();
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {};
      }
      if (!byMonth[monthKey][record.category]) {
        byMonth[monthKey][record.category] = 0;
      }
      byMonth[monthKey][record.category] += record.amountUsd;

      if (record.category === 'capital_gain' || record.category === 'income') {
        total += record.amountUsd;
      } else if (record.category === 'capital_loss') {
        total -= record.amountUsd;
      }
    }

    return { byCategory, byMonth, total };
  }

  getHoldings(ownerId: string): Map<TokenSymbol, { amount: number; costBasisUsd: number; avgPriceUsd: number }> {
    const transactions = this.store.getTransactionsByOwner(ownerId)
      .filter(tx => !tx.isInternal)
      .filter(tx => tx.warnings.length === 0)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const holdings: Map<TokenSymbol, Holding[]> = new Map();
    const result = new Map<TokenSymbol, { amount: number; costBasisUsd: number; avgPriceUsd: number }>();
    const ownerAddresses = new Set(
      this.store.getAddressesByOwner(ownerId).map(a => a.address.toLowerCase())
    );

    for (const tx of transactions) {
      const amountUsd = this.calculateAmountUsd(tx);
      const isIncoming = ownerAddresses.has(tx.toAddress.toLowerCase());
      const isOutgoing = ownerAddresses.has(tx.fromAddress.toLowerCase());

      if (isIncoming && !isOutgoing) {
        this.addToHoldings(holdings, tx, amountUsd);
      }

      if (isOutgoing && !isIncoming) {
        const symbolHoldings = holdings.get(tx.tokenSymbol);
        if (symbolHoldings) {
          let remainingAmount = tx.amount;
          for (let i = 0; i < symbolHoldings.length && remainingAmount > 0; i++) {
            const holding = symbolHoldings[i];
            const disposeAmount = Math.min(remainingAmount, holding.amount);
            const costBasisPortion = (disposeAmount / holding.amount) * holding.costBasisUsd;
            
            holding.amount -= disposeAmount;
            holding.costBasisUsd -= costBasisPortion;
            remainingAmount -= disposeAmount;

            if (holding.amount <= 0) {
              symbolHoldings.splice(i, 1);
              i--;
            }
          }
        }
      }
    }

    for (const [symbol, symbolHoldings] of holdings) {
      const totalAmount = symbolHoldings.reduce((sum, h) => sum + h.amount, 0);
      const totalCostBasis = symbolHoldings.reduce((sum, h) => sum + h.costBasisUsd, 0);
      
      result.set(symbol, {
        amount: totalAmount,
        costBasisUsd: totalCostBasis,
        avgPriceUsd: totalAmount > 0 ? totalCostBasis / totalAmount : 0
      });
    }

    return result;
  }
}
