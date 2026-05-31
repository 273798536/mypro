const { parseISO, differenceInDays } = require('date-fns');

class WalletTransaction {
  constructor(data) {
    this.id = data.id || data.txHash || `${data.hash}-${data.from}-${data.to}`;
    this.hash = data.hash || data.txHash;
    this.blockNumber = parseInt(data.blockNumber) || 0;
    this.timestamp = this._parseTimestamp(data.timestamp || data.time || data.date);
    this.from = data.from || '';
    this.to = data.to || '';
    this.tokenSymbol = data.tokenSymbol || data.symbol || '';
    this.tokenAddress = data.tokenAddress || data.contractAddress || '';
    this.amount = parseFloat(data.amount) || 0;
    this.amountUSD = parseFloat(data.amountUSD) || null;
    this.transactionType = data.transactionType || data.type || 'transfer';
    this.gasFee = parseFloat(data.gasFee) || 0;
    this.gasFeeUSD = parseFloat(data.gasFeeUSD) || 0;
    this.methodId = data.methodId || data.method || '';
    this.raw = data;
  }

  _parseTimestamp(ts) {
    if (!ts) return new Date();
    if (ts instanceof Date) return ts;
    if (typeof ts === 'number') {
      return ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
    }
    return parseISO(String(ts));
  }

  isInternalTransfer(walletAddresses) {
    return walletAddresses.includes(this.from.toLowerCase()) &&
           walletAddresses.includes(this.to.toLowerCase());
  }

  isAirdropReceive(walletAddresses) {
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const fromAddr = this.from.toLowerCase();
    const toAddr = this.to.toLowerCase();
    const fromIsWallet = walletAddresses.includes(fromAddr);
    const toIsWallet = walletAddresses.includes(toAddr);
    
    return toIsWallet &&
           (!fromIsWallet || fromAddr === ZERO_ADDRESS) &&
           this.amount > 0;
  }
}

class AirdropAnnouncement {
  constructor(data) {
    this.id = data.id || `ann-${Date.now()}`;
    this.projectName = data.projectName || data.project || '';
    this.tokenSymbol = data.tokenSymbol || data.symbol || '';
    this.tokenAddress = data.tokenAddress || '';
    this.announcementDate = this._parseDate(data.announcementDate || data.announcedAt);
    this.claimStartDate = this._parseDate(data.claimStartDate || data.claimStarts);
    this.claimEndDate = this._parseDate(data.claimEndDate || data.claimEnds);
    this.distributionDate = this._parseDate(data.distributionDate || data.distributedAt);
    this.totalAllocation = parseFloat(data.totalAllocation) || 0;
    this.vestingSchedule = data.vestingSchedule || null;
    this.lockupPeriod = parseInt(data.lockupPeriod) || 0;
    this.lockupEndDate = this._parseDate(data.lockupEndDate);
    this.eligibilityCriteria = data.eligibilityCriteria || '';
    this.officialUrl = data.officialUrl || '';
    this.status = data.status || 'announced';
    this.withdrawalReason = data.withdrawalReason || '';
    this.raw = data;
  }

  _parseDate(d) {
    if (!d) return null;
    if (d instanceof Date) return d;
    return parseISO(String(d));
  }

  isActive() {
    return this.status !== 'withdrawn' && this.status !== 'cancelled';
  }

  getLockupDays() {
    if (this.lockupEndDate && this.distributionDate) {
      return differenceInDays(this.lockupEndDate, this.distributionDate);
    }
    return this.lockupPeriod;
  }
}

class PriceSnapshot {
  constructor(data) {
    this.tokenSymbol = data.tokenSymbol || data.symbol || '';
    this.tokenAddress = data.tokenAddress || '';
    this.timestamp = this._parseTimestamp(data.timestamp || data.date || data.time);
    this.priceUSD = parseFloat(data.priceUSD) || parseFloat(data.price) || 0;
    this.source = data.source || 'unknown';
    this.isInterpolated = !!data.isInterpolated;
    this.interpolationRange = data.interpolationRange || null;
  }

  _parseTimestamp(ts) {
    if (!ts) return new Date();
    if (ts instanceof Date) return ts;
    if (typeof ts === 'number') {
      return ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
    }
    return parseISO(String(ts));
  }
}

class VestingEvent {
  constructor(data) {
    this.id = data.id || `vest-${Date.now()}`;
    this.airdropId = data.airdropId;
    this.tokenSymbol = data.tokenSymbol;
    this.amount = parseFloat(data.amount) || 0;
    this.vestingDate = data.vestingDate instanceof Date ? data.vestingDate : parseISO(String(data.vestingDate));
    this.isUnlocked = !!data.isUnlocked;
    this.unlockDate = data.unlockDate ? (data.unlockDate instanceof Date ? data.unlockDate : parseISO(String(data.unlockDate))) : null;
    this.earlyUnlock = !!data.earlyUnlock;
    this.earlyUnlockReason = data.earlyUnlockReason || '';
    this.priceAtVesting = parseFloat(data.priceAtVesting) || 0;
    this.priceAtUnlock = parseFloat(data.priceAtUnlock) || 0;
    this.transactionHash = data.transactionHash || '';
  }
}

class TaxRecord {
  constructor(data) {
    this.id = data.id || `tax-${Date.now()}`;
    this.timestamp = data.timestamp instanceof Date ? data.timestamp : parseISO(String(data.timestamp));
    this.tokenSymbol = data.tokenSymbol;
    this.eventType = data.eventType;
    this.amount = parseFloat(data.amount) || 0;
    this.priceUSD = parseFloat(data.priceUSD) || 0;
    this.valueUSD = parseFloat(data.valueUSD) || 0;
    this.gainLossUSD = parseFloat(data.gainLossUSD) || 0;
    this.holdingPeriod = data.holdingPeriod || '';
    this.costBasis = parseFloat(data.costBasis) || 0;
    this.txHash = data.txHash || '';
    this.relatedAnnouncementId = data.relatedAnnouncementId || '';
    this.notes = data.notes || '';
    this.flags = data.flags || [];
  }
}

class ProcessingFlags {
  constructor() {
    this.priceGapDetected = [];
    this.earlyUnlockDetected = [];
    this.internalTransferDuplicate = [];
    this.withdrawalAffected = [];
    this.priceUpdated = [];
  }

  addPriceGap(token, date, gapDays) {
    this.priceGapDetected.push({ token, date, gapDays });
  }

  addEarlyUnlock(airdropId, originalDate, actualDate) {
    this.earlyUnlockDetected.push({ airdropId, originalDate, actualDate });
  }

  addInternalTransferDuplicate(txId, reason) {
    this.internalTransferDuplicate.push({ txId, reason });
  }

  addWithdrawalAffected(recordId, announcementId) {
    this.withdrawalAffected.push({ recordId, announcementId });
  }

  addPriceUpdated(recordId, oldPrice, newPrice) {
    this.priceUpdated.push({ recordId, oldPrice, newPrice });
  }
}

module.exports = {
  WalletTransaction,
  AirdropAnnouncement,
  PriceSnapshot,
  VestingEvent,
  TaxRecord,
  ProcessingFlags
};
