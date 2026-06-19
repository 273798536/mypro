/**
 * local server entry file, for local development
 */
import app from './app.js';
import { seedDatabase } from './mock/seedData.js';
import { getDb } from './db/index.js';

/**
 * Initialize database and seed data
 */
function initializeDatabase() {
  try {
    getDb();
    console.log('Database initialized successfully');
    seedDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

initializeDatabase();

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server ready on port ${PORT}`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;