const { sortBy, groupBy } = require('lodash');
const { differenceInDays, differenceInMinutes, formatISO, isBefore, isAfter } = require('date-fns');
const { VestingEvent, TaxRecord, ProcessingFlags } = require('./models');

class VestingTaxEngine {
  constructor(alignmentEngine, options = {}) {
    this.alignmentEngine = alignmentEngine;
    this.options = {
      longTermHoldingDays: options.longTermHoldingDays || 365,
      includeGasInBasis: options.includeGasInBasis !== false,
      costBasisMethod: options.costBasisMethod || 'fifo'
    };
    this.flags = new ProcessingFlags();
    this.vestingEvents = [];
    this.taxRecords = [];
    this.historicalResults = [];
    this.withdrawnAnnouncements = new Set();
  }

  processAll() {
    const alignedData = this.alignmentEngine.getAlignedData();
    
    this.processVestingEvents(alignedData);
    this.calculateTaxRecords(alignedData);
    this.checkWithdrawalImpact();
    
    return {
      vestingEvents: this.vestingEvents,
      taxRecords: this.taxRecords,
      flags: this.flags,
      summary: this.generateSummary()
    };
  }

  processVestingEvents(alignedData) {
    this.vestingEvents = [];
    
    for (const item of alignedData.airdropTransactions) {
      if (!item.announcement) continue;
      
      const ann = item.announcement;
      const tx = item.transaction;
      
      if (ann.vestingSchedule && ann.vestingSchedule.length > 0) {
        this._processVestingSchedule(item, ann.vestingSchedule);
      } else if (ann.lockupEndDate || ann.lockupPeriod > 0) {
        this._processSingleLockup(item, ann);
      } else {
        this._processImmediateUnlock(item);
      }
    }
    
    this._detectEarlyUnlocks(alignedData);
    this.vestingEvents = sortBy(this.vestingEvents, 'vestingDate');
  }

  _processVestingSchedule(item, schedule) {
    const tx = item.transaction;
    const ann = item.announcement;
    const totalAmount = tx.amount;
    
    for (const vest of schedule) {
      const vestAmount = totalAmount * (vest.percentage / 100);
      const vestingDate = vest.date ? new Date(vest.date) : 
        (vest.daysAfterDistribution ? new Date(tx.timestamp.getTime() + vest.daysAfterDistribution * 86400000) : tx.timestamp);
      
      const event = new VestingEvent({
        airdropId: ann.id,
        tokenSymbol: tx.tokenSymbol,
        amount: vestAmount,
        vestingDate: vestingDate,
        isUnlocked: isBefore(vestingDate, new Date()),
        unlockDate: isBefore(vestingDate, new Date()) ? vestingDate : null,
        earlyUnlock: false,
        priceAtVesting: this._getPrice(tx.tokenSymbol, vestingDate),
        transactionHash: tx.hash
      });
      
      this.vestingEvents.push(event);
    }
  }

  _processSingleLockup(item, ann) {
    const tx = item.transaction;
    const lockupEndDate = ann.lockupEndDate || 
      new Date(tx.timestamp.getTime() + ann.lockupPeriod * 86400000);
    
    const event = new VestingEvent({
      airdropId: ann.id,
      tokenSymbol: tx.tokenSymbol,
      amount: tx.amount,
      vestingDate: lockupEndDate,
      isUnlocked: isBefore(lockupEndDate, new Date()),
      unlockDate: isBefore(lockupEndDate, new Date()) ? lockupEndDate : null,
      earlyUnlock: false,
      priceAtVesting: this._getPrice(tx.tokenSymbol, lockupEndDate),
      transactionHash: tx.hash
    });
    
    this.vestingEvents.push(event);
  }

  _processImmediateUnlock(item) {
    const tx = item.transaction;
    
    const event = new VestingEvent({
      airdropId: item.announcement?.id,
      tokenSymbol: tx.tokenSymbol,
      amount: tx.amount,
      vestingDate: tx.timestamp,
      isUnlocked: true,
      unlockDate: tx.timestamp,
      earlyUnlock: false,
      priceAtVesting: this._getPrice(tx.tokenSymbol, tx.timestamp),
      transactionHash: tx.hash
    });
    
    this.vestingEvents.push(event);
  }

