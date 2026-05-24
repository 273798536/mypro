import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import {
  DataStore,
  Contract,
  PaymentNode,
  AcceptanceRecord,
  RefundRecord,
  ImportBatch,
  StatusChangeLog,
  CheckResult,
  FixAction,
  BaseEntity,
} from '../types';

const STORE_FILENAME = 'contract-data.json';

export class DataStoreManager {
  private storePath: string;
  private cache: DataStore | null = null;

  constructor(workspace: string) {
    this.storePath = path.join(workspace, STORE_FILENAME);
  }

  async init(): Promise<void> {
    await fs.ensureDir(path.dirname(this.storePath));
    if (!await fs.pathExists(this.storePath)) {
      const emptyStore: DataStore = {
        contracts: [],
        paymentNodes: [],
        acceptanceRecords: [],
        refundRecords: [],
        importBatches: [],
        statusChangeLogs: [],
        checkResults: [],
        fixActions: [],
      };
      await this.save(emptyStore);
    }
  }

  async load(): Promise<DataStore> {
    if (this.cache) {
      return this.cache;
    }
    const exists = await fs.pathExists(this.storePath);
    if (!exists) {
      await this.init();
    }
    this.cache = await fs.readJson(this.storePath);
    return this.cache!;
  }

  async save(store: DataStore): Promise<void> {
    this.cache = store;
    await fs.writeJson(this.storePath, store, { spaces: 2 });
  }

  createBaseEntity(createdBy: string): Omit<BaseEntity, 'id'> {
    const now = dayjs().toISOString();
    return {
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy,
      version: 1,
      isDeleted: false,
    };
  }

  async addContract(contract: Omit<Contract, keyof BaseEntity>, user: string): Promise<Contract> {
    const store = await this.load();
    const newContract: Contract = {
      ...contract,
      id: uuidv4(),
      ...this.createBaseEntity(user),
    };
    store.contracts.push(newContract);
    await this.save(store);
    return newContract;
  }

  async updateContract(
    contractNo: string,
    updates: Partial<Contract>,
    user: string,
    reason: string
  ): Promise<Contract | null> {
    const store = await this.load();
    const index = store.contracts.findIndex(c => c.contractNo === contractNo && !c.isDeleted);
    if (index === -1) return null;

    const oldContract = store.contracts[index];
    const logs: StatusChangeLog[] = [];

    for (const [key, newValue] of Object.entries(updates)) {
      const oldValue = (oldContract as any)[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        logs.push({
          id: uuidv4(),
          entityId: oldContract.id,
          entityType: 'Contract',
          field: key,
          oldValue,
          newValue,
          changedAt: dayjs().toISOString(),
          changedBy: user,
          reason,
        });
      }
    }

    const updatedContract: Contract = {
      ...oldContract,
      ...updates,
      updatedAt: dayjs().toISOString(),
      updatedBy: user,
      version: oldContract.version + 1,
    };

    store.contracts[index] = updatedContract;
    store.statusChangeLogs.push(...logs);
    await this.save(store);

    return updatedContract;
  }

  async addPaymentNode(node: Omit<PaymentNode, keyof BaseEntity>, user: string): Promise<PaymentNode> {
    const store = await this.load();
    const newNode: PaymentNode = {
      ...node,
      id: uuidv4(),
      ...this.createBaseEntity(user),
    };
    store.paymentNodes.push(newNode);
    await this.save(store);
    return newNode;
  }

  async addAcceptanceRecord(record: Omit<AcceptanceRecord, keyof BaseEntity>, user: string): Promise<AcceptanceRecord> {
    const store = await this.load();
    const newRecord: AcceptanceRecord = {
      ...record,
      id: uuidv4(),
      ...this.createBaseEntity(user),
    };
    store.acceptanceRecords.push(newRecord);
    await this.save(store);
    return newRecord;
  }

