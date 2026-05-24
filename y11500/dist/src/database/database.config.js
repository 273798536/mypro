"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfig = void 0;
const path_1 = require("path");
exports.databaseConfig = {
    type: 'sqlite',
    database: (0, path_1.join)(process.cwd(), 'data', 'spare-part.db'),
    entities: [(0, path_1.join)(__dirname, '..', 'entities', '*.entity{.ts,.js}')],
    synchronize: true,
    logging: false,
};
//# sourceMappingURL=database.config.js.map