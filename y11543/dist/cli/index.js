#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const commander_1 = require("commander");
const data_source_1 = require("../database/data-source");
const services_1 = require("../services");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const program = new commander_1.Command();
program
    .name('ad-audit-cli')
    .description('广告素材投放验收回放链路服务 CLI 工具')
    .version('1.0.0');
program
    .command('init-db')
    .description('初始化数据库')
    .action(async () => {
    console.log('正在初始化数据库...');
    await (0, data_source_1.initDatabase)();
    console.log('✓ 数据库初始化完成');
    process.exit(0);
});
program
    .command('create-batch')
    .description('创建批次')
    .requiredOption('-n, --batchNo <batchNo>', '批次号')
    .option('-N, --name <name>', '批次名称')
    .option('-o, --operator <operator>', '操作人')
    .option('-d, --description <description>', '描述')
    .option('-s, --strategy <strategy>', '重复策略: ignore|overwrite|append', 'ignore')
    .action(async (options) => {
    await (0, data_source_1.initDatabase)();
    console.log(`正在创建批次: ${options.batchNo}...`);
    const batch = await services_1.batchService.create({
        batchNo: options.batchNo,
        name: options.name || options.batchNo,
        operator: options.operator,
        description: options.description,
        duplicateStrategy: options.strategy
    });
    console.log(`✓ 批次创建成功: ${batch.id}`);
    console.log(JSON.stringify(batch, null, 2));
    process.exit(0);
});
program
    .command('add-materials')
    .description('从JSON文件添加素材到批次')
    .requiredOption('-b, --batchId <batchId>', '批次ID')
    .requiredOption('-f, --file <file>', '素材JSON文件路径')
    .option('-o, --operator <operator>', '操作人')
    .action(async (options) => {
    await (0, data_source_1.initDatabase)();
    const filePath = path.resolve(options.file);
    console.log(`正在读取文件: ${filePath}...`);
    const materials = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`正在添加 ${materials.length} 个素材...`);
    const result = await services_1.batchService.addMaterials(options.batchId, materials, options.operator);
    console.log(`✓ 处理完成: 新增 ${result.added.length}, 跳过 ${result.skipped.length}, 重复 ${result.duplicates.length}`);
    process.exit(0);
});
program
    .command('submit')
    .description('提交批次')
    .requiredOption('-b, --batchId <batchId>', '批次ID')
    .option('-o, --operator <operator>', '操作人')
    .action(async (options) => {
    await (0, data_source_1.initDatabase)();
    console.log(`正在提交批次: ${options.batchId}...`);
    const batch = await services_1.batchService.submit(options.batchId, options.operator);
    console.log(`✓ 批次已提交: ${batch.status}`);
    process.exit(0);
});
program
    .command('freeze')
    .description('冻结批次')
    .requiredOption('-b, --batchId <batchId>', '批次ID')
    .option('-o, --operator <operator>', '操作人')
    .action(async (options) => {
    await (0, data_source_1.initDatabase)();
    console.log(`正在冻结批次: ${options.batchId}...`);
    const batch = await services_1.batchService.freeze(options.batchId, options.operator);
    console.log(`✓ 批次已冻结`);
    process.exit(0);
});
program
    .command('export')
    .description('导出批次数据')
    .requiredOption('-b, --batchId <batchId>', '批次ID')
    .option('-o, --operator <operator>', '操作人')
    .action(async (options) => {
    await (0, data_source_1.initDatabase)();
    console.log(`正在导出批次: ${options.batchId}...`);
    const filepath = await services_1.exportService.exportBatchToCsv(options.batchId, options.operator);
    console.log(`✓ 导出完成: ${filepath}`);
    process.exit(0);
});
program
    .command('report')
    .description('生成对账报告')
    .requiredOption('-b, --batchId <batchId>', '批次ID')
    .action(async (options) => {
    await (0, data_source_1.initDatabase)();
    console.log(`正在生成对账报告: ${options.batchId}...`);
    const report = await services_1.exportService.getReconciliationReport(options.batchId);
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
});
program
    .command('anomalies')
    .description('检测异常')
    .requiredOption('-b, --batchId <batchId>', '批次ID')
    .action(async (options) => {
    await (0, data_source_1.initDatabase)();
    console.log(`正在检测异常: ${options.batchId}...`);
    const anomalies = await services_1.exportService.detectAnomalies(options.batchId);
    console.log(`发现 ${anomalies.length} 个异常:`);
    anomalies.forEach((a, i) => {
        console.log(`  ${i + 1}. [${a.severity}] ${a.type}: ${a.description}`);
    });
    process.exit(0);
});
program
    .command('replay')
    .description('回放素材变更历史')
    .requiredOption('-m, --materialId <materialId>', '素材ID')
    .option('-b, --batchId <batchId>', '批次ID')
    .action(async (options) => {
    await (0, data_source_1.initDatabase)();
    console.log(`正在回放素材变更: ${options.materialId}...`);
    const diffs = await services_1.exportService.replayMaterialChanges(options.materialId, options.batchId);
    console.log(`共 ${diffs.length} 次变更:`);
    diffs.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.changedAt.toISOString()}`);
        console.log(`     ${d.field}: ${d.oldValue} → ${d.newValue}`);
        if (d.operator)
            console.log(`     操作人: ${d.operator}`);
    });
    process.exit(0);
});
program
    .command('history')
    .description('导出历史变更记录')
    .requiredOption('-b, --batchId <batchId>', '批次ID')
    .action(async (options) => {
    await (0, data_source_1.initDatabase)();
    console.log(`正在导出历史记录: ${options.batchId}...`);
    const filepath = await services_1.exportService.exportHistoryDiff(options.batchId);
    console.log(`✓ 导出完成: ${filepath}`);
    process.exit(0);
});
program
    .command('gen-sample')
    .description('生成样例数据')
    .option('-n, --count <count>', '素材数量', '5')
    .option('-f, --file <file>', '输出文件', 'sample-materials.json')
    .action(async (options) => {
    const count = parseInt(options.count);
    const platforms = ['抖音', '快手', '微信', '小红书', '百度'];
    const materials = [];
    for (let i = 1; i <= count; i++) {
        materials.push({
            materialId: `MAT${String(i).padStart(4, '0')}`,
            name: `素材${i}_${platforms[i % platforms.length]}版`,
            platform: platforms[i % platforms.length]
        });
    }
    fs.writeFileSync(options.file, JSON.stringify(materials, null, 2));
    console.log(`✓ 样例数据已生成: ${options.file}`);
    process.exit(0);
});
program.parseAsync().catch(console.error);