  async addRefundRecord(record: Omit<RefundRecord, keyof BaseEntity>, user: string): Promise<RefundRecord> {
    const store = await this.load();
    const newRecord: RefundRecord = {
      ...record,
      id: uuidv4(),
      ...this.createBaseEntity(user),
    };
    store.refundRecords.push(newRecord);
    await this.save(store);
    return newRecord;
  }

  async addImportBatch(batch: Omit<ImportBatch, 'id'>): Promise<ImportBatch> {
    const store = await this.load();
    const newBatch: ImportBatch = {
      ...batch,
      id: uuidv4(),
    };
    store.importBatches.push(newBatch);
    await this.save(store);
    return newBatch;
  }

  async updateImportBatch(id: string, updates: Partial<ImportBatch>): Promise<ImportBatch | null> {
    const store = await this.load();
    const index = store.importBatches.findIndex(b => b.id === id);
    if (index === -1) return null;

    store.importBatches[index] = { ...store.importBatches[index], ...updates };
    await this.save(store);
    return store.importBatches[index];
  }

  async addCheckResult(result: Omit<CheckResult, 'id'>): Promise<CheckResult> {
    const store = await this.load();
    const newResult: CheckResult = {
      ...result,
      id: uuidv4(),
    };
    store.checkResults.push(newResult);
    await this.save(store);
    return newResult;
  }

  async addFixAction(action: Omit<FixAction, 'id'>): Promise<FixAction> {
    const store = await this.load();
    const newAction: FixAction = {
      ...action,
      id: uuidv4(),
    };
    store.fixActions.push(newAction);
    await this.save(store);
    return newAction;
  }

  async getContractByNo(contractNo: string): Promise<Contract | null> {
    const store = await this.load();
    return store.contracts.find(c => c.contractNo === contractNo && !c.isDeleted) || null;
  }

  async getContracts(): Promise<Contract[]> {
    const store = await this.load();
    return store.contracts.filter(c => !c.isDeleted);
  }

  async getPaymentNodesByContract(contractNo: string): Promise<PaymentNode[]> {
    const store = await this.load();
    return store.paymentNodes.filter(n => n.contractNo === contractNo && !n.isDeleted);
  }

  async getAcceptanceRecordsByContract(contractNo: string): Promise<AcceptanceRecord[]> {
    const store = await this.load();
    return store.acceptanceRecords.filter(r => r.contractNo === contractNo && !r.isDeleted);
  }

  async getRefundRecordsByContract(contractNo: string): Promise<RefundRecord[]> {
    const store = await this.load();
    return store.refundRecords.filter(r => r.contractNo === contractNo && !r.isDeleted);
  }

  async getChangeLogs(entityId?: string): Promise<StatusChangeLog[]> {
    const store = await this.load();
    if (entityId) {
      return store.statusChangeLogs.filter(l => l.entityId === entityId);
    }
    return store.statusChangeLogs;
  }

  async getImportBatches(): Promise<ImportBatch[]> {
    const store = await this.load();
    return store.importBatches;
  }

  async getCheckResults(batchId?: string): Promise<CheckResult[]> {
    const store = await this.load();
    if (batchId) {
      return store.checkResults.filter(r => r.batchId === batchId);
    }
    return store.checkResults;
  }

  async getFailedBatches(): Promise<ImportBatch[]> {
    const store = await this.load();
    return store.importBatches.filter(b => 
      b.status === 'failed_retry' || b.status === 'failed_manual' || b.status === 'failed_permanent'
    );
  }

  async archiveContract(contractNo: string, user: string, reason: string): Promise<Contract | null> {
    const store = await this.load();
    const index = store.contracts.findIndex(c => c.contractNo === contractNo && !c.isDeleted);
    if (index === -1) return null;

    const contract = store.contracts[index];
    const updated = await this.updateContract(
      contractNo,
      { 
        status: 'archived',
        archivedVersion: contract.version
      },
      user,
      reason
    );
    return updated;
  }
}
