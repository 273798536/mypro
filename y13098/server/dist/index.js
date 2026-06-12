"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const corridors_1 = __importDefault(require("./routes/corridors"));
const records_1 = __importDefault(require("./routes/records"));
const export_1 = __importDefault(require("./routes/export"));
const history_1 = __importDefault(require("./routes/history"));
const users_1 = __importDefault(require("./routes/users"));
const database_1 = require("./database");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const dataDir = path_1.default.join(__dirname, '../data');
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use('/api/corridors', corridors_1.default);
app.use('/api/records', records_1.default);
app.use('/api/export', export_1.default);
app.use('/api/history', history_1.default);
app.use('/api/users', users_1.default);
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});
async function startServer() {
    try {
        await (0, database_1.initDatabase)();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`API Health: http://localhost:${PORT}/api/health`);
        });
    }
    catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}
startServer();
exports.default = app;
