import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      throw new UnauthorizedException('缺少用户标识');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在或已禁用');
    }

    req['user'] = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    next();
  }
}
