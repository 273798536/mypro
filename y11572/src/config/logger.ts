import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { config } from './index';

const ensureLogDir = (): void => {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch {
    // 如果目录创建失败（如只读环境），只使用 console 输出
  }
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  })
);

const createTransports = (): winston.transport[] => {
  ensureLogDir();

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ];

  try {
    transports.push(
      new winston.transports.File({
        filename: `logs/error.log`,
        level: 'error',
      })
    );
    transports.push(
      new winston.transports.File({
        filename: `logs/${config.logging.file}`,
      })
    );
  } catch {
    // 文件日志不可用时只保留 console
  }

  return transports;
};

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'compensation-queue-api' },
  transports: createTransports(),
});

export const createAuditLogger = (operatorId: string, operatorName: string) => {
  return logger.child({
    operatorId,
    operatorName,
    audit: true,
  });
};

export const createContextLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};

export default logger;
