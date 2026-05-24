export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'warehouse_retry',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '5', 10),
    delayMinutes: parseInt(process.env.RETRY_DELAY_MINUTES || '5', 10),
    backoffMultiplier: parseInt(process.env.RETRY_BACKOFF_MULTIPLIER || '2', 10),
  },
  
  queue: {
    workerIntervalSeconds: parseInt(process.env.QUEUE_WORKER_INTERVAL_SECONDS || '30', 10),
  },
  
  logLevel: process.env.LOG_LEVEL || 'info',
};
