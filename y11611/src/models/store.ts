import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  WalletAddress, 
  PriceSnapshot, 
  Transaction, 
  AuditLog, 
  TaxRecord, 
  Owner 
} from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

export class DataStore {
  private static instance: DataStore;
  private addresses: Map<string, WalletAddress> = new Map();
  private prices: Map<string, PriceSnapshot> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();
  private taxRecords: Map<string, TaxRecord> = new Map();
  private owners: Map<string, Owner> = new Map();

  private constructor() {
    this.ensureDataDir();
    this.loadAll();
  }

  static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private getFilePath(name: string): string {
    return path.join(DATA_DIR, `${name}.json`);
  }

  private convertDates(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.convertDates(item));
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'timestamp' || key === 'createdAt' || key === 'updatedAt') {
        result[key] = new Date(value as string);
      } else if (typeof value === 'object') {
        result[key] = this.convertDates(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private loadMap<T>(name: string, keyField: keyof T): Map<string, T> {
    const filePath = this.getFilePath(name);
    const map = new Map<string, T>();
    
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        data.forEach((item: T) => {
          const converted = this.convertDates(item);
          const key = String(converted[keyField]);
          map.set(key, converted);
        });
      } catch (e) {
        console.warn(`Failed to load ${name}:`, e);
      }
    }
    return map;
  }

  private saveMap<T>(name: string, map: Map<string, T>): void {
    const filePath = this.getFilePath(name);
    const data = Array.from(map.values());
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  loadAll(): void {
    this.addresses = this.loadMap('addresses', 'id');
    this.prices = this.loadMap('prices', 'id');
    this.transactions = this.loadMap('transactions', 'id');
    this.auditLogs = this.loadMap('auditLogs', 'id');
    this.taxRecords = this.loadMap('taxRecords', 'id');
    this.owners = this.loadMap('owners', 'id');
  }

  saveAll(): void {
    this.saveMap('addresses', this.addresses);
    this.saveMap('prices', this.prices);
    this.saveMap('transactions', this.transactions);
    this.saveMap('auditLogs', this.auditLogs);
    this.saveMap('taxRecords', this.taxRecords);
    this.saveMap('owners', this.owners);
  }

  clearAll(): void {
    this.addresses.clear();
    this.prices.clear();
    this.transactions.clear();
    this.auditLogs.clear();
    this.taxRecords.clear();
    this.owners.clear();
    this.saveAll();
  }

  addAddress(address: Omit<WalletAddress, 'id' | 'createdAt' | 'updatedAt'>): WalletAddress {
    const now = new Date();
    const newAddress: WalletAddress = {
      ...address,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };
    this.addresses.set(newAddress.id, newAddress);
    this.logAudit('address', newAddress.id, 'create', undefined, undefined, undefined, 'create', 'system');
    return newAddress;
  }

  updateAddress(id: string, updates: Partial<WalletAddress>, reason: string, operator: string): WalletAddress | null {
    const address = this.addresses.get(id);
    if (!address) return null;
    
    const updated = { ...address, ...updates, updatedAt: new Date() };
    this.addresses.set(id, updated);
    
    Object.entries(updates).forEach(([field, value]) => {
      this.logAudit('address', id, 'update', field, (address as any)[field], value, reason, operator);
    });
    
    return updated;
  }

  getAddress(id: string): WalletAddress | undefined {
    return this.addresses.get(id);
  }

  getAddressByWallet(wallet: string, chain?: string): WalletAddress | undefined {
    return Array.from(this.addresses.values()).find(
      a => a.address.toLowerCase() === wallet.toLowerCase() && (!chain || a.chain === chain)
    );
  }

  getAddressesByOwner(ownerId: string): WalletAddress[] {
    return Array.from(this.addresses.values()).filter(a => a.ownerId === ownerId);
  }

  getAllAddresses(): WalletAddress[] {
    return Array.from(this.addresses.values());
  }

  addPrice(price: Omit<PriceSnapshot, 'id'>): PriceSnapshot {
    const newPrice: PriceSnapshot = {
      ...price,
      id: uuidv4()
    };
    this.prices.set(newPrice.id, newPrice);
    return newPrice;
  }

  getPrice(symbol: string, timestamp: Date): PriceSnapshot | undefined {
    const targetTime = timestamp.getTime();
    let bestMatch: PriceSnapshot | undefined;
    let bestDiff = Infinity;

    for (const price of this.prices.values()) {
      if (price.symbol === symbol) {
        const diff = Math.abs(price.timestamp.getTime() - targetTime);
        if (diff < bestDiff && diff < 24 * 60 * 60 * 1000) {
          bestDiff = diff;
          bestMatch = price;
        }
      }
    }
    return bestMatch;
  }

  getAllPrices(): PriceSnapshot[] {
    return Array.from(this.prices.values());
  }

  addTransaction(tx: Omit<Transaction, 'id' | 'warnings' | 'relatedTxIds' | 'metadata'> & {
    warnings?: string[];
    relatedTxIds?: string[];
    metadata?: Record<string, any>;
  }): Transaction {
    const newTx: Transaction = {
      ...tx,
      id: uuidv4(),
      warnings: tx.warnings || [],
      relatedTxIds: tx.relatedTxIds || [],
      metadata: tx.metadata || {}
    } as Transaction;
    this.transactions.set(newTx.id, newTx);
    this.logAudit('transaction', newTx.id, 'create', undefined, undefined, undefined, 'import', 'system');
    return newTx;
  }

  updateTransaction(id: string, updates: Partial<Transaction>, reason: string, operator: string): Transaction | null {
    const tx = this.transactions.get(id);
    if (!tx) return null;
    
    const updated = { ...tx, ...updates };
    this.transactions.set(id, updated);
    
    Object.entries(updates).forEach(([field, value]) => {
      this.logAudit('transaction', id, 'update', field, (tx as any)[field], value, reason, operator);
    });
    
    return updated;
  }

  getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  getTransactionByHash(txHash: string): Transaction | undefined {
    return Array.from(this.transactions.values()).find(t => t.txHash === txHash);
  }

  getTransactionsByOwner(ownerId: string): Transaction[] {
    return Array.from(this.transactions.values()).filter(t => t.ownerId === ownerId);
  }

  getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  addTaxRecord(record: Omit<TaxRecord, 'id'>): TaxRecord {
    const newRecord: TaxRecord = {
      ...record,
      id: uuidv4()
    };
    this.taxRecords.set(newRecord.id, newRecord);
    this.logAudit('tax_record', newRecord.id, 'create', undefined, undefined, undefined, 'auto_calculate', 'system');
    return newRecord;
  }

  updateTaxRecord(id: string, updates: Partial<TaxRecord>, reason: string, operator: string): TaxRecord | null {
    const record = this.taxRecords.get(id);
    if (!record) return null;
    
    const updated = { ...record, ...updates };
    this.taxRecords.set(id, updated);
    
    Object.entries(updates).forEach(([field, value]) => {
      this.logAudit('tax_record', id, 'update', field, (record as any)[field], value, reason, operator);
    });
    
    return updated;
  }

  getTaxRecordsByOwner(ownerId: string, year?: number): TaxRecord[] {
    let records = Array.from(this.taxRecords.values()).filter(r => r.ownerId === ownerId);
    if (year) {
      records = records.filter(r => r.taxYear === year);
    }
    return records;
  }

  getAllTaxRecords(): TaxRecord[] {
    return Array.from(this.taxRecords.values());
  }

  addOwner(owner: Omit<Owner, 'id' | 'createdAt' | 'addresses'> & { addresses?: string[] }): Owner {
    const newOwner: Owner = {
      ...owner,
      id: uuidv4(),
      addresses: owner.addresses || [],
      createdAt: new Date()
    };
    this.owners.set(newOwner.id, newOwner);
    return newOwner;
  }

  getOwner(id: string): Owner | undefined {
    return this.owners.get(id);
  }

  getAllOwners(): Owner[] {
    return Array.from(this.owners.values());
  }

  private logAudit(
    entityType: AuditLog['entityType'],
    entityId: string,
    action: AuditLog['action'],
    field: string | undefined,
    oldValue: any,
    newValue: any,
    reason: string,
    operator: string
  ): void {
    const log: AuditLog = {
      id: uuidv4(),
      entityType,
      entityId,
      action,
      field,
      oldValue,
      newValue,
      reason,
      operator,
      timestamp: new Date()
    };
    this.auditLogs.set(log.id, log);
  }

  getAuditLogs(entityType?: AuditLog['entityType'], entityId?: string): AuditLog[] {
    let logs = Array.from(this.auditLogs.values());
    if (entityType) {
      logs = logs.filter(l => l.entityType === entityType);
    }
    if (entityId) {
      logs = logs.filter(l => l.entityId === entityId);
    }
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
