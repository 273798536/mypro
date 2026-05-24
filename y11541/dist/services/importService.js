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
exports.importFromCSV = importFromCSV;
exports.importFromZip = importFromZip;
exports.importSupplement = importSupplement;
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const jszip_1 = __importDefault(require("jszip"));
const uuid_1 = require("uuid");
const recordService_1 = require("./recordService");
const dirtyRecordService_1 = require("./dirtyRecordService");
async function importFromCSV(filePath, source, requestId) {
    const reqId = requestId || (0, uuid_1.v4)();
    const existingRecords = await (0, recordService_1.findByRequestId)(reqId);
    if (existingRecords.length > 0) {
        console.log(`请求ID已存在，正在更新现有记录... (request_id: ${reqId})`);
        return updateExistingRecords(reqId, filePath, source);
    }
    const results = {
        total: 0,
        success: 0,
        dirty: 0,
        duplicate: 0,
        recordIds: []
    };
    const allExistingRecords = await getAllRecordsForCheck();
    const rows = [];
    await new Promise((resolve, reject) => {
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            rows.push(row);
        })
            .on('end', () => resolve())
            .on('error', reject);
    });
    let lineNumber = 0;
    const processPromises = [];
    for (const row of rows) {
        lineNumber++;
        results.total++;
        const promise = processRow(row, source, lineNumber, reqId, allExistingRecords)
            .then(processed => {
            results.recordIds.push(processed.recordId);
            if (processed.isDuplicate) {
                results.duplicate++;
            }
            else if (processed.isDirty) {
                results.dirty++;
            }
            else {
                results.success++;
            }
        })
            .catch(error => {
            console.error(`第 ${lineNumber} 行处理失败:`, error.message);
        });
        processPromises.push(promise);
    }
    await Promise.all(processPromises);
    console.log(`导入完成: 总计 ${results.total} 条, 成功 ${results.success} 条, 脏数据 ${results.dirty} 条, 重复 ${results.duplicate} 条`);
    return results;
}
async function importFromZip(zipPath, source, requestId) {
    const reqId = requestId || (0, uuid_1.v4)();
    const zip = new jszip_1.default();
    const content = fs_1.default.readFileSync(zipPath);
    const zipContent = await zip.loadAsync(content);
    const totalResult = {
        total: 0,
        success: 0,
        dirty: 0,
        duplicate: 0,
        recordIds: []
    };
    const allExistingRecords = await getAllRecordsForCheck();
    for (const [fileName, file] of Object.entries(zipContent.files)) {
        if (!file.dir && fileName.endsWith('.csv')) {
            console.log(`处理压缩包内文件: ${fileName}`);
            const csvContent = await file.async('string');
            const lines = csvContent.split('\n');
            const headers = lines[0].split(',');
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim())
                    continue;
                totalResult.total++;
                const values = lines[i].split(',');
                const row = {};
                headers.forEach((header, idx) => {
                    row[header.trim()] = (values[idx] || '').trim();
                });
                try {
                    const processed = await processRow(row, source, i, reqId, allExistingRecords, fileName);
                    totalResult.recordIds.push(processed.recordId);
                    if (processed.isDuplicate) {
                        totalResult.duplicate++;
                    }
                    else if (processed.isDirty) {
                        totalResult.dirty++;
                    }
                    else {
                        totalResult.success++;
                    }
                }
                catch (error) {
                    console.error(`文件 ${fileName} 第 ${i} 行处理失败:`, error.message);
                }
            }
        }
    }
    console.log(`压缩包导入完成: 总计 ${totalResult.total} 条, 成功 ${totalResult.success} 条, 脏数据 ${totalResult.dirty} 条, 重复 ${totalResult.duplicate} 条`);
    return totalResult;
}
async function getAllRecordsForCheck() {
    return (0, recordService_1.getAllRecords)(10000);
}
async function processRow(row, source, lineNumber, requestId, existingRecords, sourceFile) {
    const data = {
        material_id: String(row.material_id || row['素材ID'] || ''),
        material_name: String(row.material_name || row['素材名称'] || ''),
        platform: String(row.platform || row['平台'] || ''),
        record_date: String(row.record_date || row['日期'] || ''),
        impressions: row.impressions !== undefined ? Number(row.impressions) :
            row['曝光量'] !== undefined ? Number(row['曝光量']) : undefined,
        clicks: row.clicks !== undefined ? Number(row.clicks) :
            row['点击量'] !== undefined ? Number(row['点击量']) : undefined,
        cost: row.cost !== undefined ? Number(row.cost) :
            row['花费'] !== undefined ? Number(row['花费']) : undefined,
        audit_status: String(row.audit_status || row['审核状态'] || ''),
        audit_reason: String(row.audit_reason || row['审核原因'] || '')
    };
    const existing = await (0, recordService_1.findExistingRecord)(data.material_id, data.platform, data.record_date, source);
    if (existing) {
        await (0, recordService_1.updateRecord)(existing.id, data, `重复导入更新 (来源行: ${lineNumber}, 请求ID: ${requestId})`);
        const dirtyResults = (0, dirtyRecordService_1.checkAllDirty)(data, source, existingRecords);
        if (dirtyResults.length > 0) {
            const { run } = await Promise.resolve().then(() => __importStar(require('../db/database')));
            await run('DELETE FROM dirty_records WHERE record_id = ?', [existing.id]);
            await (0, dirtyRecordService_1.saveDirtyRecords)(existing.id, dirtyResults);
            await (0, recordService_1.updateRecordStatus)(existing.id, 'dirty', '更新后发现脏数据');
            return { recordId: existing.id, isDuplicate: true, isDirty: true };
        }
        return { recordId: existing.id, isDuplicate: true, isDirty: false };
    }
    const record = await (0, recordService_1.createRecord)(data, source, lineNumber, requestId);
    const dirtyResults = (0, dirtyRecordService_1.checkAllDirty)(data, source, existingRecords);
    if (dirtyResults.length > 0) {
        await (0, dirtyRecordService_1.saveDirtyRecords)(record.id, dirtyResults);
        await (0, recordService_1.updateRecordStatus)(record.id, 'dirty', '导入时发现脏数据');
        return { recordId: record.id, isDuplicate: false, isDirty: true };
    }
    return { recordId: record.id, isDuplicate: false, isDirty: false };
}
async function updateExistingRecords(requestId, filePath, source) {
    const results = {
        total: 0,
        success: 0,
        dirty: 0,
        duplicate: 0,
        recordIds: []
    };
    const allExistingRecords = await getAllRecordsForCheck();
    const rows = [];
    await new Promise((resolve, reject) => {
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            rows.push(row);
        })
            .on('end', () => resolve())
            .on('error', reject);
    });
    let lineNumber = 0;
    const processPromises = [];
    for (const row of rows) {
        lineNumber++;
        results.total++;
        const promise = (async () => {
            try {
                const data = {
                    material_id: String(row.material_id || row['素材ID'] || ''),
                    material_name: String(row.material_name || row['素材名称'] || ''),
                    platform: String(row.platform || row['平台'] || ''),
                    record_date: String(row.record_date || row['日期'] || ''),
                    impressions: row.impressions !== undefined ? Number(row.impressions) :
                        row['曝光量'] !== undefined ? Number(row['曝光量']) : undefined,
                    clicks: row.clicks !== undefined ? Number(row.clicks) :
                        row['点击量'] !== undefined ? Number(row['点击量']) : undefined,
                    cost: row.cost !== undefined ? Number(row.cost) :
                        row['花费'] !== undefined ? Number(row['花费']) : undefined,
                    audit_status: String(row.audit_status || row['审核状态'] || ''),
                    audit_reason: String(row.audit_reason || row['审核原因'] || '')
                };
                const existing = await (0, recordService_1.findExistingRecord)(data.material_id, data.platform, data.record_date, source);
                if (existing) {
                    await (0, recordService_1.updateRecord)(existing.id, data, `幂等更新 (请求ID: ${requestId})`);
                    results.recordIds.push(existing.id);
                    results.duplicate++;
                    const dirtyResults = (0, dirtyRecordService_1.checkAllDirty)(data, source, allExistingRecords);
                    if (dirtyResults.length > 0) {
                        const { run } = await Promise.resolve().then(() => __importStar(require('../db/database')));
                        await run('DELETE FROM dirty_records WHERE record_id = ?', [existing.id]);
                        await (0, dirtyRecordService_1.saveDirtyRecords)(existing.id, dirtyResults);
                        await (0, recordService_1.updateRecordStatus)(existing.id, 'dirty', '更新后发现脏数据');
                        results.dirty++;
                    }
                    else {
                        results.success++;
                    }
                }
                else {
                    const processed = await processRow(row, source, lineNumber, requestId, allExistingRecords);
                    results.recordIds.push(processed.recordId);
                    if (processed.isDirty)
                        results.dirty++;
                    else
                        results.success++;
                }
            }
            catch (error) {
                console.error(`第 ${lineNumber} 行处理失败:`, error.message);
            }
        })();
        processPromises.push(promise);
    }
    await Promise.all(processPromises);
    return results;
}
async function importSupplement(data, requestId) {
    const reqId = requestId || (0, uuid_1.v4)();
    const allExistingRecords = await getAllRecordsForCheck();
    return processRow(data, 'supplement', 0, reqId, allExistingRecords, '手动补录');
}
//# sourceMappingURL=importService.js.map