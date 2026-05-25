import path from 'path';

export const config = {
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
  },
  database: {
    path: process.env.DB_PATH || path.join(process.cwd(), 'data', 'library.db'),
  },
  task: {
    maxRetries: 3,
    retryInterval: 5 * 60 * 1000,
    checkInterval: 30 * 1000,
  },
  upload: {
    dir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    maxSize: 10 * 1024 * 1024,
  },
  export: {
    dir: process.env.EXPORT_DIR || path.join(process.cwd(), 'exports'),
  },
  log: {
    dir: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
    level: process.env.LOG_LEVEL || 'info',
  },
  deduplication: {
    enabled: true,
  },
};
