"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = exports.startServer = exports.app = void 0;
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("./config/database");
Object.defineProperty(exports, "AppDataSource", { enumerable: true, get: function () { return database_1.AppDataSource; } });
const routes_1 = require("./routes");
const PORT = process.env.PORT || 3000;
const DATA_DIR = path_1.default.join(process.cwd(), 'data');
if (!fs_1.default.existsSync(DATA_DIR)) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
const app = (0, express_1.default)();
exports.app = app;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api', (0, routes_1.createRoutes)(database_1.AppDataSource));
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});
const startServer = async () => {
    try {
        await (0, database_1.initializeDatabase)();
        console.log('Database connected successfully');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`API base URL: http://localhost:${PORT}/api`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
exports.startServer = startServer;
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=index.js.map