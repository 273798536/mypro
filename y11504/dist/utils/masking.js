"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMasking = exports.maskString = exports.maskAddress = exports.maskName = exports.maskPhone = exports.SENSITIVE_FIELDS = void 0;
const enums_1 = require("../types/enums");
exports.SENSITIVE_FIELDS = {
    'customerPhone': enums_1.SensitiveFieldLevel.MASK,
    'customerName': enums_1.SensitiveFieldLevel.MASK,
    'customerAddress': enums_1.SensitiveFieldLevel.MASK,
    'productSn': enums_1.SensitiveFieldLevel.MASK,
    'engineerId': enums_1.SensitiveFieldLevel.MASK,
    'scannerId': enums_1.SensitiveFieldLevel.MASK,
    'uploaderId': enums_1.SensitiveFieldLevel.MASK,
};
const maskPhone = (phone) => {
    if (!phone || phone.length < 7)
        return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
};
exports.maskPhone = maskPhone;
const maskName = (name) => {
    if (!name || name.length <= 1)
        return name;
    if (name.length === 2)
        return name[0] + '*';
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
};
exports.maskName = maskName;
const maskAddress = (address) => {
    if (!address)
        return address;
    if (address.length <= 6)
        return address;
    return address.substring(0, 6) + '****';
};
exports.maskAddress = maskAddress;
const maskString = (str, visibleStart = 2, visibleEnd = 2) => {
    if (!str || str.length <= visibleStart + visibleEnd)
        return str;
    return str.substring(0, visibleStart) + '****' + str.substring(str.length - visibleEnd);
};
exports.maskString = maskString;
const applyMasking = (data, level) => {
    if (level === enums_1.SensitiveFieldLevel.NONE)
        return data;
    const result = JSON.parse(JSON.stringify(data));
    for (const [field, fieldLevel] of Object.entries(exports.SENSITIVE_FIELDS)) {
        if (fieldLevel === enums_1.SensitiveFieldLevel.NONE)
            continue;
        if (level === enums_1.SensitiveFieldLevel.MASK && fieldLevel !== enums_1.SensitiveFieldLevel.MASK)
            continue;
        const value = getNestedValue(result, field);
        if (value !== undefined && typeof value === 'string') {
            let maskedValue;
            if (field.includes('Phone') || field.includes('phone')) {
                maskedValue = (0, exports.maskPhone)(value);
            }
            else if (field.includes('Name') || field.includes('name')) {
                maskedValue = (0, exports.maskName)(value);
            }
            else if (field.includes('Address') || field.includes('address')) {
                maskedValue = (0, exports.maskAddress)(value);
            }
            else {
                maskedValue = (0, exports.maskString)(value);
            }
            setNestedValue(result, field, maskedValue);
        }
    }
    return result;
};
exports.applyMasking = applyMasking;
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
};
const setNestedValue = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (!current[key])
            current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
};
//# sourceMappingURL=masking.js.map