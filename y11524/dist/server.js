"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ledgerRoutes_1 = __importDefault(require("./routes/ledgerRoutes"));
const connection_1 = require("./database/connection");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const dataDir = path_1.default.join(process.cwd(), 'data');
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/ledger', ledgerRoutes_1.default);
app.get('/', (req, res) => {
    res.json({
        name: '家电安装回访权限追责台账 API',
        version: '1.0.0',
        endpoints: {
            import: {
                appointment: 'POST /api/ledger/import/appointment',
                technicianLocation: 'POST /api/ledger/import/technician-location',
                userReview: 'POST /api/ledger/import/user-review',
                secondConfirmation: 'POST /api/ledger/import/second-confirmation',
            },
            status: {
                change: 'POST /api/ledger/status/change',
            },
            query: {
                list: 'GET /api/ledger/list',
                detail: 'GET /api/ledger/detail/:id',
                failedRecords: 'GET /api/ledger/failed-records',
                statistics: 'GET /api/ledger/statistics',
            },
            export: {
                batch: 'POST /api/ledger/export',
                detail: 'POST /api/ledger/export/:id',
            },
        },
    });
});
(0, connection_1.getDatabase)();
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`数据库文件: ${path_1.default.join(process.cwd(), 'data', 'ledger.db')}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map