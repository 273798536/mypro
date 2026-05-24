import { v4 as uuidv4 } from 'uuid';
import {
  Reimbursement,
  User,
  RetryQueueItem,
  DeadLetterItem,
  StatusLog,
  Material,
  ReimbursementStatus,
  UserRole,
  MaterialSource,
  RetryCategory,
  FailureReason
} from '../types';
import logger from '../utils/logger';

class DataStore {
  private reimbursements: Map<string, Reimbursement> = new Map();
  private users: Map<string, User> = new Map();
  private retryQueue: Map<string, RetryQueueItem> = new Map();
  private deadLetters: Map<string, DeadLetterItem> = new Map();

  constructor() {
    this.initializeTestUsers();
  }

  private initializeTestUsers() {
    const testUsers: User[] = [
      {
        id: uuidv4(),
        username: 'entry_clerk',
        name: '张三',
        role: UserRole.DATA_ENTRY,
        passwordHash: '$2a$10$examplehash1',
        department: '财务部',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        username: 'reviewer_wang',
        name: '王丽',
        role: UserRole.REVIEWER,
        passwordHash: '$2a$10$examplehash2',
        department: '财务部',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        username: 'supervisor_li',
        name: '李总监',
        role: UserRole.SUPERVISOR,
        passwordHash: '$2a$10$examplehash3',
        department: '财务部',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        username: 'viewer_zhao',
        name: '赵查看',
        role: UserRole.READ_ONLY,
        passwordHash: '$2a$10$examplehash4',
        department: '审计部',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    testUsers.forEach(user => this.users.set(user.id, user));
    logger.info('Test users initialized');
  }

  createReimbursement(data: Omit<Reimbursement, 'id' | 'createdAt' | 'updatedAt' | 'statusLogs' | 'materials' | 'isInSummary'>): Reimbursement {
    const id = uuidv4();
    const now = new Date().toISOString();
    const reimbursement: Reimbursement = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      statusLogs: [],
      materials: [],
      isInSummary: false
    };
    this.reimbursements.set(id, reimbursement);
    logger.info(`Reimbursement created: ${id}`);
    return reimbursement;
  }

  getReimbursement(id: string): Reimbursement | undefined {
    return this.reimbursements.get(id);
  }

  updateReimbursement(id: string, updates: Partial<Reimbursement>): Reimbursement | undefined {
    const existing = this.reimbursements.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.reimbursements.set(id, updated);
    logger.info(`Reimbursement updated: ${id}`);
    return updated;
  }

  listReimbursements(filters?: { status?: ReimbursementStatus; department?: string }): Reimbursement[] {
    let results = Array.from(this.reimbursements.values());
    
    if (filters?.status) {
      results = results.filter(r => r.status === filters.status);
    }
    if (filters?.department) {
      results = results.filter(r => r.department === filters.department);
    }
    
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addStatusLog(reimbursementId: string, log: Omit<StatusLog, 'id' | 'timestamp'>): StatusLog | undefined {
    const reimbursement = this.reimbursements.get(reimbursementId);
    if (!reimbursement) return undefined;

    const statusLog: StatusLog = {
      ...log,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };

    reimbursement.statusLogs.push(statusLog);
    reimbursement.updatedAt = statusLog.timestamp;
    this.reimbursements.set(reimbursementId, reimbursement);
    
    logger.info(`Status log added for ${reimbursementId}: ${log.fromStatus} -> ${log.toStatus}`);
    return statusLog;
  }

  addMaterial(reimbursementId: string, material: Omit<Material, 'id' | 'uploadedAt'>): Material | undefined {
    const reimbursement = this.reimbursements.get(reimbursementId);
    if (!reimbursement) return undefined;

    const newMaterial: Material = {
      ...material,
      id: uuidv4(),
      uploadedAt: new Date().toISOString()
    };

    reimbursement.materials.push(newMaterial);
    reimbursement.updatedAt = newMaterial.uploadedAt;
    this.reimbursements.set(reimbursementId, reimbursement);
    
    logger.info(`Material added for ${reimbursementId}: ${material.source}`);
    return newMaterial;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  listUsers(): User[] {
    return Array.from(this.users.values());
  }

  enqueueRetry(item: Omit<RetryQueueItem, 'id' | 'createdAt' | 'retryCount' | 'status'>): RetryQueueItem {
    const queueItem: RetryQueueItem = {
      ...item,
      id: uuidv4(),
      retryCount: 0,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.retryQueue.set(queueItem.id, queueItem);
    logger.info(`Retry queued: ${queueItem.id} for reimbursement ${item.reimbursementId}`);
    return queueItem;
  }

  getPendingRetries(): RetryQueueItem[] {
    const now = new Date().toISOString();
    return Array.from(this.retryQueue.values())
      .filter(item => item.status === 'pending' && item.nextRetryAt <= now)
      .sort((a, b) => new Date(a.nextRetryAt).getTime() - new Date(b.nextRetryAt).getTime());
  }

  updateRetryQueue(id: string, updates: Partial<RetryQueueItem>): RetryQueueItem | undefined {
    const existing = this.retryQueue.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.retryQueue.set(id, updated);
    return updated;
  }

  moveToDeadLetter(
    reimbursementId: string,
    failureReason: FailureReason,
    failureDetails: string,
    retryHistory: RetryQueueItem[]
  ): DeadLetterItem {
    const reimbursement = this.reimbursements.get(reimbursementId);
    const deadLetterItem: DeadLetterItem = {
      id: uuidv4(),
      reimbursementId,
      originalStatus: reimbursement?.status || ReimbursementStatus.FAILED,
      failureReason,
      failureDetails,
      retryHistory,
      reportedAt: new Date().toISOString(),
      resolved: false
    };
    
    this.deadLetters.set(deadLetterItem.id, deadLetterItem);
    
    if (reimbursement) {
      reimbursement.status = ReimbursementStatus.DEAD_LETTER;
      reimbursement.failureReason = failureReason;
      reimbursement.failureDetails = failureDetails;
      reimbursement.isInSummary = false;
      this.reimbursements.set(reimbursementId, reimbursement);
    }
    
    logger.warn(`Moved to dead letter: ${reimbursementId}, reason: ${failureReason}`);
    return deadLetterItem;
  }

  getDeadLetters(filters?: { resolved?: boolean; failureReason?: FailureReason }): DeadLetterItem[] {
    let results = Array.from(this.deadLetters.values());
    
    if (filters?.resolved !== undefined) {
      results = results.filter(d => d.resolved === filters.resolved);
    }
    if (filters?.failureReason) {
      results = results.filter(d => d.failureReason === filters.failureReason);
    }
    
    return results.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }

  resolveDeadLetter(id: string, resolvedBy: string, resolution: string): DeadLetterItem | undefined {
    const item = this.deadLetters.get(id);
    if (!item) return undefined;

    item.resolved = true;
    item.resolvedBy = resolvedBy;
    item.resolvedAt = new Date().toISOString();
    item.resolution = resolution;
    
    this.deadLetters.set(id, item);
    
    const reimbursement = this.reimbursements.get(item.reimbursementId);
    if (reimbursement) {
      reimbursement.status = ReimbursementStatus.QUEUED;
      reimbursement.isInSummary = true;
      this.reimbursements.set(item.reimbursementId, reimbursement);
    }
    
    logger.info(`Dead letter resolved: ${id}`);
    return item;
  }

  getRetryQueueByReimbursement(reimbursementId: string): RetryQueueItem[] {
    return Array.from(this.retryQueue.values())
      .filter(item => item.reimbursementId === reimbursementId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const dataStore = new DataStore();
export default dataStore;