  _detectEarlyUnlocks(alignedData) {
    const unlockTransactions = alignedData.transactions.filter(tx => 
      tx.transactionType === 'unlock' || 
      tx.transactionType === 'claim' ||
      tx.methodId?.toLowerCase().includes('unlock') ||
      tx.methodId?.toLowerCase().includes('claim')
    );

    for (const event of this.vestingEvents) {
      if (!event.isUnlocked) continue;
      
      const matchingTx = unlockTransactions.find(tx => {
        const timeDiff = Math.abs(differenceInMinutes(tx.timestamp, event.unlockDate || event.vestingDate));
        return timeDiff < 1440 && 
               tx.tokenSymbol.toLowerCase() === event.tokenSymbol.toLowerCase();
      });

      if (matchingTx && isBefore(matchingTx.timestamp, event.vestingDate)) {
        event.earlyUnlock = true;
        event.earlyUnlockReason = '实际解锁交易早于原计划解锁日期';
        event.unlockDate = matchingTx.timestamp;
        event.priceAtUnlock = this._getPrice(event.tokenSymbol, matchingTx.timestamp);
        
        this.flags.addEarlyUnlock(
          event.airdropId,
          formatISO(event.vestingDate),
          formatISO(matchingTx.timestamp)
        );
      }
    }
  }

  calculateTaxRecords(alignedData) {
    this.taxRecords = [];
    
    for (const item of alignedData.airdropTransactions) {
      this._createAirdropIncomeRecord(item);
    }
    
    for (const event of this.vestingEvents) {
      if (event.isUnlocked && event.earlyUnlock) {
        this._createEarlyUnlockRecord(event);
      }
    }
    
    this._processDisposals(alignedData);
    this._handleInternalTransfers(alignedData);
    
    this.taxRecords = sortBy(this.taxRecords, 'timestamp');
  }

  _createAirdropIncomeRecord(item) {
    const tx = item.transaction;
    const price = item.priceUSD;
    const value = item.valueUSD;
    
    const record = new TaxRecord({
      timestamp: tx.timestamp,
      tokenSymbol: tx.tokenSymbol,
      eventType: 'airdrop_income',
      amount: tx.amount,
      priceUSD: price,
      valueUSD: value,
      gainLossUSD: value,
      holdingPeriod: 'short_term',
      costBasis: 0,
      txHash: tx.hash,
      relatedAnnouncementId: item.announcement?.id || '',
      notes: item.announcement 
        ? `空投收入 - ${item.announcement.projectName}` 
        : '空投收入 - 未匹配公告',
      flags: this._getFlagsForItem(item)
    });
    
    if (item.hasPriceGap) {
      record.notes += ' [注意: 使用了插值或估算价格]';
    }
    
    this.taxRecords.push(record);
  }

  _createEarlyUnlockRecord(event) {
    const originalUnlockValue = event.amount * event.priceAtVesting;
    const actualUnlockValue = event.amount * (event.priceAtUnlock || event.priceAtVesting);
    const priceDiff = actualUnlockValue - originalUnlockValue;
    
    const record = new TaxRecord({
      timestamp: event.unlockDate,
      tokenSymbol: event.tokenSymbol,
      eventType: 'early_unlock',
      amount: event.amount,
      priceUSD: event.priceAtUnlock || event.priceAtVesting,
      valueUSD: actualUnlockValue,
      gainLossUSD: priceDiff,
      holdingPeriod: 'short_term',
      costBasis: originalUnlockValue,
      txHash: event.transactionHash,
      relatedAnnouncementId: event.airdropId,
      notes: `锁仓提前解锁 - 原解锁日期: ${formatISO(event.vestingDate)}`,
      flags: ['early_unlock']
    });
    
    this.taxRecords.push(record);
  }

