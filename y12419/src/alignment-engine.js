const { sortBy, groupBy, keyBy } = require('lodash');
const { differenceInMinutes, differenceInDays, addDays, formatISO } = require('date-fns');
const { WalletTransaction, AirdropAnnouncement, PriceSnapshot, ProcessingFlags } = require('./models');

class DataAlignmentEngine {
  constructor(options = {}) {
    this.options = {
      maxTimeWindowMinutes: options.maxTimeWindowMinutes || 1440,
      priceInterpolationMaxGapDays: options.priceInterpolationMaxGapDays || 7,
      strictMode: options.strictMode || false
    };
    this.flags = new ProcessingFlags();
    this.transactions = [];
    this.announcements = [];
    this.prices = [];
    this.walletAddresses = [];
    this.priceCache = new Map();
    this.alignedData = null;
  }

  loadWalletTransactions(transactions, walletAddresses) {
    this.transactions = transactions.map(t => new WalletTransaction(t));
    this.walletAddresses = walletAddresses.map(addr => addr.toLowerCase());
    this.transactions = sortBy(this.transactions, 'timestamp');
    return this;
  }

  loadAirdropAnnouncements(announcements) {
    this.announcements = announcements.map(a => new AirdropAnnouncement(a));
    this.announcements = sortBy(this.announcements, 'announcementDate');
    return this;
  }

  loadPriceSnapshots(prices) {
    this.prices = prices.map(p => new PriceSnapshot(p));
    this.prices = sortBy(this.prices, ['tokenSymbol', 'timestamp']);
    this._buildPriceCache();
    return this;
  }

  _buildPriceCache() {
    this.priceCache.clear();
    const grouped = groupBy(this.prices, p => p.tokenSymbol.toLowerCase());
    
    for (const [symbol, prices] of Object.entries(grouped)) {
      this.priceCache.set(symbol, sortBy(prices, 'timestamp'));
    }
  }

  getPriceAtDate(tokenSymbol, targetDate) {
    const symbol = tokenSymbol.toLowerCase();
    const prices = this.priceCache.get(symbol);
    
    if (!prices || prices.length === 0) {
      return null;
    }

    let closestBefore = null;
    let closestAfter = null;

    for (const price of prices) {
      if (price.timestamp <= targetDate) {
        if (!closestBefore || price.timestamp > closestBefore.timestamp) {
          closestBefore = price;
        }
      }
      if (price.timestamp >= targetDate) {
        if (!closestAfter || price.timestamp < closestAfter.timestamp) {
          closestAfter = price;
        }
      }
    }

    if (closestBefore && closestAfter) {
      const gapDays = differenceInDays(closestAfter.timestamp, closestBefore.timestamp);
      
      if (gapDays === 0) {
        return closestBefore;
      }

      if (gapDays <= this.options.priceInterpolationMaxGapDays) {
        const totalMinutes = differenceInMinutes(closestAfter.timestamp, closestBefore.timestamp);
        const targetMinutes = differenceInMinutes(targetDate, closestBefore.timestamp);
        const ratio = targetMinutes / totalMinutes;
        const interpolatedPrice = closestBefore.priceUSD + (closestAfter.priceUSD - closestBefore.priceUSD) * ratio;
        
        return new PriceSnapshot({
          tokenSymbol,
          timestamp: targetDate,
          priceUSD: interpolatedPrice,
          source: 'interpolated',
          isInterpolated: true,
          interpolationRange: {
            from: closestBefore.timestamp,
            to: closestAfter.timestamp,
            gapDays
          }
        });
      } else {
        this.flags.addPriceGap(tokenSymbol, formatISO(targetDate), gapDays);
        return this.options.strictMode ? null : closestBefore;
      }
    }

    if (closestBefore) {
      return closestBefore;
    }

    if (closestAfter) {
      this.flags.addPriceGap(tokenSymbol, formatISO(targetDate), null);
      return this.options.strictMode ? null : closestAfter;
    }

    return null;
  }

