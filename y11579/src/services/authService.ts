import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Role } from '../types';
import { UserRepository } from '../db/repositories';
import { config } from '../config';

export interface AuthPayload {
  userId: string;
  username: string;
  role: Role;
  name: string;
}

export class AuthService {
  static async register(
    username: string,
    password: string,
    role: Role,
    name: string,
    department: string,
    phone: string
  ): Promise<User> {
    const existing = await UserRepository.findByUsername(username);
    if (existing) {
      throw new Error('用户名已存在');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return UserRepository.create({
      username,
      passwordHash,
      role,
      name,
      department,
      phone,
      isActive: true
    });
  }

  static async login(username: string, password: string): Promise<{ token: string; user: AuthPayload }> {
    const user = await UserRepository.findByUsername(username);
    if (!user || !user.isActive) {
      throw new Error('用户名或密码错误');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('用户名或密码错误');
    }

    const payload: AuthPayload = {
      userId: user.id,
      username: user.username,
      role: user.role as Role,
      name: user.name
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });

    return { token, user: payload };
  }

  static verifyToken(token: string): AuthPayload {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
      return payload;
    } catch (error) {
      throw new Error('无效的token');
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    return UserRepository.findById(userId);
  }

  static hasPermission(userRole: Role, requiredRoles: Role[]): boolean {
    return requiredRoles.includes(userRole);
  }
}
