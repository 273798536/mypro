const express = require('express');
const bodyParser = require('body-parser');
const { initDatabase } = require('./database/db');

const annotatorsRouter = require('./routes/annotators');
const tasksRouter = require('./routes/tasks');
const inspectionsRouter = require('./routes/inspections');
const reworksRouter = require('./routes/reworks');
const salaryRouter = require('./routes/salary');
const traceRouter = require('./routes/trace');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use('/api/annotators', annotatorsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/reworks', reworksRouter);
app.use('/api/salary', salaryRouter);
app.use('/api/trace', traceRouter);
app.use('/api/reports', reportsRouter);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '数据标注计件工资系统运行正常' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器内部错误' });
});

async function startServer() {
    try {
        await initDatabase();
        app.listen(PORT, () => {
            console.log(`
============================================
数据标注计件工资系统已启动
服务地址: http://localhost:${PORT}
API文档:
  GET  /api/health                  - 健康检查
  POST /api/annotators              - 新增标注员
  GET  /api/annotators              - 查询标注员列表
  POST /api/tasks                   - 新增任务记录
  GET  /api/tasks                   - 查询任务列表
  POST /api/inspections             - 新增质检结果
  GET  /api/inspections/pending     - 待确认质检
  POST /api/reworks                 - 新增返工单
  GET  /api/reworks/task/:id/changes - 查看变更记录
  POST /api/salary/calculate        - 计算工资
  GET  /api/salary/summaries        - 工资汇总
  GET  /api/trace/task/:task_no     - 质检追溯
  GET  /api/reports/salary/:month   - 工资报表导出
============================================
            `);
        });
    } catch (err) {
        console.error('启动失败:', err);
        process.exit(1);
    }
}

startServer();
