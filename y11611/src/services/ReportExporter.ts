import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { DataStore } from '../models/store';
import { Transaction, TaxRecord, WalletAddress, AuditLog } from '../models/types';

export class ReportExporter {
  private store: DataStore;
  private exportDir: string;

  constructor() {
    this.store = DataStore.getInstance();
    this.exportDir = path.join(process.cwd(), 'data', 'exports');
    this.ensureExportDir();
  }

  private ensureExportDir(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async exportTransactionsToCsv(ownerId: string, filename?: string): Promise<string> {
    const transactions = this.store.getTransactionsByOwner(ownerId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const filePath = path.join(this.exportDir, filename || `transactions_${ownerId.substring(0, 8)}.csv`);
    
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'date', title: 'DATE' },
        { id: 'txHash', title: 'TX_HASH' },
        { id: 'chain', title: 'CHAIN' },
        { id: 'type', title: 'TYPE' },
        { id: 'fromAddress', title: 'FROM' },
        { id: 'toAddress', title: 'TO' },
        { id: 'tokenSymbol', title: 'SYMBOL' },
        { id: 'amount', title: 'AMOUNT' },
        { id: 'priceUsdAtTime', title: 'PRICE_USD' },
        { id: 'valueUsd', title: 'VALUE_USD' },
        { id: 'gasFee', title: 'GAS_FEE' },
        { id: 'isInternal', title: 'IS_INTERNAL' },
        { id: 'isBridge', title: 'IS_BRIDGE' },
        { id: 'warnings', title: 'WARNINGS' },
        { id: 'source', title: 'SOURCE' }
      ]
    });

    const records = transactions.map(tx => ({
      date: new Date(tx.timestamp).toISOString(),
      txHash: tx.txHash,
      chain: tx.chain,
      type: tx.type,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      tokenSymbol: tx.tokenSymbol,
      amount: tx.amount.toString(),
      priceUsdAtTime: tx.priceUsdAtTime?.toString() || '',
      valueUsd: ((tx.amount * (tx.priceUsdAtTime || 0))).toFixed(2),
      gasFee: tx.gasFee.toString(),
      isInternal: tx.isInternal.toString(),
      isBridge: tx.isBridge.toString(),
      warnings: tx.warnings.join('; '),
      source: tx.source
    }));

    await csvWriter.writeRecords(records);
    return filePath;
  }

  async exportTaxRecordsToCsv(ownerId: string, year?: number, filename?: string): Promise<string> {
    const records = this.store.getTaxRecordsByOwner(ownerId, year)
      .sort((a, b) => a.taxYear - b.taxYear);

    const filePath = path.join(this.exportDir, filename || `tax_records_${ownerId.substring(0, 8)}_${year || 'all'}.csv`);
    
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'taxYear', title: 'TAX_YEAR' },
        { id: 'category', title: 'CATEGORY' },
        { id: 'amountUsd', title: 'AMOUNT_USD' },
        { id: 'costBasisUsd', title: 'COST_BASIS_USD' },
        { id: 'proceedsUsd', title: 'PROCEEDS_USD' },
        { id: 'gainLossUsd', title: 'GAIN_LOSS_USD' },
        { id: 'holdingPeriod', title: 'HOLDING_PERIOD' },
        { id: 'isFinalized', title: 'IS_FINALIZED' },
        { id: 'transactionId', title: 'TX_ID' },
        { id: 'notes', title: 'NOTES' }
      ]
    });

    const csvRecords = records.map(r => ({
      taxYear: r.taxYear,
      category: r.category,
      amountUsd: r.amountUsd.toFixed(2),
      costBasisUsd: r.costBasisUsd?.toFixed(2) || '',
      proceedsUsd: r.proceedsUsd?.toFixed(2) || '',
      gainLossUsd: r.gainLossUsd?.toFixed(2) || '',
      holdingPeriod: r.holdingPeriod || '',
      isFinalized: r.isFinalized.toString(),
      transactionId: r.transactionId,
      notes: r.notes
    }));

    await csvWriter.writeRecords(csvRecords);
    return filePath;
  }

  exportToJson(ownerId: string, filename?: string): string {
    const data = {
      owner: this.store.getOwner(ownerId),
      addresses: this.store.getAddressesByOwner(ownerId),
      transactions: this.store.getTransactionsByOwner(ownerId),
      taxRecords: this.store.getTaxRecordsByOwner(ownerId),
      exportedAt: new Date().toISOString()
    };

    const filePath = path.join(this.exportDir, filename || `tax_data_${ownerId.substring(0, 8)}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  exportAuditLog(entityType?: string, entityId?: string, filename?: string): string {
    const logs = this.store.getAuditLogs(
      entityType as AuditLog['entityType'] | undefined,
      entityId
    );

    const filePath = path.join(this.exportDir, filename || `audit_log_${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
    return filePath;
  }

  generateSummaryReport(ownerId: string): {
    overview: {
      totalTransactions: number;
      internalTransfers: number;
      bridgeTransactions: number;
      transactionsWithWarnings: number;
    };
    taxSummary: {
      byCategory: Record<string, number>;
      totalTaxableUsd: number;
    };
    holdings: Record<string, { amount: number; costBasisUsd: number }>;
    issues: Array<{
      type: string;
      severity: 'high' | 'medium' | 'low';
      message: string;
      transactionIds: string[];
    }>;
  } {
    const transactions = this.store.getTransactionsByOwner(ownerId);
    const taxRecords = this.store.getTaxRecordsByOwner(ownerId);

    const overview = {
      totalTransactions: transactions.length,
      internalTransfers: transactions.filter(t => t.isInternal).length,
      bridgeTransactions: transactions.filter(t => t.isBridge).length,
      transactionsWithWarnings: transactions.filter(t => t.warnings.length > 0).length
    };

    const byCategory: Record<string, number> = {};
    let totalTaxableUsd = 0;
    
    for (const record of taxRecords) {
      if (!byCategory[record.category]) {
        byCategory[record.category] = 0;
      }
      byCategory[record.category] += record.amountUsd;
      
      if (record.category === 'income' || record.category === 'capital_gain') {
        totalTaxableUsd += record.amountUsd;
      }
    }

    const holdings: Record<string, { amount: number; costBasisUsd: number }> = {};
    const issues: Array<{
      type: string;
      severity: 'high' | 'medium' | 'low';
      message: string;
      transactionIds: string[];
    }> = [];

    const bridgeDupes = transactions.filter(t => t.warnings.includes('bridge_duplicate'));
    if (bridgeDupes.length > 0) {
      issues.push({
        type: 'bridge_duplicate',
        severity: 'high',
        message: `Found ${bridgeDupes.length} potential bridge duplicate transactions that need review`,
        transactionIds: bridgeDupes.map(t => t.id)
      });
    }

    const priceMissing = transactions.filter(t => !t.priceUsdAtTime && !['USDC', 'USDT'].includes(t.tokenSymbol));
    if (priceMissing.length > 0) {
      issues.push({
        type: 'price_missing',
        severity: 'high',
        message: `Found ${priceMissing.length} transactions missing USD price data`,
        transactionIds: priceMissing.map(t => t.id)
      });
    }

    const unknownAddr = transactions.filter(t => t.warnings.includes('address_unknown'));
    if (unknownAddr.length > 0) {
      issues.push({
        type: 'unknown_address',
        severity: 'medium',
        message: `Found ${unknownAddr.length} transactions involving unknown addresses`,
        transactionIds: unknownAddr.map(t => t.id)
      });
    }

    return {
      overview,
      taxSummary: { byCategory, totalTaxableUsd },
      holdings,
      issues
    };
  }
}
