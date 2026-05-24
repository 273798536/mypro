import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    path: process.env.DB_PATH || './data/library-loan.db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret',
  },
  upload: {
    dir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  },
  export: {
    dir: path.resolve(process.env.EXPORT_DIR || './exports'),
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
  batch: {
    maxSize: parseInt(process.env.MAX_BATCH_SIZE || '1000', 10),
  },
  autoCheck: {
    enabled: process.env.ENABLE_AUTO_CHECK === 'true',
    interval: parseInt(process.env.AUTO_CHECK_INTERVAL || '3600000', 10),
  },
} as const;

export type Config = typeof config;