  alignAll() {
    const airdropTransactions = this._identifyAirdropTransactions();
    const matchedAirdrops = this._matchTransactionsToAnnouncements(airdropTransactions);
    const enrichedTransactions = this._enrichWithPrices(matchedAirdrops);
    
    this.alignedData = {
      transactions: this.transactions,
      announcements: this.announcements,
      airdropTransactions: enrichedTransactions,
      internalTransfers: this._identifyInternalTransfers(),
      flags: this.flags
    };

    return this.alignedData;
  }

  _identifyAirdropTransactions() {
    return this.transactions.filter(tx => tx.isAirdropReceive(this.walletAddresses));
  }

  _identifyInternalTransfers() {
    const internalTxs = this.transactions.filter(tx => tx.isInternalTransfer(this.walletAddresses));
    const duplicates = this._detectDuplicateInternalTransfers(internalTxs);
    
    duplicates.forEach(dup => {
      this.flags.addInternalTransferDuplicate(dup.txId, dup.reason);
    });

    return internalTxs.map(tx => ({
      ...tx,
      isDuplicate: duplicates.some(d => d.txId === tx.id),
      duplicateReason: duplicates.find(d => d.txId === tx.id)?.reason || ''
    }));
  }

  _detectDuplicateInternalTransfers(internalTxs) {
    const duplicates = [];
    const seen = new Map();

    for (const tx of internalTxs) {
      const key = `${tx.tokenSymbol}-${Math.abs(tx.amount)}-${formatISO(tx.timestamp).slice(0, 10)}`;
      
      if (seen.has(key)) {
        const prevTx = seen.get(key);
        const minutesDiff = Math.abs(differenceInMinutes(tx.timestamp, prevTx.timestamp));
        
        if (minutesDiff < 60) {
          duplicates.push({
            txId: tx.id,
            reason: `疑似重复内部转账: 与交易 ${prevTx.id} 金额相同、时间相差 ${minutesDiff} 分钟`
          });
        }
      } else {
        seen.set(key, tx);
      }
    }

    return duplicates;
  }

  _matchTransactionsToAnnouncements(airdropTxs) {
    const matched = [];
    const announcementsByToken = groupBy(this.announcements, a => a.tokenSymbol.toLowerCase());

    for (const tx of airdropTxs) {
      const tokenAnnouncements = announcementsByToken[tx.tokenSymbol.toLowerCase()] || [];
      let bestMatch = null;
      let bestScore = Infinity;

      for (const ann of tokenAnnouncements) {
        if (ann.distributionDate) {
          const timeDiff = Math.abs(differenceInMinutes(tx.timestamp, ann.distributionDate));
          
          if (timeDiff <= this.options.maxTimeWindowMinutes && timeDiff < bestScore) {
            bestScore = timeDiff;
            bestMatch = ann;
          }
        }
      }

      matched.push({
        transaction: tx,
        announcement: bestMatch,
        matchConfidence: bestMatch ? Math.max(0, 100 - (bestScore / 14.4)) : 0,
        alignmentStatus: bestMatch ? 'matched' : 'unmatched'
      });
    }

    return matched;
  }

  _enrichWithPrices(matchedAirdrops) {
    return matchedAirdrops.map(item => {
      const priceSnapshot = this.getPriceAtDate(item.transaction.tokenSymbol, item.transaction.timestamp);
      const priceUSD = priceSnapshot?.priceUSD || 0;
      
      return {
        ...item,
        priceSnapshot,
        priceUSD,
        valueUSD: item.transaction.amount * priceUSD,
        hasPriceGap: priceSnapshot?.isInterpolated || !priceSnapshot
      };
    });
  }

  getAlignedData() {
    if (!this.alignedData) {
      return this.alignAll();
    }
    return this.alignedData;
  }

  updatePrices(newPrices) {
    this.loadPriceSnapshots(newPrices);
    this.alignedData = null;
    return this.alignAll();
  }
}

module.exports = DataAlignmentEngine;
