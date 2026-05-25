"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("./database");
const materials_1 = __importDefault(require("./routes/materials"));
const costs_1 = __importDefault(require("./routes/costs"));
const audit_1 = __importDefault(require("./routes/audit"));
const export_1 = __importDefault(require("./routes/export"));
const failedRecords_1 = __importDefault(require("./routes/failedRecords"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/materials', materials_1.default);
app.use('/api/costs', costs_1.default);
app.use('/api', audit_1.default);
app.use('/api/export', export_1.default);
app.use('/api/failed-records', failedRecords_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});
async function startServer() {
    try {
        const db = (0, database_1.getDatabase)('./database.sqlite');
        await db.init();
        console.log('Database initialized');
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log('API Endpoints:');
            console.log('  GET  /health');
            console.log('  GET  /api/dashboard');
            console.log('  GET  /api/materials');
            console.log('  POST /api/materials');
            console.log('  GET  /api/materials/:id');
            console.log('  POST /api/materials/:id/status');
            console.log('  POST /api/materials/:id/submit');
            console.log('  POST /api/materials/:id/reject');
            console.log('  POST /api/materials/:id/confirm');
            console.log('  GET  /api/materials/:id/history');
            console.log('  POST /api/costs');
            console.log('  POST /api/costs/bulk');
            console.log('  GET  /api/costs/material/:id');
            console.log('  POST /api/audit');
            console.log('  POST /api/comments');
            console.log('  GET  /api/export/csv');
            console.log('  GET  /api/failed-records');
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=index.js.map