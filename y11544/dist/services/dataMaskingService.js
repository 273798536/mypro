"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataMaskingService = exports.DataMaskingService = void 0;
const SENSITIVE_FIELDS = {
    operator: [],
    reviewer: [],
    manager: [],
    auditor: [],
    admin: []
};
const MASKED_FIELDS = {
    operator: ['originalName'],
    reviewer: [],
    manager: [],
    auditor: [],
    admin: []
};
class DataMaskingService {
    maskEmail(email) {
        if (!email || !email.includes('@'))
            return email;
        const [name, domain] = email.split('@');
        return name.length > 2
            ? name[0] + '*'.repeat(name.length - 2) + name[name.length - 1] + '@' + domain
            : '*'.repeat(name.length) + '@' + domain;
    }
    maskPhone(phone) {
        if (!phone || phone.length < 7)
            return phone;
        return phone.slice(0, 3) + '*'.repeat(phone.length - 7) + phone.slice(-4);
    }
    maskName(name) {
        if (!name || name.length <= 1)
            return name;
        return name[0] + '*'.repeat(name.length - 1);
    }
    maskValue(value, fieldType) {
        if (!value)
            return value;
        switch (fieldType) {
            case 'email':
                return this.maskEmail(value);
            case 'phone':
                return this.maskPhone(value);
            case 'name':
                return this.maskName(value);
            default:
                return this.maskName(value);
        }
    }
    maskExportData(data, role) {
        const result = { ...data };
        const maskedFields = MASKED_FIELDS[role] || [];
        for (const field of maskedFields) {
            if (result[field] !== undefined) {
                result[field] = this.maskValue(String(result[field]), field);
            }
        }
        return result;
    }
    maskMaterialDetail(data, role) {
        return this.maskExportData(data, role);
    }
    canAccessField(role, field) {
        const sensitiveFields = SENSITIVE_FIELDS[role] || [];
        return !sensitiveFields.includes(field);
    }
    filterByRole(data, role) {
        const result = {};
        const sensitiveFields = SENSITIVE_FIELDS[role] || [];
        for (const [key, value] of Object.entries(data)) {
            if (!sensitiveFields.includes(key)) {
                result[key] = value;
            }
        }
        return result;
    }
}
exports.DataMaskingService = DataMaskingService;
exports.dataMaskingService = new DataMaskingService();
//# sourceMappingURL=dataMaskingService.js.map