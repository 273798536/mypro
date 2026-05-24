export const config = {
  port: 3000,
  jwtSecret: 'your-secret-key-change-in-production',
  jwtExpiresIn: '24h',
  database: {
    path: './data/ledger.db'
  },
  uploads: {
    path: './uploads',
    maxSize: 10 * 1024 * 1024
  },
  asyncTask: {
    maxRetries: 3,
    retryDelay: 5000,
    cronSchedule: '*/5 * * * *'
  }
} as const;

export type Config = typeof config;
