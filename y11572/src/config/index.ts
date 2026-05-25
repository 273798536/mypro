import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'compensation_queue',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      min: parseInt(process.env.DB_POOL_MIN || '0', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
    },
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    retryAttempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY || '5000', 10),
    deadlineHours: parseInt(process.env.QUEUE_DEADLINE_HOURS || '24', 10),
    simulateFailure: process.env.QUEUE_SIMULATE_FAILURE === 'true',
    simulateFailureCount: parseInt(process.env.QUEUE_SIMULATE_FAILURE_COUNT || '2', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'app.log',
  },

  export: {
    frozenHours: parseInt(process.env.EXPORT_FROZEN_HOURS || '24', 10),
  },

  sla: {
    defaultHours: parseInt(process.env.SLA_DEFAULT_HOURS || '48', 10),
  },
};

export type Config = typeof config;
