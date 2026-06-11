"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: "./data/app.db",
    synchronize: true,
    logging: false,
    entities: [__dirname + "/entity/**/*.ts"],
    migrations: [],
    subscribers: [],
});
