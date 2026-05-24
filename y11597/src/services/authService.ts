import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserRole } from '../types/enums';
import crypto from 'crypto';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: UserRole;
    displayName: string;
  };
}

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async login(username: string, password: string): Promise<LoginResponse | null> {
    const hashedPassword = this.hashPassword(password);
    
    const user = await this.userRepository.findOne({
      where: { username, password: hashedPassword, isActive: true }
    });

    if (!user) {
      return null;
    }

    const secret = process.env.JWT_SECRET || 'default-secret';
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      secret,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName
      }
    };
  }

  async createUser(username: string, password: string, role: UserRole, displayName: string): Promise<User> {
    const hashedPassword = this.hashPassword(password);
    
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      role,
      displayName
    });

    return await this.userRepository.save(user);
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id: userId } });
  }
}
