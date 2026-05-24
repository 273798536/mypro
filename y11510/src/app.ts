import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import exceptionRoutes from './routes/exception';
import reportRoutes from './routes/report';
import logger from './utils/logger';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

app.use('/api/exceptions', exceptionRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'library-interlibrary-loan-exception',
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'Route not found',
  });
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Unhandled error', { error: err, stack: err.stack });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
);

export default app;
