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
exports.exportToExcel = exportToExcel;
exports.exportToCSV = exportToCSV;
exports.exportRecordToPDF = exportRecordToPDF;
exports.saveScreenshotExport = saveScreenshotExport;
exports.getScreenshotExports = getScreenshotExports;
const database_1 = require("../database");
const utils_1 = require("@shared/utils");
const recordService_1 = require("./recordService");
const pdfkit_1 = __importDefault(require("pdfkit"));
const XLSX = __importStar(require("xlsx"));
const json2csv_1 = require("json2csv");
async function exportToExcel(filter) {
    const { data } = await (0, recordService_1.getRecords)(filter, 1, 10000);
    const exportData = data.map(record => ({
        '记录编号': record.id,
        '航线走廊': record.corridorId,
        '记录日期': record.recordDate,
        '记录类型': record.recordType === 'normal' ? '正常记录' :
            record.recordType === 'abnormal' ? '异常记录' : '临时说明',
        '标题': record.title,
        '描述': record.description,
        '状态': record.status === 'pending' ? '待确认' :
            record.status === 'confirmed' ? '已确认' :
                record.status === 'rejected' ? '已驳回' : '已修改',
        '对象重叠': record.isOverlapping ? '是' : '否',
        '确认人': record.confirmedBy || '',
        '确认时间': record.confirmedAt || '',
        '创建人': record.createdBy,
        '创建时间': record.createdAt,
        '更新时间': record.updatedAt
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '巡检记录');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
}
async function exportToCSV(filter) {
    const { data } = await (0, recordService_1.getRecords)(filter, 1, 10000);
    const exportData = data.map(record => ({
        id: record.id,
        corridorId: record.corridorId,
        recordDate: record.recordDate,
        recordType: record.recordType,
        title: record.title,
        description: record.description,
        status: record.status,
        isOverlapping: record.isOverlapping,
        confirmedBy: record.confirmedBy || '',
        confirmedAt: record.confirmedAt || '',
        createdBy: record.createdBy,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
    }));
    const parser = new json2csv_1.Parser();
    return parser.parse(exportData);
}
async function exportRecordToPDF(recordId, annotation) {
    const details = await (0, recordService_1.getRecordDetails)(recordId);
    if (!details)
        throw new Error('Record not found');
    const { record, materials, notes, history } = details;
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.fontSize(18).text('低空航线走廊剖面讲解 - 巡检记录详情', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text('基本信息', { underline: true });
        doc.fontSize(12);
        doc.text(`记录编号: ${record.id}`);
        doc.text(`记录日期: ${record.recordDate}`);
        doc.text(`记录类型: ${record.recordType === 'normal' ? '正常记录' :
            record.recordType === 'abnormal' ? '异常记录' : '临时说明'}`);
        doc.text(`状态: ${record.status === 'pending' ? '待确认' :
            record.status === 'confirmed' ? '已确认' :
                record.status === 'rejected' ? '已驳回' : '已修改'}`);
        doc.text(`对象重叠: ${record.isOverlapping ? '是' : '否'}`);
        doc.text(`标题: ${record.title}`);
        doc.text(`描述: ${record.description}`);
        doc.moveDown();
        if (annotation) {
            doc.fontSize(14).text('标注说明', { underline: true });
            doc.fontSize(12).text(annotation);
            doc.moveDown();
        }
        if (materials.length > 0) {
            doc.fontSize(14).text('材料版本', { underline: true });
            doc.fontSize(12);
            materials.forEach((m) => {
                doc.text(`• v${m.version} ${m.materialType === 'photo' ? '巡检照片' :
                    m.materialType === 'document' ? '文档材料' :
                        m.materialType === 'note' ? '人工备注' : '截图说明'}: ${m.fileName}`);
                if (m.isCaliberModified) {
                    doc.text(`  ⚠️ 口径已修改: ${m.modifiedDescription || '无详细说明'}`);
                }
                if (m.remark) {
                    doc.text(`  备注: ${m.remark}`);
                }
                doc.text(`  上传时间: ${(0, utils_1.formatDate)(m.createdAt)} | 上传人: ${m.createdBy}`);
            });
            doc.moveDown();
        }
        if (notes.length > 0) {
            doc.fontSize(14).text('人工备注', { underline: true });
            doc.fontSize(12);
            notes.forEach((n) => {
                doc.text(`• ${n.content}`);
                doc.text(`  ${(0, utils_1.formatDate)(n.createdAt)} | ${n.createdBy}`);
            });
            doc.moveDown();
        }
        if (history.length > 0) {
            doc.fontSize(14).text('变更历史', { underline: true });
            doc.fontSize(12);
            history.forEach((h) => {
                const changeType = h.changeType === 'create' ? '创建记录' :
                    h.changeType === 'update' ? '更新内容' :
                        h.changeType === 'confirm' ? '人工确认' :
                            h.changeType === 'reject' ? '驳回记录' : '状态变更';
                doc.text(`• ${(0, utils_1.formatDate)(h.changedAt)} | ${changeType} | ${h.changedBy}`);
                if (h.remark) {
                    doc.text(`  ${h.remark}`);
                }
                if (h.oldValue && h.newValue) {
                    doc.text(`  ${h.oldValue} → ${h.newValue}`);
                }
            });
        }
        doc.end();
    });
}
async function saveScreenshotExport(data, userId) {
    const id = (0, utils_1.generateId)();
    const now = new Date().toISOString();
    await (0, database_1.runExecute)(`INSERT INTO screenshot_exports 
     (id, record_id, filter_criteria, image_url, annotation, remark, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.recordId || null, JSON.stringify(data.filterCriteria),
        data.imageUrl, data.annotation, data.remark, now, userId]);
    const row = await (0, database_1.runQuery)('SELECT * FROM screenshot_exports WHERE id = ?', [id]);
    if (!row[0])
        throw new Error('Failed to save screenshot export');
    return {
        id: row[0].id,
        recordId: row[0].record_id,
        filterCriteria: JSON.parse(row[0].filter_criteria),
        imageUrl: row[0].image_url,
        annotation: row[0].annotation,
        remark: row[0].remark,
        createdAt: row[0].created_at,
        createdBy: row[0].created_by
    };
}
async function getScreenshotExports(recordId) {
    let sql = 'SELECT * FROM screenshot_exports';
    const params = [];
    if (recordId) {
        sql += ' WHERE record_id = ?';
        params.push(recordId);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = await (0, database_1.runQuery)(sql, params);
    return rows.map((row) => ({
        id: row.id,
        recordId: row.record_id,
        filterCriteria: JSON.parse(row.filter_criteria),
        imageUrl: row.image_url,
        annotation: row.annotation,
        remark: row.remark,
        createdAt: row.created_at,
        createdBy: row.created_by
    }));
}
