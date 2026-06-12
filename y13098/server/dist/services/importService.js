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
exports.importFromExcel = importFromExcel;
exports.importFromCSV = importFromCSV;
const XLSX = __importStar(require("xlsx"));
const recordService_1 = require("./recordService");
const materialService_1 = require("./materialService");
const utils_1 = require("@shared/utils");
async function importFromExcel(buffer, userId) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    const result = {
        success: 0,
        failed: 0,
        errors: [],
        importedIds: []
    };
    for (let i = 0; i < jsonData.length; i++) {
        try {
            const row = jsonData[i];
            if (!row['航线走廊'] || !row['记录日期'] || !row['标题']) {
                throw new Error(`第${i + 1}行缺少必要字段`);
            }
            const recordType = row['记录类型'] === '正常记录' ? 'normal' :
                row['记录类型'] === '异常记录' ? 'abnormal' :
                    row['记录类型'] === '临时说明' ? 'temporary' : 'normal';
            const status = row['状态'] === '待确认' ? 'pending' :
                row['状态'] === '已确认' ? 'confirmed' :
                    row['状态'] === '已驳回' ? 'rejected' :
                        row['状态'] === '已修改' ? 'modified' : 'pending';
            const record = await (0, recordService_1.createRecord)({
                corridorId: row['航线走廊'],
                recordDate: String(row['记录日期']),
                recordType,
                title: String(row['标题']),
                description: String(row['描述'] || ''),
                status,
                createdBy: userId
            }, userId);
            if (row['照片路径'] || row['附件路径']) {
                const fileUrl = row['照片路径'] || row['附件路径'];
                const fileName = row['文件名'] || `import_${(0, utils_1.generateId)()}`;
                await (0, materialService_1.createMaterial)({
                    recordId: record.id,
                    materialType: row['照片路径'] ? 'photo' : 'document',
                    fileName,
                    fileUrl,
                    fileSize: row['文件大小'],
                    remark: row['备注'],
                    isCaliberModified: false,
                    createdBy: userId
                }, userId);
            }
            result.success++;
            result.importedIds.push(record.id);
        }
        catch (error) {
            result.failed++;
            result.errors.push(error.message || `第${i + 1}行导入失败`);
        }
    }
    return result;
}
async function importFromCSV(content, userId) {
    const lines = content.split('\n');
    if (lines.length < 2) {
        return { success: 0, failed: 0, errors: ['CSV文件为空或格式不正确'], importedIds: [] };
    }
    const headers = lines[0].split(',').map(h => h.trim());
    const result = {
        success: 0,
        failed: 0,
        errors: [],
        importedIds: []
    };
    for (let i = 1; i < lines.length; i++) {
        try {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length < headers.length) {
                throw new Error(`第${i + 1}行字段数量不匹配`);
            }
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx];
            });
            if (!row['corridorId'] || !row['recordDate'] || !row['title']) {
                throw new Error(`第${i + 1}行缺少必要字段`);
            }
            const record = await (0, recordService_1.createRecord)({
                corridorId: row['corridorId'],
                recordDate: row['recordDate'],
                recordType: row['recordType'] || 'normal',
                title: row['title'],
                description: row['description'] || '',
                status: row['status'] || 'pending',
                createdBy: userId
            }, userId);
            result.success++;
            result.importedIds.push(record.id);
        }
        catch (error) {
            result.failed++;
            result.errors.push(error.message || `第${i + 1}行导入失败`);
        }
    }
    return result;
}
