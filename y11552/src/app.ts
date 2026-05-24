import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { Database } from './database/init';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { startQueueProcessor } from './services/QueueProcessor';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use('/api/v1', routes);

app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

Database.getInstance();
startQueueProcessor(30000);

const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.env}`);
  console.log(`Health check: http://localhost:${config.port}/health`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    Database.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    Database.close();
    process.exit(0);
  });
});

export default app;
