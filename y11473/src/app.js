const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const sequelize = require('./config/database');
const logger = require('./config/logger');
const TraceService = require('./services/TraceService');
const AsyncTaskService = require('./services/AsyncTaskService');
const ImportService = require('./services/ImportService');
const ExportService = require('./services/ExportService');
const ReconciliationService = require('./services/ReconciliationService');

const dataDir = path.join(__dirname, '../data');
const logsDir = path.join(__dirname, '../logs');
const uploadsDir = path.join(__dirname, '../uploads');
const exportsDir = path.join(__dirname, '../exports');
[dataDir, logsDir, uploadsDir, exportsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    TraceService.recordHttpRequest(
      req.method,
      req.originalUrl,
      req.query,
      req.body,
      res.statusCode,
      typeof data === 'string' ? data.substring(0, 500) : null,
      duration
    ).catch(e => logger.error('记录HTTP轨迹失败', e));
    return originalSend.call(this, data);
  };
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/import', require('./routes/import'));
app.use('/api/return-applications', require('./routes/returnApplication'));
app.use('/api/tasks', require('./routes/task'));
app.use('/api/exceptions', require('./routes/exception'));
app.use('/api/export', require('./routes/export'));
app.use('/api/traces', require('./routes/trace'));
app.use('/api/reconciliation', require('./routes/reconciliation'));

app.use((err, req, res, next) => {
  logger.error('服务器错误:', err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

async function processTaskLoop() {
  while (true) {
    try {
      const task = await AsyncTaskService.getNextTask();
      if (task) {
        logger.info(`开始处理任务: ${task.id} [${task.task_type}] ${task.task_name}`);
        await AsyncTaskService.startTask(task.id);
        
        const inputParams = task.input_params ? JSON.parse(task.input_params) : {};
        
        try {
          let result;
          switch (task.task_type) {
            case 'import_parse':
              result = await ImportService.importFile(inputParams.filePath, inputParams.sourceType, inputParams.options);
              break;
            case 'export':
              if (inputParams.exportAll) {
                result = await ExportService.exportAll(inputParams.filters || {}, exportsDir);
              } else if (inputParams.batchNo) {
                result = await ExportService.exportReconciliationReport(inputParams.batchNo, exportsDir);
              } else {
                result = await ExportService.exportExceptions(inputParams.filters || {}, exportsDir);
              }
              break;
            case 'reconciliation':
              if (inputParams.all) {
                result = await ReconciliationService.reconcileAllBatches();
              } else {
                result = await ReconciliationService.reconcileByBatch(inputParams.batchNo);
              }
              break;
            case 'replay_exception':
              const ExceptionService = require('./services/ExceptionService');
              result = await ExceptionService.replayException(inputParams.exceptionId);
              break;
            default:
              throw new Error(`未知任务类型: ${task.task_type}`);
          }
          await AsyncTaskService.completeTask(task.id, result);
          logger.info(`任务完成: ${task.id}`);
        } catch (taskError) {
          await AsyncTaskService.failTask(task.id, taskError, { retryable: true });
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (e) {
      logger.error('任务处理循环出错:', e);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

async function startServer() {
  try {
    await sequelize.sync({ alter: true });
    logger.info('数据库同步完成');
    
    const interruptedCount = await AsyncTaskService.resumeInterruptedTasks();
    if (interruptedCount > 0) {
      logger.info(`恢复 ${interruptedCount} 个中断的任务`);
    }
    
    processTaskLoop();
    
    app.listen(PORT, async () => {
      logger.info(`服务器启动在端口 ${PORT}`);
      await TraceService.recordServiceStart(PORT);
    });
  } catch (e) {
    logger.error('服务器启动失败:', e);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  await TraceService.recordServiceStop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  await TraceService.recordServiceStop();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
