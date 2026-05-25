"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const database_1 = require("./config/database");
const auth_1 = require("./middleware/auth");
const applications_1 = __importDefault(require("./routes/applications"));
const queue_1 = __importDefault(require("./routes/queue"));
const deadletter_1 = __importDefault(require("./routes/deadletter"));
const export_1 = __importDefault(require("./routes/export"));
const AutomatedCheckService_1 = require("./services/AutomatedCheckService");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use(auth_1.authMiddleware);
app.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            user: req.user
        }
    });
});
app.use('/api/applications', applications_1.default);
app.use('/api/queue', queue_1.default);
app.use('/api/dead-letters', deadletter_1.default);
app.use('/api/export', export_1.default);
app.get('/api/checks', async (req, res) => {
    try {
        const results = await AutomatedCheckService_1.AutomatedCheckService.runAllChecks();
        res.json({
            success: true,
            data: results
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
app.use((err, req, res, next) => {
    console.error('未捕获的异常:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
        errorMessage: err.message
    });
});
async function startServer() {
    try {
        await (0, database_1.initializeDatabase)();
        console.log('数据库初始化完成');
        console.log('运行自动化检查...');
        const checkResults = await AutomatedCheckService_1.AutomatedCheckService.runAllChecks();
        AutomatedCheckService_1.AutomatedCheckService.printCheckResults(checkResults);
        app.listen(PORT, () => {
            console.log(`\n服务已启动: http://localhost:${PORT}`);
            console.log('API 文档:');
            console.log('  GET  /health - 健康检查');
            console.log('  POST /api/applications/submit - 提交借阅申请');
            console.log('  POST /api/applications/batch-submit - 批量提交');
            console.log('  GET  /api/applications/:id - 查询申请详情');
            console.log('  POST /api/applications/:id/withdraw - 撤回申请');
            console.log('  POST /api/applications/:id/resubmit - 重新提交');
            console.log('  POST /api/applications/:id/close - 关闭申请');
            console.log('  POST /api/applications/:id/comments - 添加主管批注');
            console.log('  GET  /api/queue/stats - 队列统计');
            console.log('  GET  /api/queue/pending - 待处理任务');
            console.log('  POST /api/queue/:taskId/freeze - 冻结任务');
            console.log('  POST /api/queue/:taskId/unfreeze - 解冻任务');
            console.log('  POST /api/queue/:taskId/manual - 人工干预');
            console.log('  GET  /api/dead-letters - 死信列表');
            console.log('  POST /api/dead-letters/:id/requeue - 重新入队');
            console.log('  POST /api/export/applications - 导出申请');
            console.log('  GET  /api/checks - 运行自动化检查');
            console.log('\n请求头要求:');
            console.log('  X-User-ID: 用户ID');
            console.log('  X-User-Name: 用户名');
            console.log('  X-User-Role: 角色 (admin/supervisor/operator/viewer)');
        });
    }
    catch (error) {
        console.error('服务启动失败:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    startServer();
}
exports.default = app;
