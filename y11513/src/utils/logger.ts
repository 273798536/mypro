import winston from 'winston';
import path from 'path';
import { config } from '../config';

const logDir = config.log.dir;

export const logger = winston.createLogger({
  level: config.log.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'library-playback-service' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

export const logOperation = (
  operation: string,
  details: Record<string, any>
) => {
  logger.info(`[OPERATION] ${operation}`, {
    operation,
    ...details,
    timestamp: Date.now(),
  });
};

export const logError = (
  operation: string,
  error: Error,
  details: Record<string, any> = {}
) => {
  logger.error(`[ERROR] ${operation}`, {
    operation,
    error: error.message,
    stack: error.stack,
    ...details,
    timestamp: Date.now(),
  });
};
