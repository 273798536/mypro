import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { run, get, all } from '../db/database';
import { User, UserRole } from '../types';

export async function getUserByUsername(username: string): Promise<User | null> {
  return get<User>('SELECT * FROM users WHERE username = ?', [username]);
}

export async function createUser(username: string, role: UserRole): Promise<User> {
  const id = uuidv4();
  const now = dayjs().toISOString();
  
  await run(
    'INSERT INTO users (id, username, role, created_at) VALUES (?, ?, ?, ?)',
    [id, username, role, now]
  );
  
  return { id, username, role, created_at: now };
}

export async function listUsers(): Promise<User[]> {
  return all<User>('SELECT * FROM users ORDER BY created_at DESC');
}

export async function getCurrentUser(): Promise<User> {
  const username = process.env.AD_INSPECT_USER || 'admin';
  const user = await getUserByUsername(username);
  if (!user) {
    throw new Error(`用户不存在: ${username}`);
  }
  return user;
}
