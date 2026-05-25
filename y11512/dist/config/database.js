"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
exports.initializeDatabase = initializeDatabase;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const BorrowApplication_1 = require("../entities/BorrowApplication");
const ExpressOrder_1 = require("../entities/ExpressOrder");
const CompensationRecord_1 = require("../entities/CompensationRecord");
const SupervisorComment_1 = require("../entities/SupervisorComment");
const RetryQueue_1 = require("../entities/RetryQueue");
const DeadLetter_1 = require("../entities/DeadLetter");
const OperationLog_1 = require("../entities/OperationLog");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'sqlite',
    database: './library_loan_queue.db',
    synchronize: true,
    logging: false,
    entities: [
        BorrowApplication_1.BorrowApplication,
        ExpressOrder_1.ExpressOrder,
        CompensationRecord_1.CompensationRecord,
        SupervisorComment_1.SupervisorComment,
        RetryQueue_1.RetryQueue,
        DeadLetter_1.DeadLetter,
        OperationLog_1.OperationLog
    ],
    migrations: [],
    subscribers: []
});
async function initializeDatabase() {
    try {
        await exports.AppDataSource.initialize();
        console.log('数据库连接成功');
    }
    catch (error) {
        console.error('数据库连接失败:', error);
        throw error;
    }
}
