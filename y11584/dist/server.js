"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dataDir = path_1.default.join(__dirname, '../data');
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        const app = await (0, app_1.initializeApp)();
        app.listen(PORT, () => {
            console.log(`门店会员储值权限追责台账 API 服务已启动`);
            console.log(`服务端口: ${PORT}`);
            console.log(`健康检查: http://localhost:${PORT}/api/health`);
        });
    }
    catch (err) {
        console.error('服务启动失败:', err);
        process.exit(1);
    }
}
startServer();
