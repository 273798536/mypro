import * as express from 'express';
import * as path from 'path';
import reconciliationRoutes from './routes/reconciliation';
import { errorHandler, notFoundHandler, requestLogger, validateOperator } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(validateOperator);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '外协加工对账异常回执状态机 API 运行正常',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/v1', reconciliationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`服务器启动成功，监听端口: ${PORT}`);
  logger.info(`API 文档: http://localhost:${PORT}/health`);
});

export default app;
