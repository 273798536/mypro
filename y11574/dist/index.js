"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("./middleware/auth");
const records_1 = __importDefault(require("./routes/records"));
const export_1 = __importDefault(require("./routes/export"));
const summary_1 = __importDefault(require("./routes/summary"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: '客服工单升级权限追责台账 API 运行正常',
        timestamp: new Date().toISOString()
    });
});
app.use(auth_1.authenticate);
app.use('/api/records', records_1.default);
app.use('/api/export', export_1.default);
app.use('/api/summary', summary_1.default);
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`服务器运行在 http://localhost:${PORT}`);
        console.log('');
        console.log('可用测试用户:');
        console.log('  录入员:    entry-1');
        console.log('  复核员:    reviewer-1');
        console.log('  主管:      supervisor-1');
        console.log('  只读用户:  readonly-1');
        console.log('');
        console.log('使用示例:');
        console.log('  curl -H "x-user-id: entry-1" http://localhost:3000/health');
    });
}
exports.default = app;
