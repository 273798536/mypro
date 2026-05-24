import * as path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  db: {
    path: process.env.DB_PATH || path.join(process.cwd(), 'data', 'compensation.db')
  },
  retry: {
    maxCount: parseInt(process.env.MAX_RETRY_COUNT || '5', 10),
    intervalMinutes: parseInt(process.env.RETRY_INTERVAL_MINUTES || '30', 10)
  },
  deadLetter: {
    afterHours: parseInt(process.env.DEAD_LETTER_AFTER_HOURS || '24', 10)
  },
  export: {
    frozenMinutes: parseInt(process.env.EXPORT_FROZEN_MINUTES || '60', 10)
  },
  admin: {
    apiKey: process.env.ADMIN_API_KEY || 'admin-key-2024'
  }
};
