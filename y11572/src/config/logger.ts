import winston from 'winston';
import { config } from './index';

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

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'compensation-queue-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: `logs/error.log`,
      level: 'error',
    }),
    new winston.transports.File({
      filename: `logs/${config.logging.file}`,
    }),
  ],
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