  _processDisposals(alignedData) {
    const holdings = this._buildHoldings();
    
    const sellTransactions = alignedData.transactions.filter(tx => 
      (tx.transactionType === 'sell' || 
       tx.transactionType === 'swap' ||
       tx.transactionType === 'transfer_out') &&
      tx.amount < 0
    );

    for (const sell of sellTransactions) {
      const costBasis = this._calculateCostBasis(holdings, sell);
      const price = this._getPrice(sell.tokenSymbol, sell.timestamp);
      const proceeds = Math.abs(sell.amount) * price;
      const gainLoss = proceeds - costBasis;
      
      const record = new TaxRecord({
        timestamp: sell.timestamp,
        tokenSymbol: sell.tokenSymbol,
        eventType: 'disposal',
        amount: Math.abs(sell.amount),
        priceUSD: price,
        valueUSD: proceeds,
        gainLossUSD: gainLoss,
        holdingPeriod: this._determineHoldingPeriod(holdings, sell),
        costBasis: costBasis,
        txHash: sell.hash,
        notes: '资产处置',
        flags: []
      });
      
      this.taxRecords.push(record);
    }
  }

  _buildHoldings() {
    const holdings = [];
    
    for (const item of this.alignmentEngine.getAlignedData().airdropTransactions) {
      const tx = item.transaction;
      holdings.push({
        tokenSymbol: tx.tokenSymbol,
        amount: tx.amount,
        priceUSD: item.priceUSD,
        timestamp: tx.timestamp,
        remaining: tx.amount
      });
    }
    
    return sortBy(holdings, 'timestamp');
  }

  _calculateCostBasis(holdings, sellTx) {
    const symbol = sellTx.tokenSymbol.toLowerCase();
    const sellAmount = Math.abs(sellTx.amount);
    let remaining = sellAmount;
    let totalCost = 0;
    
    const relevantHoldings = holdings.filter(h => 
      h.tokenSymbol.toLowerCase() === symbol && h.remaining > 0
    );
    
    for (const holding of relevantHoldings) {
      if (remaining <= 0) break;
      
      const useAmount = Math.min(holding.remaining, remaining);
      totalCost += useAmount * holding.priceUSD;
      holding.remaining -= useAmount;
      remaining -= useAmount;
    }
    
    return totalCost;
  }

  _determineHoldingPeriod(holdings, sellTx) {
    const symbol = sellTx.tokenSymbol.toLowerCase();
    const relevantHoldings = holdings.filter(h => 
      h.tokenSymbol.toLowerCase() === symbol && h.remaining > 0
    );
    
    if (relevantHoldings.length === 0) return 'short_term';
    
    const oldestHolding = relevantHoldings[0];
    const daysHeld = differenceInDays(sellTx.timestamp, oldestHolding.timestamp);
    
    return daysHeld >= this.options.longTermHoldingDays ? 'long_term' : 'short_term';
  }

  _handleInternalTransfers(alignedData) {
    for (const it of alignedData.internalTransfers) {
      if (it.isDuplicate) {
        const record = new TaxRecord({
          timestamp: it.timestamp,
          tokenSymbol: it.tokenSymbol,
          eventType: 'internal_transfer',
          amount: Math.abs(it.amount),
          priceUSD: this._getPrice(it.tokenSymbol, it.timestamp),
          valueUSD: 0,
          gainLossUSD: 0,
          holdingPeriod: 'n/a',
          costBasis: 0,
          txHash: it.hash,
          notes: `内部转账 ${it.isDuplicate ? '[疑似重复] ' : ''}- ${it.duplicateReason || ''}`,
          flags: it.isDuplicate ? ['duplicate', 'internal_transfer'] : ['internal_transfer']
        });
        
        this.taxRecords.push(record);
      }
    }
  }

  _getFlagsForItem(item) {
    const flags = [];
    if (item.hasPriceGap) flags.push('price_gap');
    if (item.matchConfidence < 80) flags.push('low_confidence_match');
    if (!item.announcement) flags.push('unmatched_announcement');
    return flags;
  }

  _getPrice(tokenSymbol, date) {
    const snapshot = this.alignmentEngine.getPriceAtDate(tokenSymbol, date);
    return snapshot?.priceUSD || 0;
  }

