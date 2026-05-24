"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const connection_1 = require("../database/connection");
const testDbPath = path_1.default.join(process.cwd(), 'data', 'test.db');
beforeAll(() => {
    const dataDir = path_1.default.join(process.cwd(), 'data');
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    }
    if (fs_1.default.existsSync(testDbPath)) {
        fs_1.default.unlinkSync(testDbPath);
    }
    (0, connection_1.getDatabase)(testDbPath);
});
beforeEach(() => {
    (0, connection_1.resetDatabase)();
});
afterAll(() => {
    (0, connection_1.closeDatabase)();
    if (fs_1.default.existsSync(testDbPath)) {
        fs_1.default.unlinkSync(testDbPath);
    }
});
//# sourceMappingURL=setup.js.map