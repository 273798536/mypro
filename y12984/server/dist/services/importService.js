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
exports.importFile = importFile;
const fs_1 = __importDefault(require("fs"));
const sync_1 = require("csv-parse/sync");
const XLSX = __importStar(require("xlsx"));
const runService_1 = require("./runService");
const recordService_1 = require("./recordService");
const anomalyService_1 = require("./anomalyService");
function importFile(filePath, originalName) {
    const ext = originalName.split('.').pop()?.toLowerCase();
    let rawRecords = [];
    if (ext === 'csv') {
        rawRecords = parseCsv(filePath);
    }
    else if (ext === 'xlsx' || ext === 'xls') {
        rawRecords = parseExcel(filePath);
    }
    else {
        throw new Error('不支持的文件格式，仅支持 CSV 和 Excel');
    }
    if (rawRecords.length === 0) {
        throw new Error('文件中没有有效数据');
    }
    const run = (0, runService_1.createRun)(originalName);
    for (const raw of rawRecords) {
        const originalSize = Number(raw.original_size_mb) || 0;
        const compressedSize = Number(raw.compressed_size_mb) || 0;
        const compressionRatio = raw.compression_ratio !== undefined
            ? Number(raw.compression_ratio)
            : originalSize > 0
                ? compressedSize / originalSize
                : 0;
        const recordId = (0, recordService_1.insertRecord)({
            run_id: run.id,
            report_name: raw.report_name || '未命名报表',
            table_name: raw.table_name || 'unknown_table',
            column_count: Number(raw.column_count) || 0,
            row_count: Number(raw.row_count) || 0,
            original_size_mb: originalSize,
            compressed_size_mb: compressedSize,
            compression_ratio: compressionRatio,
            source_system: raw.source_system || '',
            owner: raw.owner || '',
            backup_exists: typeof raw.backup_exists === 'boolean'
                ? raw.backup_exists
                : ['是', 'true', '1', 'yes', 'Y'].includes(String(raw.backup_exists).toLowerCase())
        });
        (0, anomalyService_1.detectAnomaliesForRecord)(recordId, {
            backup_exists: typeof raw.backup_exists === 'boolean'
                ? raw.backup_exists
                : ['是', 'true', '1', 'yes', 'Y'].includes(String(raw.backup_exists).toLowerCase()),
            compression_ratio: compressionRatio,
            owner: raw.owner || '',
            source_system: raw.source_system || '',
            report_name: raw.report_name || '未命名报表'
        });
    }
    (0, runService_1.updateRunStats)(run.id);
    try {
        fs_1.default.unlinkSync(filePath);
    }
    catch { }
    return { runId: run.id, recordCount: rawRecords.length };
}
function parseCsv(filePath) {
    const content = fs_1.default.readFileSync(filePath, 'utf-8');
    const rows = (0, sync_1.parse)(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });
    return rows.map((row) => normalizeRow(row));
}
function parseExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    return rows.map((row) => normalizeRow(row));
}
function normalizeRow(row) {
    const get = (keys) => {
        for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && row[k] !== '')
                return row[k];
        }
        return undefined;
    };
    return {
        report_name: String(get(['report_name', '报表名称', '报表名', 'name']) || ''),
        table_name: String(get(['table_name', '表名', '表名称', 'table']) || ''),
        column_count: Number(get(['column_count', '列数', '字段数']) || 0),
        row_count: Number(get(['row_count', '行数', '记录数']) || 0),
        original_size_mb: Number(get(['original_size_mb', '原始大小', '原始大小MB', 'size']) || 0),
        compressed_size_mb: Number(get(['compressed_size_mb', '压缩后大小', '压缩大小', 'compressed']) || 0),
        compression_ratio: Number(get(['compression_ratio', '压缩率', 'ratio']) || NaN),
        source_system: String(get(['source_system', '来源系统', '系统', 'source']) || ''),
        owner: String(get(['owner', '负责人', 'Owner', '所属人']) || ''),
        backup_exists: get(['backup_exists', '是否备份', '备份', 'has_backup'])
    };
}
