import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { DatabaseManager } from './database';
import { User, UserRole, BatchFreeze, OperationLock } from '../models/types';

export class UserDAO {
  private db: DatabaseManager;

  constructor(workDir?: string) {
    this.db = new DatabaseManager(workDir);
  }

  async createUser(username: string, role: UserRole, displayName?: string): Promise<string> {
    const id = uuidv4();
    const now = dayjs().toISOString();
    await this.db.run(
      'INSERT INTO users (id, username, display_name, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, displayName || username, role, 1, now]
    );
    return id;
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const user = await this.db.get<User>(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      return user || null;
    } catch (e) {
      return null;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.db.get<User>(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return user || null;
    } catch (e) {
      return null;
    }
  }

  async findAll(): Promise<User[]> {
    return this.db.all<User>('SELECT * FROM users ORDER BY created_at DESC');
  }

  async updateRole(id: string, role: UserRole): Promise<void> {
    const now = dayjs().toISOString();
    await this.db.run(
      'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
      [role, now, id]
    );
  }

  async deactivate(id: string): Promise<void> {
    const now = dayjs().toISOString();
    await this.db.run(
      'UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?',
      [now, id]
    );
  }

  async activate(id: string): Promise<void> {
    const now = dayjs().toISOString();
    await this.db.run(
      'UPDATE users SET is_active = 1, updated_at = ? WHERE id = ?',
      [now, id]
    );
  }
}

export class BatchFreezeDAO {
  private db: DatabaseManager;

  constructor(workDir?: string) {
    this.db = new DatabaseManager(workDir);
  }

  async freezeBatch(batchId: string, frozenBy: string, reason?: string): Promise<string> {
    const id = uuidv4();
    const now = dayjs().toISOString();
    await this.db.run(
      'INSERT INTO batch_freezes (id, batch_id, frozen_by, frozen_at, reason, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, batchId, frozenBy, now, reason || '', 1]
    );
    return id;
  }

  async unfreezeBatch(batchId: string, unfrozenBy: string): Promise<void> {
    const now = dayjs().toISOString();
    await this.db.run(
      'UPDATE batch_freezes SET is_active = 0, unfrozen_by = ?, unfrozen_at = ? WHERE batch_id = ? AND is_active = 1',
      [unfrozenBy, now, batchId]
    );
  }

  async isBatchFrozen(batchId: string): Promise<boolean> {
    const freeze = await this.db.get<BatchFreeze>(
      'SELECT * FROM batch_freezes WHERE batch_id = ? AND is_active = 1',
      [batchId]
    );
    return !!freeze;
  }

  async findByBatchId(batchId: string): Promise<BatchFreeze[]> {
    return this.db.all<BatchFreeze>(
      'SELECT * FROM batch_freezes WHERE batch_id = ? ORDER BY frozen_at DESC',
      [batchId]
    );
  }

  async findActiveFreezes(): Promise<BatchFreeze[]> {
    return this.db.all<BatchFreeze>(
      'SELECT * FROM batch_freezes WHERE is_active = 1 ORDER BY frozen_at DESC'
    );
  }
}

export class OperationLockDAO {
  private db: DatabaseManager;

  constructor(workDir?: string) {
    this.db = new DatabaseManager(workDir);
  }

  async acquireLock(
    resourceType: string,
    resourceId: string,
    lockedBy: string,
    operation: string,
    ttlSeconds: number = 300
  ): Promise<string | null> {
    const now = dayjs();
    const expiresAt = now.add(ttlSeconds, 'second').toISOString();
    const nowStr = now.toISOString();

    await this.db.run(
      'DELETE FROM operation_locks WHERE resource_type = ? AND resource_id = ? AND expires_at < ?',
      [resourceType, resourceId, nowStr]
    );

    const existing = await this.db.get<OperationLock>(
      'SELECT * FROM operation_locks WHERE resource_type = ? AND resource_id = ?',
      [resourceType, resourceId]
    );

    if (existing) {
      return null;
    }

    const id = uuidv4();
    await this.db.run(
      'INSERT INTO operation_locks (id, resource_type, resource_id, locked_by, locked_at, expires_at, operation) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, resourceType, resourceId, lockedBy, nowStr, expiresAt, operation]
    );
    return id;
  }

  async releaseLock(id: string): Promise<void> {
    await this.db.run('DELETE FROM operation_locks WHERE id = ?', [id]);
  }

  async releaseResourceLock(resourceType: string, resourceId: string): Promise<void> {
    await this.db.run(
      'DELETE FROM operation_locks WHERE resource_type = ? AND resource_id = ?',
      [resourceType, resourceId]
    );
  }

  async isLocked(resourceType: string, resourceId: string): Promise<boolean> {
    const now = dayjs().toISOString();
    const lock = await this.db.get<OperationLock>(
      'SELECT * FROM operation_locks WHERE resource_type = ? AND resource_id = ? AND expires_at > ?',
      [resourceType, resourceId, now]
    );
    return !!lock;
  }

  async findAllActive(): Promise<OperationLock[]> {
    const now = dayjs().toISOString();
    return this.db.all<OperationLock>(
      'SELECT * FROM operation_locks WHERE expires_at > ? ORDER BY locked_at DESC',
      [now]
    );
  }

  async cleanupExpired(): Promise<number> {
    const now = dayjs().toISOString();
    const result = await this.db.run(
      'DELETE FROM operation_locks WHERE expires_at < ?',
      [now]
    );
    return 0;
  }
}
