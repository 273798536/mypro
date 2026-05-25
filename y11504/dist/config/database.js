"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const path_1 = __importDefault(require("path"));
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'sqlite',
    database: process.env.NODE_ENV === 'test'
        ? ':memory:'
        : path_1.default.join(process.cwd(), 'data', 'ledger.db'),
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
    entities: [path_1.default.join(__dirname, '..', 'entities', '*.{ts,js}')],
    migrations: [path_1.default.join(__dirname, '..', 'migrations', '*.{ts,js}')],
    subscribers: [path_1.default.join(__dirname, '..', 'subscribers', '*.{ts,js}')],
});
const initializeDatabase = async () => {
    if (!exports.AppDataSource.isInitialized) {
        await exports.AppDataSource.initialize();
    }
    return exports.AppDataSource;
};
exports.initializeDatabase = initializeDatabase;
//# sourceMappingURL=database.js.map