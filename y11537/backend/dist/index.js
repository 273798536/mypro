"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = __importDefault(require("./routes"));
const db_1 = require("./db");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', routes_1.default);
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: '企业培训签到重试补偿系统'
    });
});
async function startServer() {
    const dbConnected = await (0, db_1.testConnection)();
    if (!dbConnected) {
        console.warn('⚠️  数据库连接失败，请检查数据库配置');
    }
    app.listen(PORT, () => {
        console.log(`\n🚀 企业培训签到重试补偿系统后端服务启动成功`);
        console.log(`📍 服务地址: http://localhost:${PORT}`);
        console.log(`📊 健康检查: http://localhost:${PORT}/health`);
        console.log(`🔗 API 前缀: http://localhost:${PORT}/api`);
        console.log(`\n📋 可用接口:`);
        console.log(`   POST /api/auth/login - 用户登录`);
        console.log(`   POST /api/data/registration - 提交报名表`);
        console.log(`   POST /api/data/signin - 提交签到记录`);
        console.log(`   POST /api/data/homework - 提交课后作业`);
        console.log(`   POST /api/data/price-adjustment - 提交手工改价`);
        console.log(`   POST /api/data/history-archive - 导入历史压缩包`);
        console.log(`   GET  /api/queue - 补偿队列列表`);
        console.log(`   GET  /api/queue/stats - 队列统计`);
        console.log(`   GET  /api/reports/signin - 签到报表`);
        console.log(`   GET  /api/reports/failed-records - 失败记录`);
        console.log(`   GET  /api/reports/hrbp-dashboard - HRBP仪表盘`);
    });
}
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map