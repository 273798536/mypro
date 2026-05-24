"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleExport = handleExport;
exports.handleExportDirty = handleExportDirty;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const json2csv_1 = require("json2csv");
const database_1 = require("../utils/database");
const login_1 = require("./login");
const dirtyChecker_1 = require("../utils/dirtyChecker");
async function handleExport(options) {
    (0, login_1.requirePermission)('export');
    const user = (0, database_1.getCurrentUser)();
    const format = options.format || 'csv';
    const outputDir = options.output || './exports';
    console.log(chalk_1.default.blue('=== 数据导出 ===\n'));
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const exportedFiles = [];
    if (!options.type || options.type === 'appointment') {
        const appointments = (0, database_1.getAppointments)();
        const filePath = path_1.default.join(outputDir, `appointments_${timestamp}.${format}`);
        await exportData(appointments, filePath, format);
        exportedFiles.push(filePath);
        console.log(chalk_1.default.green(`✅ 预约单: ${appointments.length} 条`));
    }
    if (!options.type || options.type === 'location') {
        const locations = (0, database_1.getLocations)();
        const filePath = path_1.default.join(outputDir, `locations_${timestamp}.${format}`);
        await exportData(locations, filePath, format);
        exportedFiles.push(filePath);
        console.log(chalk_1.default.green(`✅ 师傅定位: ${locations.length} 条`));
    }
    if (!options.type || options.type === 'review') {
        const reviews = (0, database_1.getReviews)();
        const filePath = path_1.default.join(outputDir, `reviews_${timestamp}.${format}`);
        await exportData(reviews, filePath, format);
        exportedFiles.push(filePath);
        console.log(chalk_1.default.green(`✅ 用户评价: ${reviews.length} 条`));
    }
    if (!options.type || options.type === 'price_adjustment') {
        const priceAdjustments = (0, database_1.getPriceAdjustments)();
        const filePath = path_1.default.join(outputDir, `price_adjustments_${timestamp}.${format}`);
        await exportData(priceAdjustments, filePath, format);
        exportedFiles.push(filePath);
        console.log(chalk_1.default.green(`✅ 手工改价: ${priceAdjustments.length} 条`));
    }
    if (options.includeDirty) {
        const dirtyRecords = (0, database_1.getDirtyRecords)().map((r) => ({
            ...r,
            dirtyTypeLabel: (0, dirtyChecker_1.getDirtyTypeLabel)(r.dirtyType),
            sourceTypeLabel: (0, dirtyChecker_1.getSourceTypeLabel)(r.sourceType),
        }));
        const filePath = path_1.default.join(outputDir, `dirty_records_${timestamp}.${format}`);
        await exportData(dirtyRecords, filePath, format);
        exportedFiles.push(filePath);
        console.log(chalk_1.default.yellow(`✅ 脏记录: ${dirtyRecords.length} 条`));
    }
    (0, database_1.addOperationLog)('export_data', user, {});
    console.log(`\n${chalk_1.default.cyan('📁 导出文件:')}`);
    exportedFiles.forEach((f) => {
        console.log(`  ${f}`);
    });
}
async function exportData(data, filePath, format) {
    if (format === 'csv') {
        try {
            const parser = new json2csv_1.Parser();
            const csv = parser.parse(data);
            fs_1.default.writeFileSync(filePath, '\uFEFF' + csv, 'utf-8');
        }
        catch (err) {
            fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        }
    }
    else {
        fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
}
async function handleExportDirty(filePath) {
    (0, login_1.requirePermission)('export');
    const user = (0, database_1.getCurrentUser)();
    const dirtyRecords = (0, database_1.getDirtyRecords)().filter((r) => r.status !== 'approved');
    console.log(chalk_1.default.blue('=== 导出失败清单 ===\n'));
    const exportData = dirtyRecords.map((r) => ({
        记录ID: r.id,
        原始文件: r.sourceFile,
        原始行号: r.rawRow,
        数据源: (0, dirtyChecker_1.getSourceTypeLabel)(r.sourceType),
        问题类型: (0, dirtyChecker_1.getDirtyTypeLabel)(r.dirtyType),
        问题描述: r.description,
        状态: r.status,
        原始数据: JSON.stringify(r.originalData),
        建议修复: JSON.stringify(r.suggestedFix || {}),
        修复说明: r.fixNote || '',
        创建时间: r.createdAt,
    }));
    const dir = path_1.default.dirname(filePath);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    const parser = new json2csv_1.Parser();
    const csv = parser.parse(exportData);
    fs_1.default.writeFileSync(filePath, '\uFEFF' + csv, 'utf-8');
    (0, database_1.addOperationLog)('export_dirty_records', user, {});
    console.log(chalk_1.default.green(`✅ 已导出 ${dirtyRecords.length} 条待处理记录`));
    console.log(`文件路径: ${filePath}`);
}
//# sourceMappingURL=export.js.map