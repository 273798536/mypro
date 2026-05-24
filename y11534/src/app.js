const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const createBaseRouter = require('./routes/baseRoute');

const authRoutes = require('./routes/auth');
const auditRoutes = require('./routes/audit');
const managerViewRoutes = require('./routes/managerView');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: '请求过于频繁，请稍后再试' }
});
app.use(limiter);

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/manager', managerViewRoutes);

app.use('/api/schedules', createBaseRouter('schedules', 'teller_schedules'));
app.use('/api/leaves', createBaseRouter('leaves', 'leave_forms'));
app.use('/api/forecasts', createBaseRouter('forecasts', 'business_forecasts'));
app.use('/api/bills', createBaseRouter('bills', 'supplier_bills'));

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: '银行网点排班权限追责台账 API'
  });
});

app.get('/api/config/roles', (req, res) => {
  res.json({
    roles: config.ROLES,
    recordStatus: config.RECORD_STATUS,
    dirtyTypes: config.DIRTY_TYPES,
    duplicateStrategy: config.DUPLICATE_STRATEGY
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(config.PORT, () => {
  console.log(`\n========================================`);
  console.log(`银行网点排班权限追责台账 API 服务已启动`);
  console.log(`服务地址: http://localhost:${config.PORT}`);
  console.log(`API 文档请参考: /api/health`);
  console.log(`========================================\n`);
  console.log(`默认账号:`);
  console.log(`  主管(Supervisor): admin / admin123`);
  console.log(`  录入员(Data Entry): entry1 / entry123`);
  console.log(`  复核员(Reviewer): reviewer1 / review123`);
  console.log(`  支行行长(View Only): viewer1 / view123`);
  console.log(`\n主要接口:`);
  console.log(`  POST /api/auth/login - 登录`);
  console.log(`  GET /api/schedules - 柜员排班列表`);
  console.log(`  POST /api/schedules/batch - 批量导入排班`);
  console.log(`  GET /api/manager/overview - 行长总览视图`);
  console.log(`  GET /api/audit/logs - 审计日志`);
});

module.exports = app;
