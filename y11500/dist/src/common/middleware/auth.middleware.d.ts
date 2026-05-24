import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
export declare class AuthMiddleware implements NestMiddleware {
    private userRepository;
    constructor(userRepository: Repository<User>);
    use(req: Request, res: Response, next: NextFunction): Promise<void>;
}
