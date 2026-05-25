"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataValidator = void 0;
class DataValidator {
    constructor(dbService) {
        this.dbService = dbService;
    }
    validateRequired(data, fields) {
        const errors = [];
        for (const field of fields) {
            if (!data[field] || String(data[field]).trim() === '') {
                errors.push({
                    field,
                    message: `字段 '${field}' 为必填项`
                });
            }
        }
        return errors;
    }
    validateDate(dateStr, fieldName) {
        if (!dateStr) {
            return { field: fieldName, message: `字段 '${fieldName}' 为必填项` };
        }
        const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
        if (isNaN(date.getTime())) {
            return { field: fieldName, message: `字段 '${fieldName}' 日期格式无效: ${dateStr}` };
        }
        return null;
    }
    validateDateRange(startDate, endDate, startField, endField) {
        const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
        const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
        if (start >= end) {
            return {
                field: endField,
                message: `'${endField}' 必须晚于 '${startField}'`
            };
        }
        return null;
    }
    validateEnum(value, allowedValues, fieldName) {
        if (!allowedValues.includes(value)) {
            return {
                field: fieldName,
                message: `字段 '${fieldName}' 值 '${value}' 无效，允许值: ${allowedValues.join(', ')}`
            };
        }
        return null;
    }
    validateNumber(value, fieldName, min, max) {
        const num = parseFloat(value);
        if (isNaN(num)) {
            return { field: fieldName, message: `字段 '${fieldName}' 必须是有效数字` };
        }
        if (min !== undefined && num < min) {
            return { field: fieldName, message: `字段 '${fieldName}' 不能小于 ${min}` };
        }
        if (max !== undefined && num > max) {
            return { field: fieldName, message: `字段 '${fieldName}' 不能大于 ${max}` };
        }
        return null;
    }
    validateStringLength(value, fieldName, min = 0, max) {
        const str = String(value || '');
        if (str.length < min) {
            return { field: fieldName, message: `字段 '${fieldName}' 长度不能小于 ${min}` };
        }
        if (max !== undefined && str.length > max) {
            return { field: fieldName, message: `字段 '${fieldName}' 长度不能大于 ${max}` };
        }
        return null;
    }
    async validateDeviceExists(deviceCode) {
        if (!deviceCode || String(deviceCode).trim() === '') {
            return {
                valid: false,
                error: { field: 'deviceCode', message: '设备编号为必填项' }
            };
        }
        const device = await this.dbService.findDeviceByCode(deviceCode);
        if (!device) {
            return {
                valid: false,
                error: { field: 'deviceCode', message: `设备不存在: ${deviceCode}` }
            };
        }
        return { valid: true, deviceId: device.id };
    }
    async validateInspectionRecord(data) {
        const errors = [];
        errors.push(...this.validateRequired(data, ['recordNo', 'deviceCode', 'inspector', 'inspectionDate', 'conclusion']));
        const dateError = this.validateDate(data.inspectionDate, 'inspectionDate');
        if (dateError)
            errors.push(dateError);
        const deviceCheck = await this.validateDeviceExists(data.deviceCode);
        if (!deviceCheck.valid && deviceCheck.error) {
            errors.push(deviceCheck.error);
        }
        const stringErrors = [
            this.validateStringLength(data.recordNo, 'recordNo', 1, 50),
            this.validateStringLength(data.inspector, 'inspector', 1, 50),
            this.validateStringLength(data.conclusion, 'conclusion', 1, 500)
        ].filter((e) => e !== null);
        errors.push(...stringErrors);
        return {
            valid: errors.length === 0,
            errors,
            data: deviceCheck.deviceId ? { ...data, deviceId: deviceCheck.deviceId } : data
        };
    }
    async validateCalibrationCertificate(data) {
        const errors = [];
        errors.push(...this.validateRequired(data, ['certificateNo', 'deviceCode', 'calibrationAgency', 'calibrationDate', 'expiryDate', 'conclusion']));
        const calDateError = this.validateDate(data.calibrationDate, 'calibrationDate');
        if (calDateError)
            errors.push(calDateError);
        const expDateError = this.validateDate(data.expiryDate, 'expiryDate');
        if (expDateError)
            errors.push(expDateError);
        if (data.calibrationDate && data.expiryDate) {
            const rangeError = this.validateDateRange(data.calibrationDate, data.expiryDate, 'calibrationDate', 'expiryDate');
            if (rangeError)
                errors.push(rangeError);
        }
        const conclusionError = this.validateEnum(data.conclusion, ['pass', 'fail', 'conditional'], 'conclusion');
        if (conclusionError)
            errors.push(conclusionError);
        const deviceCheck = await this.validateDeviceExists(data.deviceCode);
        if (!deviceCheck.valid && deviceCheck.error) {
            errors.push(deviceCheck.error);
        }
        return {
            valid: errors.length === 0,
            errors,
            data: deviceCheck.deviceId ? { ...data, deviceId: deviceCheck.deviceId } : data
        };
    }
    async validateMaintenanceQuote(data) {
        const errors = [];
        errors.push(...this.validateRequired(data, ['quoteNo', 'deviceCode', 'vendor', 'quoteDate', 'estimatedCost']));
        const dateError = this.validateDate(data.quoteDate, 'quoteDate');
        if (dateError)
            errors.push(dateError);
        const costError = this.validateNumber(data.estimatedCost, 'estimatedCost', 0);
        if (costError)
            errors.push(costError);
        const deviceCheck = await this.validateDeviceExists(data.deviceCode);
        if (!deviceCheck.valid && deviceCheck.error) {
            errors.push(deviceCheck.error);
        }
        if (data.approvalStatus) {
            const approvalError = this.validateEnum(data.approvalStatus, ['pending', 'approved', 'rejected'], 'approvalStatus');
            if (approvalError)
                errors.push(approvalError);
        }
        return {
            valid: errors.length === 0,
            errors,
            data: deviceCheck.deviceId ? { ...data, deviceId: deviceCheck.deviceId } : data
        };
    }
    async validateSecondaryConfirm(data) {
        const errors = [];
        errors.push(...this.validateRequired(data, ['confirmNo', 'relatedRecordType', 'relatedRecordId', 'deviceCode', 'confirmer', 'confirmDate', 'confirmContent']));
        const dateError = this.validateDate(data.confirmDate, 'confirmDate');
        if (dateError)
            errors.push(dateError);
        const recordTypeError = this.validateEnum(data.relatedRecordType, ['inspection', 'calibration', 'maintenance_quote', 'secondary_confirm'], 'relatedRecordType');
        if (recordTypeError)
            errors.push(recordTypeError);
        const deviceCheck = await this.validateDeviceExists(data.deviceCode);
        if (!deviceCheck.valid && deviceCheck.error) {
            errors.push(deviceCheck.error);
        }
        return {
            valid: errors.length === 0,
            errors,
            data: deviceCheck.deviceId ? { ...data, deviceId: deviceCheck.deviceId } : data
        };
    }
    formatValidationErrors(errors) {
        return errors.map(e => `[${e.field}] ${e.message}`).join('; ');
    }
}
exports.DataValidator = DataValidator;
//# sourceMappingURL=validator.js.map