import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { User, UserRole } from '../../shared/types';

interface DbUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export class UserRepository {
  private mapToUser(dbRecord: DbUser): User {
    return {
      id: dbRecord.id,
      username: dbRecord.username,
      displayName: dbRecord.display_name,
      email: dbRecord.email,
      role: dbRecord.role as UserRole,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }

  async findAll(): Promise<User[]> {
    const records = db.prepare('SELECT * FROM user ORDER BY created_at DESC').all() as DbUser[];
    return records.map((r) => this.mapToUser(r));
  }

  async findById(id: string): Promise<User | null> {
    const record = db.prepare('SELECT * FROM user WHERE id = ?').get(id) as DbUser | undefined;
    return record ? this.mapToUser(record) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const record = db
      .prepare('SELECT * FROM user WHERE username = ?')
      .get(username) as DbUser | undefined;
    return record ? this.mapToUser(record) : null;
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO user (id, username, display_name, email, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.username, data.displayName, data.email, data.role, now, now);

    return this.findById(id) as Promise<User>;
  }

  async updateRole(id: string, role: UserRole): Promise<User | null> {
    db.prepare('UPDATE user SET role = ?, updated_at = ? WHERE id = ?').run(
      role,
      new Date().toISOString(),
      id
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = db.prepare('DELETE FROM user WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

export const userRepository = new UserRepository();
