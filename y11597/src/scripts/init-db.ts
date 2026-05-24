import 'reflect-metadata';
import dotenv from 'dotenv';
import { AppDataSource } from '../config/database';
import { AuthService } from '../services/authService';
import { UserRole } from '../types/enums';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function initDatabase() {
  const dbDir = path.dirname(process.env.DB_PATH || './data/kb-compensation.db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  await AppDataSource.initialize();
  console.log('数据库初始化完成');

  const authService = new AuthService();
  const userRepository = AppDataSource.getRepository('User');

  const existingUsers = await userRepository.find();
  if (existingUsers.length > 0) {
    console.log('用户已存在，跳过创建');
  } else {
    const users = [
      { username: 'admin', password: 'admin123', role: UserRole.SUPERVISOR, displayName: '系统管理员' },
      { username: 'reviewer', password: 'reviewer123', role: UserRole.REVIEWER, displayName: '复核员张三' },
      { username: 'entry', password: 'entry123', role: UserRole.DATA_ENTRY, displayName: '录入员李四' },
      { username: 'viewer', password: 'viewer123', role: UserRole.READ_ONLY, displayName: '只读用户王五' }
    ];

    for (const user of users) {
      await authService.createUser(user.username, user.password, user.role, user.displayName);
      console.log(`创建用户: ${user.username} (${user.role})`);
    }
  }

  await AppDataSource.destroy();
  console.log('初始化完成！');
}

initDatabase().catch(console.error);
