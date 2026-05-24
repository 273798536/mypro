"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../database");
const utils_1 = require("../utils");
async function init(targetPath, options = {}) {
    const wwiDir = path_1.default.join(targetPath, '.wwi');
    const dataDir = path_1.default.join(wwiDir, 'data');
    const exportsDir = path_1.default.join(wwiDir, 'exports');
    const reportsDir = path_1.default.join(wwiDir, 'reports');
    const logsDir = path_1.default.join(wwiDir, 'logs');
    if (fs_1.default.existsSync(wwiDir) && !options.force) {
        (0, utils_1.logInfo)('仓库波次巡检工作区已存在，跳过初始化');
        return;
    }
    (0, utils_1.ensureDir)(wwiDir);
    (0, utils_1.ensureDir)(dataDir);
    (0, utils_1.ensureDir)(exportsDir);
    (0, utils_1.ensureDir)(reportsDir);
    (0, utils_1.ensureDir)(logsDir);
    const config = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
    };
    fs_1.default.writeFileSync(path_1.default.join(wwiDir, 'config.json'), JSON.stringify(config, null, 2));
    const db = new database_1.DatabaseManager(targetPath);
    await db.init();
    await db.close();
    fs_1.default.writeFileSync(path_1.default.join(dataDir, 'README.md'), `# 数据导入目录

## 支持的数据源

| 数据类型 | 文件名模式 | 必填字段 |
|---------|-----------|---------|
| 波次单 | wave_*.csv | waveNo, orderNo, skuCode, skuName, planQty, storeCode, storeName |
| 拣货差异 | pick_diff_*.csv | waveNo, orderNo, skuCode, pickQty, diffQty, diffType |
| 复核扫描 | review_scan_*.csv | waveNo, orderNo, skuCode, reviewQty, isException |
| 客服备注 | customer_note_*.csv | waveNo, orderNo, noteType, noteContent, isUrgent |
`);
    (0, utils_1.logSuccess)('仓内波次拣货多源导入巡检工作区初始化完成');
    console.log('');
    (0, utils_1.logInfo)('目录结构:');
    console.log('  .wwi/');
    console.log('  ├── facts.db          # 事实数据库（单一事实来源）');
    console.log('  ├── config.json       # 配置文件');
    console.log('  ├── data/             # 待导入数据目录');
    console.log('  ├── exports/          # 导出文件目录');
    console.log('  ├── reports/          # 报表目录');
    console.log('  └── logs/             # 日志目录');
    console.log('');
    (0, utils_1.logInfo)('下一步: 将数据文件放入 .wwi/data/ 后运行 wwi import');
}
