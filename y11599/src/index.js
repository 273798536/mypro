const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');
const { checkAndCreateIdempotent, markIdempotentFailed } = require('./middlewares/idempotent');
const { AsyncTask } = require('./models');
const taskService = require('./services/taskService');

const changeOrdersRoutes = require('./routes/changeOrders');
const referenceRecordsRoutes = require('./routes/referenceRecords');
const tasksRoutes = require('./routes/tasks');
const exportRoutes = require('./routes/export');
const auditRoutes = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || require('uuid').v4();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

app.use(checkAndCreateIdempotent);

app.use('/api/change-orders', changeOrdersRoutes);
app.use('/api/reference-records', referenceRecordsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  markIdempotentFailed(req, error).catch(e => console.error('Mark idempotent failed:', e));
  
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

async function recoverPendingTasks() {
  try {
    const pendingTasks = await AsyncTask.findAll({
      where: {
        status: ['PENDING', 'PROCESSING']
      }
    });

    if (pendingTasks.length === 0) {
      console.log('No pending tasks to recover.');
      return;
    }

    console.log(`Recovering ${pendingTasks.length} pending tasks...`);

    for (const task of pendingTasks) {
      if (task.status === 'PROCESSING') {
        console.log(`Task ${task.taskId} was in PROCESSING state, resetting to PENDING...`);
        await task.update({ status: 'PENDING' });
      }

      setImmediate(async () => {
        try {
          console.log(`Starting recovered task: ${task.taskId} (${task.taskType})`);
          await taskService.processTask(task.taskId);
          console.log(`Recovered task completed: ${task.taskId}`);
        } catch (error) {
          console.error(`Recovered task failed: ${task.taskId}`, error.message);
        }
      });
    }

    console.log(`${pendingTasks.length} tasks scheduled for recovery.`);
  } catch (error) {
    console.error('Failed to recover pending tasks:', error);
  }
}

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    await sequelize.sync({ alter: false });
    console.log('Database synchronized.');

    await recoverPendingTasks();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();
