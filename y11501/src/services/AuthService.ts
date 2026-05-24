import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { UserRole } from '../types';
import { AppDataSource } from '../config/database';
import { createHash, randomBytes } from 'crypto';

export class AuthService {
  private userRepository: Repository<User>;
  private static currentUser: User | null = null;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  private hashPassword(password: string, salt: string): string {
    return createHash('sha256')
      .update(password + salt)
      .digest('hex');
  }

  private generateSalt(): string {
    return randomBytes(16).toString('hex');
  }

  async createUser(username: string, password: string, role: UserRole, fullName?: string): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: { username } });
    if (existingUser) {
      throw new Error(`用户 ${username} 已存在`);
    }

    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(password, salt);

    const user = this.userRepository.create({
      username,
      passwordHash: `${salt}:${passwordHash}`,
      role,
      fullName: fullName || username,
      isActive: true
    });

    return await this.userRepository.save(user);
  }

  async authenticate(username: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { username, isActive: true } });
    if (!user) {
      return null;
    }

    const [salt, storedHash] = user.passwordHash.split(':');
    const computedHash = this.hashPassword(password, salt);

    if (computedHash !== storedHash) {
      return null;
    }

    AuthService.currentUser = user;
    return user;
  }

  async getCurrentUser(): Promise<User | null> {
    return AuthService.currentUser;
  }

  setCurrentUser(user: User | null): void {
    AuthService.currentUser = user;
  }

  async requireRole(requiredRoles: UserRole[]): Promise<User> {
    const user = AuthService.currentUser;
    if (!user) {
      throw new Error('请先登录');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new Error(`权限不足，需要角色: ${requiredRoles.join(' 或 ')}`);
    }

    return user;
  }

  async listUsers(): Promise<User[]> {
    return await this.userRepository.find({
      select: ['id', 'username', 'fullName', 'role', 'isActive', 'createdAt']
    });
  }

  async initDefaultUsers(): Promise<void> {
    const count = await this.userRepository.count();
    if (count > 0) {
      return;
    }

    await this.createUser('admin', 'admin123', UserRole.SUPERVISOR, '系统管理员');
    await this.createUser('reviewer', 'review123', UserRole.REVIEW, '复核员张三');
    await this.createUser('operator', 'operate123', UserRole.ENTRY, '录入员李四');
    await this.createUser('viewer', 'view123', UserRole.READONLY, '查看员王五');
  }

  async changePassword(username: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      return false;
    }

    const [salt, storedHash] = user.passwordHash.split(':');
    const computedHash = this.hashPassword(oldPassword, salt);

    if (computedHash !== storedHash) {
      return false;
    }

    const newSalt = this.generateSalt();
    user.passwordHash = `${newSalt}:${this.hashPassword(newPassword, newSalt)}`;
    await this.userRepository.save(user);

    return true;
  }
}
