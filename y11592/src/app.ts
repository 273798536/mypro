import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.debug('请求:', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.headers['x-user-id'],
  });
  next();
});

app.use('/api/v1', routes);

app.use(errorHandler);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '路由不存在',
  });
});

export default app;
