module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'water-repair-queue-secret-key-2024',
  jwtExpiresIn: '24h',
  database: {
    path: './data/repair_queue.db'
  },
  queue: {
    maxRetries: 5,
    retryDelay: 60000,
    deadLetterAfterRetries: true
  },
  roles: {
    DATA_ENTRY: 'data_entry',
    REVIEWER: 'reviewer',
    SUPERVISOR: 'supervisor',
    READ_ONLY: 'read_only'
  }
};
