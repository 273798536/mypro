"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataImportService = void 0;
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const types_1 = require("../types");
class DataImportService {
    constructor(dbService) {
        this.dbService = dbService;
    }
    validateRequiredFields(data, requiredFields) {
        for (const field of requiredFields) {
            if (!data[field] || String(data[field]).trim() === '') {
                return `缺少必填字段: ${field}`;
            }
        }
        return null;
    }
    validateDate(dateStr) {
        if (!dateStr)
            return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    }
    async importInspectionRecordsFromCSV(filePath, importedBy) {
        return this.importFromCSV(filePath, types_1.ImportSource.INSPECTION, importedBy, ['recordNo', 'deviceCode', 'inspector', 'inspectionDate', 'conclusion'], this.validateAndCreateInspectionRecord.bind(this));
    }
    async validateAndCreateInspectionRecord(data, _rowNum, createdBy) {
        const device = await this.dbService.findDeviceByCode(data.deviceCode);
        if (!device) {
            throw new Error(`设备不存在: ${data.deviceCode}`);
        }
        const inspectionDate = this.validateDate(data.inspectionDate);
        if (!inspectionDate) {
            throw new Error(`无效的巡检日期: ${data.inspectionDate}`);
        }
        const inspectionItems = {};
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('item_')) {
                inspectionItems[key.replace('item_', '')] = value;
            }
        }
        return this.dbService.createInspectionRecord({
            recordNo: data.recordNo,
            deviceId: device.id,
            deviceCode: data.deviceCode,
            inspector: data.inspector,
            inspectionDate,
            inspectionItems,
            conclusion: data.conclusion,
            remarks: data.remarks || '',
            status: types_1.RecordStatus.DRAFT,
            createdBy
        });
    }
    async importCalibrationCertificatesFromCSV(filePath, importedBy) {
        return this.importFromCSV(filePath, types_1.ImportSource.CALIBRATION, importedBy, ['certificateNo', 'deviceCode', 'calibrationAgency', 'calibrationDate', 'expiryDate', 'conclusion'], this.validateAndCreateCalibrationCertificate.bind(this));
    }
    async validateAndCreateCalibrationCertificate(data, _rowNum, createdBy) {
        const device = await this.dbService.findDeviceByCode(data.deviceCode);
        if (!device) {
            throw new Error(`设备不存在: ${data.deviceCode}`);
        }
        const calibrationDate = this.validateDate(data.calibrationDate);
        if (!calibrationDate) {
            throw new Error(`无效的校准日期: ${data.calibrationDate}`);
        }
        const expiryDate = this.validateDate(data.expiryDate);
        if (!expiryDate) {
            throw new Error(`无效的过期日期: ${data.expiryDate}`);
        }
        if (!['pass', 'fail', 'conditional'].includes(data.conclusion)) {
            throw new Error(`结论必须是 pass、fail 或 conditional: ${data.conclusion}`);
        }
        const calibrationItems = data.calibrationItems
            ? data.calibrationItems.split('|').map((s) => s.trim())
            : [];
        return this.dbService.createCalibrationCertificate({
            certificateNo: data.certificateNo,
            deviceId: device.id,
            deviceCode: data.deviceCode,
            calibrationAgency: data.calibrationAgency,
            calibrationDate,
            expiryDate,
            calibrationItems,
            conclusion: data.conclusion,
            fileUrl: data.fileUrl || '',
            status: types_1.RecordStatus.DRAFT,
            createdBy
        });
    }
    async importMaintenanceQuotesFromCSV(filePath, importedBy) {
        return this.importFromCSV(filePath, types_1.ImportSource.MAINTENANCE_QUOTE, importedBy, ['quoteNo', 'deviceCode', 'vendor', 'quoteDate', 'estimatedCost'], this.validateAndCreateMaintenanceQuote.bind(this));
    }
    async validateAndCreateMaintenanceQuote(data, _rowNum, createdBy) {
        const device = await this.dbService.findDeviceByCode(data.deviceCode);
        if (!device) {
            throw new Error(`设备不存在: ${data.deviceCode}`);
        }
        const quoteDate = this.validateDate(data.quoteDate);
        if (!quoteDate) {
            throw new Error(`无效的报价日期: ${data.quoteDate}`);
        }
        const estimatedCost = parseFloat(data.estimatedCost);
        if (isNaN(estimatedCost) || estimatedCost < 0) {
            throw new Error(`无效的预估费用: ${data.estimatedCost}`);
        }
        const maintenanceItems = data.maintenanceItems
            ? data.maintenanceItems.split('|').map((s) => s.trim())
            : [];
        return this.dbService.createMaintenanceQuote({
            quoteNo: data.quoteNo,
            deviceId: device.id,
            deviceCode: data.deviceCode,
            vendor: data.vendor,
            quoteDate,
            estimatedCost,
            maintenanceItems,
            status: types_1.RecordStatus.DRAFT,
            approvalStatus: 'pending',
            createdBy
        });
    }
    async importSecondaryConfirmsFromCSV(filePath, importedBy) {
        return this.importFromCSV(filePath, types_1.ImportSource.SECONDARY_CONFIRM, importedBy, ['confirmNo', 'relatedRecordType', 'relatedRecordId', 'deviceCode', 'confirmer', 'confirmDate', 'confirmContent'], this.validateAndCreateSecondaryConfirm.bind(this));
    }
    async validateAndCreateSecondaryConfirm(data, _rowNum, createdBy) {
        const device = await this.dbService.findDeviceByCode(data.deviceCode);
        if (!device) {
            throw new Error(`设备不存在: ${data.deviceCode}`);
        }
        const confirmDate = this.validateDate(data.confirmDate);
        if (!confirmDate) {
            throw new Error(`无效的确认日期: ${data.confirmDate}`);
        }
        const validTypes = ['inspection', 'calibration', 'maintenance_quote', 'secondary_confirm'];
        if (!validTypes.includes(data.relatedRecordType)) {
            throw new Error(`关联记录类型无效: ${data.relatedRecordType}`);
        }
        return this.dbService.createSecondaryConfirm({
            confirmNo: data.confirmNo,
            relatedRecordType: data.relatedRecordType,
            relatedRecordId: data.relatedRecordId,
            deviceId: device.id,
            deviceCode: data.deviceCode,
            confirmer: data.confirmer,
            confirmDate,
            confirmContent: data.confirmContent,
            status: types_1.RecordStatus.DRAFT,
            createdBy
        });
    }
    async importFromCSV(filePath, source, importedBy, requiredFields, createRecord) {
        const rawRows = [];
        const results = [];
        const errors = [];
        return new Promise((resolve, reject) => {
            fs_1.default.createReadStream(filePath)
                .pipe((0, csv_parser_1.default)())
                .on('data', (data) => {
                rawRows.push({
                    rowNum: rawRows.length + 1,
                    data: { ...data }
                });
            })
                .on('end', async () => {
                try {
                    for (const { rowNum, data } of rawRows) {
                        try {
                            const fieldError = this.validateRequiredFields(data, requiredFields);
                            if (fieldError) {
                                throw new Error(fieldError);
                            }
                            const record = await createRecord(data, rowNum, importedBy);
                            results.push(record);
                        }
                        catch (error) {
                            errors.push({
                                row: rowNum,
                                error: error.message,
                                data
                            });
                            await this.dbService.createImportFailure(source, rowNum, JSON.stringify(data), error.message, importedBy);
                        }
                    }
                    resolve({
                        success: errors.length === 0,
                        total: rawRows.length,
                        imported: results.length,
                        failed: errors.length,
                        records: results,
                        errors
                    });
                }
                catch (error) {
                    reject(error);
                }
            })
                .on('error', (error) => {
                reject(error);
            });
        });
    }
}
exports.DataImportService = DataImportService;
//# sourceMappingURL=index.js.map