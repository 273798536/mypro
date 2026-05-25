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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path = __importStar(require("path"));
const dayjs_1 = __importDefault(require("dayjs"));
const database_1 = require("./db/database");
const parser_1 = require("./import/parser");
const report_1 = require("./business/report");
const exporter_1 = require("./export/exporter");
const types_1 = require("./types");
const program = new commander_1.Command();
program
    .name('sci')
    .description('智能柜补货多源导入巡检CLI工具')
    .version('1.0.0');
program
    .command('init')
    .description('初始化本地数据库')
    .option('-o, --operator <name>', '操作人姓名', 'system')
    .action(async (options) => {
    try {
        await (0, database_1.initDb)();
        await (0, database_1.insertAuditLog)(types_1.OperationType.INIT, options.operator, {
            remark: '初始化数据库'
        });
        console.log('✅ 数据库初始化成功');
        console.log('📁 数据库位置: ~/.sci/inspection.db');
    }
    catch (error) {
        console.error('❌ 初始化失败:', error);
        process.exit(1);
    }
    finally {
        (0, database_1.closeDb)();
    }
});
program
    .command('import')
    .description('导入数据文件')
    .argument('<file>', '数据文件路径')
    .option('-t, --type <type>', '数据类型: inventory|restock|refund|exception|sms')
    .option('-o, --operator <name>', '操作人姓名', 'system')
    .option('-r, --remark <text>', '备注')
    .action(async (file, options) => {
    try {
        (0, database_1.initDb)();
        const sourceTypeMap = {
            inventory: types_1.SourceType.CABINET_INVENTORY,
            restock: types_1.SourceType.RESTOCK_PHOTO,
            refund: types_1.SourceType.REFUND_RECORD,
            exception: types_1.SourceType.EXCEPTION_PHOTO,
            sms: types_1.SourceType.SMS_SCREENSHOT
        };
        const sourceType = options.type ? sourceTypeMap[options.type] : undefined;
        console.log(`📖 正在解析文件: ${file}`);
        const result = await (0, parser_1.parseFile)(file, sourceType);
        const detectedSourceType = result.sourceType;
        const sourceTypeName = Object.entries(sourceTypeMap).find(([_, v]) => v === detectedSourceType)?.[0] || detectedSourceType;
        console.log(`🔍 识别数据类型: ${sourceTypeName}`);
        const batchId = await (0, database_1.insertBatch)({
            sourceType: detectedSourceType,
            fileName: path.basename(file),
            filePath: path.resolve(file),
            importTime: (0, dayjs_1.default)().toISOString(),
            totalRecords: result.totalCount,
            successCount: result.validCount,
            failureCount: result.invalidCount,
            operator: options.operator,
            remark: options.remark
        });
        const mapper = (0, parser_1.getDataMapper)(detectedSourceType);
        let successCount = 0;
        let failureCount = 0;
        for (const record of result.records) {
            if (record.isValid) {
                const mappedData = mapper(record, batchId);
                switch (detectedSourceType) {
                    case types_1.SourceType.CABINET_INVENTORY:
                        await (0, database_1.insertCabinetInventory)(mappedData);
                        break;
                    case types_1.SourceType.RESTOCK_PHOTO:
                        await (0, database_1.insertRestockPhoto)(mappedData);
                        break;
                    case types_1.SourceType.REFUND_RECORD:
                        await (0, database_1.insertRefundRecord)(mappedData);
                        break;
                    case types_1.SourceType.EXCEPTION_PHOTO:
                        await (0, database_1.insertExceptionPhoto)(mappedData);
                        break;
                    case types_1.SourceType.SMS_SCREENSHOT:
                        await (0, database_1.insertSmsScreenshot)(mappedData);
                        break;
                }
                successCount++;
            }
            else {
                await (0, database_1.insertFailureRecord)({
                    batchId,
                    sourceType: detectedSourceType,
                    originalLineNumber: record.originalLineNumber,
                    failureReason: record.failureReason || '未知错误',
                    rawData: JSON.stringify(record.data)
                });
                failureCount++;
            }
        }
        await (0, database_1.updateBatchStats)(batchId, successCount, failureCount);
        await (0, database_1.insertAuditLog)(types_1.OperationType.IMPORT, options.operator, {
            batchId,
            remark: `导入文件: ${path.basename(file)}, 成功: ${successCount}, 失败: ${failureCount}`
        });
        console.log(`✅ 导入完成`);
        console.log(`📦 批次ID: ${batchId}`);
        console.log(`📊 总计: ${result.totalCount} 条`);
        console.log(`✅ 成功: ${successCount} 条`);
        console.log(`❌ 失败: ${failureCount} 条`);
    }
    catch (error) {
        console.error('❌ 导入失败:', error);
        process.exit(1);
    }
    finally {
        (0, database_1.closeDb)();
    }
});
program
    .command('check')
    .description('检查数据一致性和完整性')
    .option('--recalc-hot', '重新计算热销格口满仓状态')
    .option('-o, --operator <name>', '操作人姓名', 'system')
    .action(async (options) => {
    try {
        await (0, database_1.initDb)();
        console.log('🔍 开始数据检查...\n');
        if (options.recalcHot) {
            console.log('📦 重新计算热销格口满仓状态...');
            const hotResult = await (0, report_1.recalculateHotSkuFullStatus)();
            console.log(`   更新了 ${hotResult.updated} / ${hotResult.total} 条热销格口记录`);
        }
        const report = await (0, report_1.getDataConsistencyReport)();
        if (report.isConsistent) {
            console.log('\n✅ 数据一致性检查通过');
        }
        else {
            console.log('\n⚠️  发现以下问题:');
            for (const issue of report.issues) {
                console.log(`   - [${issue.type}] ${issue.description}`);
            }
        }
        await (0, database_1.insertAuditLog)(types_1.OperationType.CHECK, options.operator, {
            remark: `数据检查, 发现 ${report.issues.length} 个问题`
        });
    }
    catch (error) {
        console.error('❌ 检查失败:', error);
        process.exit(1);
    }
    finally {
        (0, database_1.closeDb)();
    }
});
program
    .command('fix')
    .description('修复或改判数据记录')
    .argument('<record-id>', '记录ID')
    .argument('<table>', '表名: cabinet_inventory|restock_photos|refund_records|exception_photos|sms_screenshots')
    .option('-s, --status <status>', '状态: valid|invalid|fixed|excluded')
    .option('-r, --reason <text>', '失败原因')
    .option('--deduct <amount>', '网络恢复后扣库存数量')
    .option('-o, --operator <name>', '操作人姓名', 'system')
    .action(async (recordId, table, options) => {
    try {
        await (0, database_1.initDb)();
        const beforeRecord = await (0, database_1.getRecordById)(table, recordId);
        if (options.deduct) {
            const amount = parseInt(options.deduct, 10);
            const success = await (0, report_1.applyNetworkRecoveryDeduction)(recordId, amount);
            if (success) {
                console.log(`✅ 库存扣减成功: ${amount} 件`);
            }
            else {
                console.log('❌ 库存扣减失败: 未找到柜机记录');
            }
        }
        if (options.status) {
            const statusMap = {
                valid: types_1.RecordStatus.VALID,
                invalid: types_1.RecordStatus.INVALID,
                fixed: types_1.RecordStatus.FIXED,
                excluded: types_1.RecordStatus.EXCLUDED
            };
            await (0, database_1.updateRecordStatus)(table, recordId, statusMap[options.status], options.reason);
            console.log(`✅ 记录状态已更新为: ${options.status}`);
        }
        const afterRecord = await (0, database_1.getRecordById)(table, recordId);
        await (0, database_1.insertAuditLog)(types_1.OperationType.FIX, options.operator, {
            recordId,
            recordType: table,
            beforeChange: beforeRecord,
            afterChange: afterRecord,
            remark: options.reason || '修复记录'
        });
    }
    catch (error) {
        console.error('❌ 修复失败:', error);
        process.exit(1);
    }
    finally {
        (0, database_1.closeDb)();
    }
});
program
    .command('report')
    .description('生成巡检报表')
    .option('-c, --city <name>', '按城市筛选')
    .option('-d, --detail <cabinet-id>', '查看指定柜机详情')
    .option('--json', '输出JSON格式')
    .action(async (options) => {
    try {
        await (0, database_1.initDb)();
        if (options.detail) {
            const detail = await (0, report_1.getCabinetDetail)(options.detail);
            console.log('\n📊 柜机详情:');
            console.log(JSON.stringify(detail.summary, null, 2));
            console.log(`\n📦 库存记录 (${detail.inventoryRecords.length}条):`);
            detail.inventoryRecords.slice(0, 5).forEach((r) => {
                console.log(`   行${r.original_line_number} | ${r.record_time} | ${r.stock_quantity}件 | ${r.source_file || '未知'}`);
            });
            console.log(`\n🔄 补货记录 (${detail.restockRecords.length}条):`);
            detail.restockRecords.slice(0, 5).forEach((r) => {
                console.log(`   行${r.original_line_number} | ${r.photo_time} | +${r.restock_quantity}件 | ${r.source_file || '未知'}`);
            });
        }
        else {
            const reports = await (0, report_1.generateReport)(options.city);
            console.log('\n📊 巡检汇总报表:');
            console.log('='.repeat(120));
            console.log('城市\t柜机ID\t初始库存\t补货\t销售\t当前库存\t退款\t异常\t热销满仓');
            console.log('-'.repeat(120));
            for (const r of reports) {
                console.log(`${r.city}\t${r.cabinetId}\t${r.initialStock}\t\t${r.restockQuantity}\t${r.salesQuantity}\t${r.currentStock}\t\t${r.refundCount}\t${r.exceptionCount}\t${r.hotSkuFullCount}`);
            }
            console.log('='.repeat(120));
            console.log(`\n总计: ${reports.length} 台柜机`);
        }
    }
    catch (error) {
        console.error('❌ 生成报表失败:', error);
        process.exit(1);
    }
    finally {
        (0, database_1.closeDb)();
    }
});
program
    .command('history')
    .description('查看操作历史')
    .option('-n, --limit <number>', '显示条数', '20')
    .option('--batches', '只显示导入批次')
    .option('--failures', '只显示失败记录')
    .action(async (options) => {
    try {
        await (0, database_1.initDb)();
        const limit = parseInt(options.limit, 10);
        if (options.batches) {
            const batches = await (0, database_1.getBatches)(undefined, limit);
            console.log('\n📦 导入批次历史:');
            console.log('='.repeat(100));
            batches.forEach((b) => {
                console.log(`[${b.importTime.substring(0, 19)}] ${b.sourceType} | ${b.fileName} | 成功${b.successCount}/失败${b.failureCount} | ${b.operator}`);
            });
        }
        else if (options.failures) {
            const failures = await (0, database_1.getFailureRecords)();
            console.log('\n❌ 失败记录:');
            console.log('='.repeat(100));
            failures.slice(0, limit).forEach((f) => {
                console.log(`[${f.createdAt.substring(0, 19)}] 行${f.originalLineNumber} | ${f.sourceType} | ${f.failureReason}`);
            });
        }
        else {
            const logs = await (0, database_1.getAuditLogs)(limit);
            console.log('\n📜 操作日志:');
            console.log('='.repeat(100));
            logs.forEach((log) => {
                console.log(`[${log.operationTime.substring(0, 19)}] ${log.operationType} | ${log.operator} | ${log.remark || ''}`);
            });
        }
    }
    catch (error) {
        console.error('❌ 查询历史失败:', error);
        process.exit(1);
    }
    finally {
        (0, database_1.closeDb)();
    }
});
program
    .command('export')
    .description('导出数据')
    .argument('<output-path>', '输出目录')
    .option('-c, --city <name>', '按城市筛选')
    .option('--failures', '只导出失败清单')
    .option('--batch <id>', '指定批次ID')
    .action(async (outputPath, options) => {
    try {
        await (0, database_1.initDb)();
        let exportedPath;
        if (options.failures) {
            exportedPath = await (0, exporter_1.exportFailureRecords)(outputPath, options.batch);
            console.log(`✅ 失败清单已导出: ${exportedPath}`);
        }
        else {
            exportedPath = await (0, exporter_1.exportReport)(outputPath, options.city);
            console.log(`✅ 巡检报表已导出: ${exportedPath}`);
        }
        await (0, database_1.insertAuditLog)(types_1.OperationType.EXPORT, 'system', {
            remark: `导出文件: ${exportedPath}`
        });
    }
    catch (error) {
        console.error('❌ 导出失败:', error);
        process.exit(1);
    }
    finally {
        (0, database_1.closeDb)();
    }
});
program.parseAsync(process.argv).catch((error) => {
    console.error('❌ 命令执行失败:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map