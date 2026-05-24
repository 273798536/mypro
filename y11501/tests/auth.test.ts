import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { AuthService } from '../src/services/AuthService';
import { initializeDatabase } from '../src/config/database';
import { UserRole } from '../src/types';
import { canPerformAction } from '../src/config/permissions';

const TEST_DB_DIR = path.join(os.tmpdir(), 'spi-cli-test-auth');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test.db');

describe('AuthService', () => {
  let dataSource: DataSource;
  let authService: AuthService;

  beforeAll(async () => {
    if (!fs.existsSync(TEST_DB_DIR)) {
      fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    }
    dataSource = await initializeDatabase(true);
    authService = new AuthService();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(async () => {
    authService.setCurrentUser(null);
  });

  describe('用户初始化', () => {
    it('应创建默认用户', async () => {
      await authService.initDefaultUsers();
      const users = await authService.listUsers();

      expect(users.length).toBe(4);
      expect(users.find(u => u.username === 'admin')).toBeDefined();
      expect(users.find(u => u.username === 'reviewer')).toBeDefined();
      expect(users.find(u => u.username === 'operator')).toBeDefined();
      expect(users.find(u => u.username === 'viewer')).toBeDefined();
    });

    it('默认用户应具有正确的角色', async () => {
      await authService.initDefaultUsers();
      const users = await authService.listUsers();

      expect(users.find(u => u.username === 'admin')?.role).toBe(UserRole.SUPERVISOR);
      expect(users.find(u => u.username === 'reviewer')?.role).toBe(UserRole.REVIEW);
      expect(users.find(u => u.username === 'operator')?.role).toBe(UserRole.ENTRY);
      expect(users.find(u => u.username === 'viewer')?.role).toBe(UserRole.READONLY);
    });
  });

  describe('认证测试', () => {
    it('正确的用户名密码应认证成功', async () => {
      await authService.initDefaultUsers();
      const user = await authService.authenticate('admin', 'admin123');

      expect(user).not.toBeNull();
      expect(user!.username).toBe('admin');
    });

    it('错误的密码应认证失败', async () => {
      await authService.initDefaultUsers();
      const user = await authService.authenticate('admin', 'wrongpassword');

      expect(user).toBeNull();
    });

    it('不存在的用户应认证失败', async () => {
      await authService.initDefaultUsers();
      const user = await authService.authenticate('nonexistent', 'password');

      expect(user).toBeNull();
    });

    it('认证成功后应设置当前用户', async () => {
      await authService.initDefaultUsers();
      await authService.authenticate('admin', 'admin123');
      const currentUser = await authService.getCurrentUser();

      expect(currentUser).not.toBeNull();
      expect(currentUser!.username).toBe('admin');
    });
  });

  describe('权限测试', () => {
    it('主管应具有所有权限', async () => {
      expect(canPerformAction(UserRole.SUPERVISOR, 'init')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'import')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'check')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'fix')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'report')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'export')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'history')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'create_user')).toBe(true);
    });

    it('录入员应有部分权限', async () => {
      expect(canPerformAction(UserRole.ENTRY, 'init')).toBe(false);
      expect(canPerformAction(UserRole.ENTRY, 'import')).toBe(true);
      expect(canPerformAction(UserRole.ENTRY, 'check')).toBe(true);
      expect(canPerformAction(UserRole.ENTRY, 'fix')).toBe(true);
      expect(canPerformAction(UserRole.ENTRY, 'report')).toBe(false);
      expect(canPerformAction(UserRole.ENTRY, 'export')).toBe(true);
      expect(canPerformAction(UserRole.ENTRY, 'create_user')).toBe(false);
    });

    it('只读用户只有查看权限', async () => {
      expect(canPerformAction(UserRole.READONLY, 'init')).toBe(false);
      expect(canPerformAction(UserRole.READONLY, 'import')).toBe(false);
      expect(canPerformAction(UserRole.READONLY, 'check')).toBe(false);
      expect(canPerformAction(UserRole.READONLY, 'fix')).toBe(false);
      expect(canPerformAction(UserRole.READONLY, 'report')).toBe(true);
      expect(canPerformAction(UserRole.READONLY, 'export')).toBe(true);
      expect(canPerformAction(UserRole.READONLY, 'create_user')).toBe(false);
    });

    it('复核员应有复核权限', async () => {
      expect(canPerformAction(UserRole.REVIEW, 'init')).toBe(false);
      expect(canPerformAction(UserRole.REVIEW, 'import')).toBe(true);
      expect(canPerformAction(UserRole.REVIEW, 'check')).toBe(true);
      expect(canPerformAction(UserRole.REVIEW, 'fix')).toBe(true);
      expect(canPerformAction(UserRole.REVIEW, 'report')).toBe(true);
      expect(canPerformAction(UserRole.REVIEW, 'review')).toBe(true);
      expect(canPerformAction(UserRole.REVIEW, 'create_user')).toBe(false);
    });
  });

  describe('用户管理', () => {
    it('应能创建新用户', async () => {
      await authService.initDefaultUsers();
      const newUser = await authService.createUser(
        'testuser',
        'testpass',
        UserRole.ENTRY,
        '测试用户'
      );

      expect(newUser).toBeDefined();
      expect(newUser.username).toBe('testuser');
      expect(newUser.role).toBe(UserRole.ENTRY);
      expect(newUser.fullName).toBe('测试用户');
    });

    it('创建重复用户名应失败', async () => {
      await authService.initDefaultUsers();

      await expect(
        authService.createUser('admin', 'password', UserRole.ENTRY)
      ).rejects.toThrow();
    });
  });
});
