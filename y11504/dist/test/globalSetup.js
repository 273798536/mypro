"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const path_1 = __importDefault(require("path"));
const dataSource = new typeorm_1.DataSource({
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    logging: false,
    entities: [path_1.default.join(__dirname, '..', 'entities', '*.{ts,js}')],
});
module.exports = async () => {
    await dataSource.initialize();
    global.__DATA_SOURCE__ = dataSource;
};
//# sourceMappingURL=globalSetup.js.map