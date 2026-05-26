import { DataStore } from '../models/store';
import { PriceSnapshot, TokenSymbol } from '../models/types';

const STABLECOINS: Set<string> = new Set(['USDC', 'USDT', 'DAI', 'BUSD', 'USDP']);

export class PriceService {
  private store: DataStore;

  constructor() {
    this.store = DataStore.getInstance();
  }

  getPrice(symbol: TokenSymbol, timestamp: Date): {
    priceUsd: number;
    source: string;
    confidence: number;
    isEstimated: boolean;
  } | null {
    if (STABLECOINS.has(symbol)) {
      return {
        priceUsd: 1,
        source: 'stablecoin_assumption',
        confidence: 0.99,
        isEstimated: false
      };
    }

    const snapshot = this.store.getPrice(symbol, timestamp);
    if (snapshot) {
      return {
        priceUsd: snapshot.priceUsd,
        source: snapshot.source,
        confidence: snapshot.confidence,
        isEstimated: false
      };
    }

    const priceHistory = this.store.getAllPrices()
      .filter(p => p.symbol === symbol)
      .sort((a, b) => Math.abs(a.timestamp.getTime() - timestamp.getTime()) - 
                      Math.abs(b.timestamp.getTime() - timestamp.getTime()));

    if (priceHistory.length > 0) {
      const closest = priceHistory[0];
      const hoursDiff = Math.abs(closest.timestamp.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff < 72) {
        const confidence = Math.max(0.5, 0.95 - (hoursDiff * 0.01));
        return {
          priceUsd: closest.priceUsd,
          source: `estimated_from_${hoursDiff.toFixed(1)}h_ago`,
          confidence,
          isEstimated: true
        };
      }
    }

    return null;
  }

  addPriceSnapshot(symbol: TokenSymbol, timestamp: Date, priceUsd: number, source: string, confidence: number = 0.9): PriceSnapshot {
    return this.store.addPrice({
      symbol,
      timestamp,
      priceUsd,
      source,
      confidence
    });
  }

  batchAddPrices(prices: Array<{
    symbol: TokenSymbol;
    timestamp: Date;
    priceUsd: number;
    source: string;
    confidence?: number;
  }>): PriceSnapshot[] {
    return prices.map(p => this.addPriceSnapshot(p.symbol, p.timestamp, p.priceUsd, p.source, p.confidence));
  }

  getMissingPriceDates(transactions: Array<{ timestamp: Date; tokenSymbol: TokenSymbol }>): Array<{
    symbol: TokenSymbol;
    timestamp: Date;
    count: number;
  }> {
    const missingMap = new Map<string, { symbol: TokenSymbol; timestamp: Date; count: number }>();

    for (const tx of transactions) {
      if (STABLECOINS.has(tx.tokenSymbol)) continue;

      const price = this.getPrice(tx.tokenSymbol, tx.timestamp);
      if (!price || price.isEstimated) {
        const dayStart = new Date(tx.timestamp);
        dayStart.setHours(0, 0, 0, 0);
        const key = `${tx.tokenSymbol}_${dayStart.toISOString()}`;
        
        if (missingMap.has(key)) {
          missingMap.get(key)!.count++;
        } else {
          missingMap.set(key, {
            symbol: tx.tokenSymbol,
            timestamp: dayStart,
            count: 1
          });
        }
      }
    }

    return Array.from(missingMap.values()).sort((a, b) => b.count - a.count);
  }

  fillMissingPricesForTransactions(): {
    filled: number;
    stillMissing: number;
    details: Array<{ txId: string; symbol: TokenSymbol; hasPrice: boolean; isEstimated: boolean }>;
  } {
    const transactions = this.store.getAllTransactions();
    let filled = 0;
    let stillMissing = 0;
    const details: Array<{ txId: string; symbol: TokenSymbol; hasPrice: boolean; isEstimated: boolean }> = [];

    for (const tx of transactions) {
      if (tx.priceUsdAtTime) {
        details.push({ txId: tx.id, symbol: tx.tokenSymbol, hasPrice: true, isEstimated: false });
        continue;
      }

      const price = this.getPrice(tx.tokenSymbol, tx.timestamp);
      if (price) {
        this.store.updateTransaction(
          tx.id,
          {
            priceUsdAtTime: price.priceUsd,
            priceSource: price.source
          },
          `price_${price.isEstimated ? 'estimated' : 'filled'}`,
          'system'
        );
        filled++;
        details.push({ txId: tx.id, symbol: tx.tokenSymbol, hasPrice: true, isEstimated: price.isEstimated });
      } else {
        stillMissing++;
        details.push({ txId: tx.id, symbol: tx.tokenSymbol, hasPrice: false, isEstimated: false });
      }
    }

    return { filled, stillMissing, details };
  }

  generateMockPrices(symbol: TokenSymbol, startDate: Date, endDate: Date, basePrice: number): PriceSnapshot[] {
    const prices: PriceSnapshot[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const variance = (Math.random() - 0.5) * 0.2;
      const price = basePrice * (1 + variance);
      
      prices.push(this.addPriceSnapshot(
        symbol,
        new Date(currentDate),
        price,
        'mock_data',
        0.5
      ));
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return prices;
  }
}
