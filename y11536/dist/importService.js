"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sync_1 = require("csv-parse/sync");
const uuid_1 = require("uuid");
class ImportService {
    constructor(db) {
        this.db = db;
    }
    async importFromFile(filePath, sourceType, operator) {
        const batchId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const sourceFile = path_1.default.basename(filePath);
        const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
        const records = this.parseFile(fileContent, filePath);
        const result = {
            batchId,
            total: records.length,
            success: 0,
            failed: 0,
            failures: [],
            importedAt: now,
            sourceFile,
            sourceType,
        };
        for (let i = 0; i < records.length; i++) {
            const rawData = records[i];
            const lineNumber = i + 2;
            try {
                const parsedData = this.parseRawData(rawData, sourceType);
                this.validateParsedData(parsedData);
                const sourceEvidence = {
                    sourceFile,
                    sourceType,
                    originalLineNumber: lineNumber,
                    rawData,
                    parsedData,
                    importedAt: now,
                    importBatchId: batchId,
                };
                const { recordId, isNew, previousStatus } = await this.db.upsertRecord(parsedData, sourceEvidence);
                if (isNew) {
                    await this.db.updateRecordStatus(recordId, 'pending', operator, `首次导入 - 来源: ${sourceType}, 文件: ${sourceFile}, 行号: ${lineNumber}`);
                }
                else {
                    await this.db.updateRecordStatus(recordId, 'resubmitted', operator, `重复导入 - 来源: ${sourceType}, 文件: ${sourceFile}, 行号: ${lineNumber}`);
                }
                result.success++;
            }
            catch (error) {
                result.failed++;
                result.failures.push({
                    lineNumber,
                    rawData,
                    error: error.message || 'Unknown error',
                });
                await this.db.addImportFailure(batchId, sourceFile, sourceType, lineNumber, rawData, error.message || 'Unknown error');
            }
        }
        return result;
    }
    parseFile(content, filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        if (ext === '.csv') {
            return (0, sync_1.parse)(content, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });
        }
        throw new Error(`不支持的文件格式: ${ext}，仅支持 CSV 格式`);
    }
    parseRawData(raw, sourceType) {
        const getValue = (keys) => {
            for (const key of keys) {
                if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') {
                    return String(raw[key]).trim();
                }
            }
            return '';
        };
        const employeeId = getValue(['员工ID', 'employeeId', '工号', 'id']);
        const employeeName = getValue(['员工姓名', 'employeeName', '姓名', 'name']);
        const trackingNumber = getValue(['快递单号', 'trackingNumber', 'tracking', '快递号']);
        const courseId = getValue(['课程ID', 'courseId', '课程编号']);
        const courseName = getValue(['课程名称', 'courseName', '课程', 'course']);
        const attendDate = getValue(['签到日期', 'attendDate', '日期', 'date']);
        const signTime = getValue(['签到时间', 'signTime', '时间', 'time']) || undefined;
        return {
            employeeId,
            employeeName,
            trackingNumber,
            courseId,
            courseName,
            attendDate,
            signTime,
        };
    }
    validateParsedData(data) {
        const errors = [];
        if (!data.employeeId) {
            errors.push('员工ID不能为空');
        }
        if (!data.employeeName) {
            errors.push('员工姓名不能为空');
        }
        if (!data.trackingNumber) {
            errors.push('快递单号不能为空');
        }
        if (!data.courseId && !data.courseName) {
            errors.push('课程ID或课程名称至少有一个不能为空');
        }
        if (!data.attendDate) {
            errors.push('签到日期不能为空');
        }
        if (errors.length > 0) {
            throw new Error(`数据验证失败: ${errors.join('; ')}`);
        }
    }
}
exports.ImportService = ImportService;