  checkWithdrawalImpact() {
    const withdrawnAnns = this.alignmentEngine.announcements.filter(a => !a.isActive());
    
    for (const ann of withdrawnAnns) {
      if (!this.withdrawnAnnouncements.has(ann.id)) {
        this.withdrawnAnnouncements.add(ann.id);
        
        const affectedRecords = this.taxRecords.filter(r => 
          r.relatedAnnouncementId === ann.id
        );
        
        for (const record of affectedRecords) {
          record.flags = [...(record.flags || []), 'withdrawn_airdrop'];
          record.notes += ` [公告已撤回: ${ann.withdrawalReason || '未说明原因'}]`;
          
          this.flags.addWithdrawalAffected(record.id, ann.id);
        }
      }
    }
  }

  recalculateWithPriceUpdate(newPrices) {
    const oldPrices = this.taxRecords.map(r => ({ id: r.id, price: r.priceUSD }));
    
    this.alignmentEngine.updatePrices(newPrices);
    this.taxRecords = [];
    this.vestingEvents = [];
    
    const result = this.processAll();
    
    for (const oldPrice of oldPrices) {
      const newRecord = this.taxRecords.find(r => r.id === oldPrice.id);
      if (newRecord && Math.abs(newRecord.priceUSD - oldPrice.price) > 0.01) {
        this.flags.addPriceUpdated(newRecord.id, oldPrice.price, newRecord.priceUSD);
      }
    }
    
    return result;
  }

  generateSummary() {
    const groupedRecords = groupBy(this.taxRecords, 'eventType');
    const groupedByToken = groupBy(this.taxRecords, 'tokenSymbol');
    
    const summary = {
      totalAirdropIncome: 0,
      totalDisposals: 0,
      totalCapitalGains: 0,
      totalEarlyUnlockValue: 0,
      byEventType: {},
      byToken: {},
      vestingSummary: {
        totalLocked: 0,
        totalUnlocked: 0,
        totalEarlyUnlocked: 0,
        upcomingVestings: []
      },
      flags: {
        priceGaps: this.flags.priceGapDetected,
        earlyUnlocks: this.flags.earlyUnlockDetected,
        duplicateTransfers: this.flags.internalTransferDuplicate,
        withdrawalImpacts: this.flags.withdrawalAffected,
        priceUpdates: this.flags.priceUpdated
      }
    };
    
    for (const [type, records] of Object.entries(groupedRecords)) {
      summary.byEventType[type] = {
        count: records.length,
        totalValue: records.reduce((sum, r) => sum + r.valueUSD, 0),
        totalGainLoss: records.reduce((sum, r) => sum + r.gainLossUSD, 0)
      };
      
      if (type === 'airdrop_income') {
        summary.totalAirdropIncome = summary.byEventType[type].totalValue;
      } else if (type === 'disposal') {
        summary.totalDisposals = summary.byEventType[type].totalValue;
        summary.totalCapitalGains = summary.byEventType[type].totalGainLoss;
      } else if (type === 'early_unlock') {
        summary.totalEarlyUnlockValue = summary.byEventType[type].totalValue;
      }
    }
    
    for (const [token, records] of Object.entries(groupedByToken)) {
      summary.byToken[token] = {
        count: records.length,
        totalValue: records.reduce((sum, r) => sum + r.valueUSD, 0),
        totalGainLoss: records.reduce((sum, r) => sum + r.gainLossUSD, 0)
      };
    }
    
    for (const event of this.vestingEvents) {
      if (event.isUnlocked) {
        summary.vestingSummary.totalUnlocked += event.amount;
        if (event.earlyUnlock) {
          summary.vestingSummary.totalEarlyUnlocked += event.amount;
        }
      } else {
        summary.vestingSummary.totalLocked += event.amount;
        summary.vestingSummary.upcomingVestings.push({
          tokenSymbol: event.tokenSymbol,
          amount: event.amount,
          vestingDate: event.vestingDate
        });
      }
    }
    
    return summary;
  }
}

module.exports = VestingTaxEngine;
