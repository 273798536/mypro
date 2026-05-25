import { Router, Request, Response } from 'express';
import Joi from 'joi';
import dataStore from '../database/store';
import { generateToken } from '../middleware/auth';
import { UserRole } from '../types';
import logger from '../utils/logger';
import { verifyPassword } from '../utils/password';

const router = Router();

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const user = dataStore.getUserByUsername(value.username);
    if (!user) {
      logger.warn(`登录失败: 用户不存在 ${value.username}`);
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    const passwordValid = await verifyPassword(value.password, user.passwordHash);
    if (!passwordValid) {
      logger.warn(`登录失败: 密码错误 ${value.username}`);
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    const token = generateToken(user);

    logger.info(`用户登录成功: ${user.name} (${user.role})`);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department
        }
      }
    });
  } catch (err) {
    logger.error('登录异常', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.get('/roles', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      roles: Object.values(UserRole),
      descriptions: {
        [UserRole.DATA_ENTRY]: '录入员 - 可创建、查看报销单，上传材料',
        [UserRole.REVIEWER]: '复核员 - 可审核、重试、请求人工干预',
        [UserRole.SUPERVISOR]: '主管 - 可补偿入账、关闭单据、处理死信、查看报表',
        [UserRole.READ_ONLY]: '只读用户 - 仅可查看基本信息'
      }
    }
  });
});

export default router;
