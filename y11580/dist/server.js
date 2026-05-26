"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const prisma_1 = require("./lib/prisma");
const batches_1 = require("./routes/batches");
const supervisor_1 = require("./routes/supervisor");
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'store-member-value-exception-statemachine'
    });
});
app.use('/api/batches', batches_1.batchesRouter);
app.use('/api/supervisor', supervisor_1.supervisorRouter);
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.statusCode || 500).json({
        error: err.message || 'Internal Server Error'
    });
});
async function startServer() {
    await (0, prisma_1.connectDB)();
    app.listen(config_1.CONFIG.PORT, () => {
        console.log(`Server running on http://localhost:${config_1.CONFIG.PORT}`);
        console.log(`Health check: http://localhost:${config_1.CONFIG.PORT}/health`);
    });
}
startServer().catch(console.error);
//# sourceMappingURL=server.js.map