"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeApp = initializeApp;
const express_1 = __importDefault(require("express"));
const schema_1 = require("./database/schema");
const rechargeRoutes_1 = __importDefault(require("./routes/rechargeRoutes"));
const refundRoutes_1 = __importDefault(require("./routes/refundRoutes"));
const handoverRoutes_1 = __importDefault(require("./routes/handoverRoutes"));
const receiptRoutes_1 = __importDefault(require("./routes/receiptRoutes"));
const auditRoutes_1 = __importDefault(require("./routes/auditRoutes"));
const viewRoutes_1 = __importDefault(require("./routes/viewRoutes"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});
app.use('/api/recharges', rechargeRoutes_1.default);
app.use('/api/refunds', refundRoutes_1.default);
app.use('/api/handovers', handoverRoutes_1.default);
app.use('/api/receipts', receiptRoutes_1.default);
app.use('/api/audit', auditRoutes_1.default);
app.use('/api/views', viewRoutes_1.default);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: '服务器内部错误' });
});
async function initializeApp() {
    await (0, schema_1.initDatabase)();
    return app;
}
exports.default = app;
