"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
const sampleData_1 = require("./data/sampleData");
const evaluationSets_1 = __importDefault(require("./routes/evaluationSets"));
const vocabularies_1 = __importDefault(require("./routes/vocabularies"));
const reports_1 = __importDefault(require("./routes/reports"));
const export_1 = __importDefault(require("./routes/export"));
const response_1 = require("./utils/response");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/', (req, res) => {
    (0, response_1.successResponse)(res, {
        service: '领域词表覆盖报告服务',
        version: '1.0.0',
        status: 'running',
        sample_data_loaded: (0, sampleData_1.isSampleDataLoaded)(),
        endpoints: {
            'GET /api/evaluation-sets': '评测集列表',
            'GET /api/vocabularies': '领域词表列表',
            'GET /api/reports': '报告列表',
            'GET /api/export/:id': '导出报告',
        },
    });
});
app.get('/api/health', (req, res) => {
    (0, response_1.successResponse)(res, { status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/sample-data/check', (req, res) => {
    (0, response_1.successResponse)(res, { loaded: (0, sampleData_1.isSampleDataLoaded)() });
});
app.post('/api/sample-data/load', (req, res) => {
    try {
        if ((0, sampleData_1.isSampleDataLoaded)()) {
            (0, response_1.successResponse)(res, { loaded: true, newly_created: false }, '示例数据已存在');
            return;
        }
        (0, sampleData_1.loadSampleData)();
        (0, response_1.successResponse)(res, { loaded: true, newly_created: true }, '示例数据加载成功');
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, 500);
    }
});
app.use('/api/evaluation-sets', evaluationSets_1.default);
app.use('/api/vocabularies', vocabularies_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/export', export_1.default);
app.use((err, req, res, next) => {
    console.error('[Error]', err);
    if (res.headersSent) {
        return next(err);
    }
    (0, response_1.errorResponse)(res, err.message || '服务器内部错误', err.statusCode || 500, err.details);
});
app.use((req, res) => {
    (0, response_1.errorResponse)(res, `接口不存在: ${req.method} ${req.path}`, 404);
});
async function startServer() {
    await (0, database_1.initDatabase)();
    (0, sampleData_1.loadSampleData)();
    app.listen(PORT, () => {
        console.log(`
========================================
  领域词表覆盖报告服务已启动
  端口: ${PORT}
  数据库: ${path_1.default.join(process.cwd(), 'data', 'coverage_report.db')}
  示例数据: ${(0, sampleData_1.isSampleDataLoaded)() ? '已加载' : '未加载'}
========================================
`);
    });
}
if (require.main === module) {
    startServer().catch((err) => {
        console.error('启动失败:', err);
        process.exit(1);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map