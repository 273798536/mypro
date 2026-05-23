"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCsvFile = importCsvFile;
exports.getDataSourceName = getDataSourceName;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const types_1 = require("../types");
const database_1 = require("./database");
const detector_1 = require("./detector");
function parseNumber(value) {
    if (!value)
        return 0;
    const cleaned = value.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
}
function transformImplantBatch(raw, sourceLine, sourceFile, importedBy) {
    return {
        id: (0, database_1.generateId)(),
        source: types_1.DataSource.IMPLANT_BATCH,
        sourceLine,
        sourceFile,
        batchNumber: raw['批号'] || raw['batchNumber'] || '',
        materialName: raw['材料名称'] || raw['materialName'] || raw['名称'] || '',
        materialType: raw['类型'] || raw['materialType'] || '种植体',
        quantity: parseNumber(raw['数量'] || raw['quantity']),
        unitPrice: parseNumber(raw['单价'] || raw['unitPrice']),
        totalAmount: parseNumber(raw['金额'] || raw['totalAmount'] || raw['总价']),
        supplier: raw['供应商'] || raw['supplier'] || '',
        importDate: (0, database_1.getCurrentTime)(),
        importedBy,
        status: types_1.RecordStatus.PENDING,
        createdAt: (0, database_1.getCurrentTime)(),
        updatedAt: (0, database_1.getCurrentTime)(),
        rawData: raw
    };
}
function transformAppointment(raw, sourceLine, sourceFile, importedBy) {
    return {
        id: (0, database_1.generateId)(),
        source: types_1.DataSource.APPOINTMENT,
        sourceLine,
        sourceFile,
        batchNumber: raw['种植体批号'] || raw['batchNumber'] || raw['批号'] || '',
        materialName: raw['材料名称'] || raw['materialName'] || '种植体',
        materialType: raw['类型'] || raw['materialType'] || '种植体',
        quantity: parseNumber(raw['数量'] || raw['quantity'] || '1'),
        unitPrice: parseNumber(raw['单价'] || raw['unitPrice']),
        totalAmount: parseNumber(raw['金额'] || raw['totalAmount']),
        supplier: raw['供应商'] || raw['supplier'] || '',
        patientId: raw['患者ID'] || raw['patientId'] || '',
        patientName: raw['患者姓名'] || raw['patientName'] || raw['姓名'] || '',
        appointmentDate: raw['预约日期'] || raw['appointmentDate'] || raw['日期'] || '',
        importDate: (0, database_1.getCurrentTime)(),
        importedBy,
        status: types_1.RecordStatus.PENDING,
        createdAt: (0, database_1.getCurrentTime)(),
        updatedAt: (0, database_1.getCurrentTime)(),
        rawData: raw
    };
}
function transformSupplierInvoice(raw, sourceLine, sourceFile, importedBy) {
    return {
        id: (0, database_1.generateId)(),
        source: types_1.DataSource.SUPPLIER_INVOICE,
        sourceLine,
        sourceFile,
        batchNumber: raw['批号'] || raw['batchNumber'] || '',
        materialName: raw['材料名称'] || raw['materialName'] || raw['货品名称'] || '',
        materialType: raw['类型'] || raw['materialType'] || '',
        quantity: parseNumber(raw['数量'] || raw['quantity']),
        unitPrice: parseNumber(raw['单价'] || raw['unitPrice']),
        totalAmount: parseNumber(raw['金额'] || raw['totalAmount'] || raw['总价']),
        supplier: raw['供应商'] || raw['supplier'] || raw['供货方'] || '',
        invoiceNumber: raw['发票号'] || raw['invoiceNumber'] || '',
        importDate: (0, database_1.getCurrentTime)(),
        importedBy,
        status: types_1.RecordStatus.PENDING,
        createdAt: (0, database_1.getCurrentTime)(),
        updatedAt: (0, database_1.getCurrentTime)(),
        rawData: raw
    };
}
function transformManualEntry(raw, sourceLine, sourceFile, importedBy) {
    return {
        id: (0, database_1.generateId)(),
        source: types_1.DataSource.MANUAL_ENTRY,
        sourceLine,
        sourceFile,
        batchNumber: raw['批号'] || raw['batchNumber'] || '',
        materialName: raw['材料名称'] || raw['materialName'] || '',
        materialType: raw['类型'] || raw['materialType'] || '',
        quantity: parseNumber(raw['数量'] || raw['quantity']),
        unitPrice: parseNumber(raw['单价'] || raw['unitPrice']),
        totalAmount: parseNumber(raw['金额'] || raw['totalAmount']),
        supplier: raw['供应商'] || raw['supplier'] || '',
        patientId: raw['患者ID'] || raw['patientId'] || '',
        patientName: raw['患者姓名'] || raw['patientName'] || '',
        appointmentDate: raw['日期'] || raw['appointmentDate'] || '',
        importDate: (0, database_1.getCurrentTime)(),
        importedBy,
        status: types_1.RecordStatus.PENDING,
        createdAt: (0, database_1.getCurrentTime)(),
        updatedAt: (0, database_1.getCurrentTime)(),
        rawData: raw
    };
}
function getTransformer(source) {
    switch (source) {
        case types_1.DataSource.IMPLANT_BATCH:
            return transformImplantBatch;
        case types_1.DataSource.APPOINTMENT:
            return transformAppointment;
        case types_1.DataSource.SUPPLIER_INVOICE:
            return transformSupplierInvoice;
        case types_1.DataSource.MANUAL_ENTRY:
            return transformManualEntry;
        default:
            return transformManualEntry;
    }
}
async function importCsvFile(filePath, source, importedBy, db) {
    return new Promise((resolve, reject) => {
        const results = [];
        const errors = [];
        let lineNumber = 1;
        let dirtyCount = 0;
        if (!fs_1.default.existsSync(filePath)) {
            reject(new Error(`文件不存在: ${filePath}`));
            return;
        }
        const transformer = getTransformer(source);
        const fileName = path_1.default.basename(filePath);
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (raw) => {
            lineNumber++;
            try {
                const record = transformer(raw, lineNumber, fileName, importedBy);
                results.push(record);
            }
            catch (e) {
                errors.push(`第${lineNumber}行: ${e.message}`);
            }
        })
            .on('end', () => {
            const importedRecords = [];
            for (const record of results) {
                (0, database_1.addRecord)(db, record);
                const dirtyRecords = (0, detector_1.detectAllDirty)(record, db);
                if (dirtyRecords.length > 0) {
                    record.status = types_1.RecordStatus.DIRTY;
                    dirtyCount++;
                    for (const dirty of dirtyRecords) {
                        (0, database_1.addDirtyRecord)(db, dirty);
                    }
                }
                else {
                    record.status = types_1.RecordStatus.IMPORTED;
                }
                record.updatedAt = (0, database_1.getCurrentTime)();
                importedRecords.push(record);
            }
            resolve({
                total: results.length,
                success: results.length - errors.length,
                failed: errors.length,
                dirty: dirtyCount,
                records: importedRecords,
                errors
            });
        })
            .on('error', (err) => {
            reject(err);
        });
    });
}
function getDataSourceName(source) {
    const names = {
        [types_1.DataSource.IMPLANT_BATCH]: '种植体批号',
        [types_1.DataSource.APPOINTMENT]: '预约记录',
        [types_1.DataSource.SUPPLIER_INVOICE]: '供应商发票',
        [types_1.DataSource.MANUAL_ENTRY]: '临时补录单'
    };
    return names[source] ?? source;
}
//# sourceMappingURL=importer.js.map