import { runQuery, runQueryOne, runExecute } from '../database';
import type { User } from '@shared/types';
import { generateId } from '@shared/utils';

const toUser = (row: any): User => ({
  id: row.id,
  name: row.name,
  role: row.role,
  avatar: row.avatar
});

export async function getAllUsers(): Promise<User[]> {
  const rows = await runQuery('SELECT * FROM users ORDER BY name');
  return rows.map(toUser);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const row = await runQueryOne('SELECT * FROM users WHERE id = ?', [id]);
  return row ? toUser(row) : undefined;
}

export async function getOrCreateUser(name: string, role: User['role'] = 'inspector'): Promise<User> {
  let user = await runQueryOne('SELECT * FROM users WHERE name = ?', [name]);
  
  if (!user) {
    const id = generateId();
    await runExecute(
      'INSERT INTO users (id, name, role) VALUES (?, ?, ?)',
      [id, name, role]
    );
    user = await runQueryOne('SELECT * FROM users WHERE id = ?', [id]);
  }
  
  return toUser(user);
}

export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id'>>
): Promise<User | undefined> {
  const existing = await getUserById(id);
  if (!existing) return undefined;
  
  const updates: string[] = [];
  const params: any[] = [];
  
  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
  if (data.role !== undefined) { updates.push('role = ?'); params.push(data.role); }
  if (data.avatar !== undefined) { updates.push('avatar = ?'); params.push(data.avatar); }
  
  params.push(id);
  
  await runExecute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  
  return getUserById(id);
}

export async function getCurrentUser(): Promise<User> {
  return getOrCreateUser('小赵', 'manager');
}
