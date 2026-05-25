"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const database_1 = require("../config/database");
const AutomatedCheckService_1 = require("../services/AutomatedCheckService");
async function main() {
    try {
        await (0, database_1.initializeDatabase)();
        console.log('数据库连接成功\n');
        console.log('开始运行自动化检查...\n');
        const results = await AutomatedCheckService_1.AutomatedCheckService.runAllChecks();
        AutomatedCheckService_1.AutomatedCheckService.printCheckResults(results);
        const hasCritical = results.some(r => r.severity === 'critical' && !r.passed);
        const hasWarning = results.some(r => r.severity === 'warning' && !r.passed);
        if (hasCritical) {
            console.log('❌ 存在严重问题，请立即处理!');
            process.exit(2);
        }
        else if (hasWarning) {
            console.log('⚠️  存在警告问题，建议检查。');
            process.exit(1);
        }
        else {
            console.log('✅ 所有检查通过!');
            process.exit(0);
        }
    }
    catch (error) {
        console.error('检查运行失败:', error);
        process.exit(3);
    }
}
main();
