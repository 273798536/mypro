"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAppointment = checkAppointment;
exports.checkLocation = checkLocation;
exports.checkReview = checkReview;
exports.checkPriceAdjustment = checkPriceAdjustment;
exports.detectDuplicates = detectDuplicates;
exports.detectNameChanges = detectNameChanges;
exports.detectAmountConflicts = detectAmountConflicts;
exports.getDirtyTypeLabel = getDirtyTypeLabel;
exports.getSourceTypeLabel = getSourceTypeLabel;
const dayjs_1 = __importDefault(require("dayjs"));
function checkAppointment(record, rawRow, sourceFile) {
    const requiredFields = [
        'orderNo',
        'customerName',
        'phone',
        'address',
        'applianceType',
        'appointmentDate',
        'appointmentTime',
    ];
    const missingFields = requiredFields.filter((f) => !record[f]);
    if (missingFields.length > 0) {
        return {
            isValid: false,
            dirtyType: 'missing_field',
            description: `缺少必填字段: ${missingFields.join(', ')}`,
            missingFields,
        };
    }
    if (record.appointmentDate) {
        const date = (0, dayjs_1.default)(record.appointmentDate);
        if (!date.isValid()) {
            return {
                isValid: false,
                dirtyType: 'missing_field',
                description: '预约日期格式无效',
                missingFields: ['appointmentDate'],
                suggestedFix: { appointmentDate: (0, dayjs_1.default)().format('YYYY-MM-DD') },
            };
        }
    }
    if (record.phone && !/^1[3-9]\d{9}$/.test(record.phone)) {
        return {
            isValid: false,
            dirtyType: 'missing_field',
            description: '手机号格式无效',
            suggestedFix: { phone: record.phone?.replace(/\D/g, '') },
        };
    }
    return { isValid: true };
}
function checkLocation(record, rawRow, sourceFile) {
    const requiredFields = [
        'orderNo',
        'technicianId',
        'technicianName',
        'checkinTime',
        'location',
    ];
    const missingFields = requiredFields.filter((f) => !record[f]);
    if (missingFields.length > 0) {
        return {
            isValid: false,
            dirtyType: 'missing_field',
            description: `缺少必填字段: ${missingFields.join(', ')}`,
            missingFields,
        };
    }
    if (record.checkinTime && record.checkoutTime) {
        const checkin = (0, dayjs_1.default)(record.checkinTime);
        const checkout = (0, dayjs_1.default)(record.checkoutTime);
        if (checkin.isAfter(checkout)) {
            return {
                isValid: false,
                dirtyType: 'cross_day',
                description: '签到时间晚于签退时间',
                suggestedFix: { checkoutTime: checkin.add(2, 'hour').format('YYYY-MM-DD HH:mm:ss') },
            };
        }
        if (!checkin.isSame(checkout, 'day')) {
            return {
                isValid: false,
                dirtyType: 'cross_day',
                description: '签到与签退不在同一天',
            };
        }
    }
    return { isValid: true };
}
function checkReview(record, rawRow, sourceFile) {
    const requiredFields = ['orderNo', 'customerName', 'rating', 'reviewContent', 'reviewDate'];
    const missingFields = requiredFields.filter((f) => !record[f]);
    if (missingFields.length > 0) {
        return {
            isValid: false,
            dirtyType: 'missing_field',
            description: `缺少必填字段: ${missingFields.join(', ')}`,
            missingFields,
        };
    }
    if (record.rating !== undefined && (record.rating < 1 || record.rating > 5)) {
        return {
            isValid: false,
            dirtyType: 'amount_conflict',
            description: '评分必须在1-5之间',
            suggestedFix: { rating: Math.max(1, Math.min(5, record.rating)) },
        };
    }
    if (record.rating && record.rating <= 2 && !record.badReason) {
        return {
            isValid: false,
            dirtyType: 'missing_field',
            description: '差评必须填写差评原因',
            missingFields: ['badReason'],
        };
    }
    return { isValid: true };
}
function checkPriceAdjustment(record, rawRow, sourceFile) {
    const requiredFields = [
        'orderNo',
        'originalAmount',
        'adjustedAmount',
        'adjustmentReason',
        'operator',
        'adjustmentDate',
    ];
    const missingFields = requiredFields.filter((f) => !record[f]);
    if (missingFields.length > 0) {
        return {
            isValid: false,
            dirtyType: 'missing_field',
            description: `缺少必填字段: ${missingFields.join(', ')}`,
            missingFields,
        };
    }
    if (record.originalAmount !== undefined && record.adjustedAmount !== undefined) {
        if (record.originalAmount < 0 || record.adjustedAmount < 0) {
            return {
                isValid: false,
                dirtyType: 'amount_conflict',
                description: '金额不能为负数',
            };
        }
    }
    return { isValid: true };
}
function detectDuplicates(records, keyField = 'orderNo') {
    const groups = new Map();
    records.forEach((r) => {
        const key = String(r[keyField] || '');
        if (key) {
            const existing = groups.get(key) || [];
            existing.push(r);
            groups.set(key, existing);
        }
    });
    return Array.from(groups.values()).filter((g) => g.length > 1);
}
function detectNameChanges(records) {
    const nameMap = new Map();
    records.forEach((r) => {
        if (r.orderNo && r.customerName) {
            const names = nameMap.get(r.orderNo) || new Set();
            names.add(r.customerName);
            nameMap.set(r.orderNo, names);
        }
    });
    return Array.from(nameMap.entries())
        .filter(([, names]) => names.size > 1)
        .map(([orderNo, names]) => ({ orderNo, names: Array.from(names) }));
}
function detectAmountConflicts(records) {
    const amountMap = new Map();
    records.forEach((r) => {
        if (r.orderNo && r.originalAmount !== undefined) {
            const amounts = amountMap.get(r.orderNo) || [];
            amounts.push({ original: r.originalAmount, adjusted: r.adjustedAmount || 0 });
            amountMap.set(r.orderNo, amounts);
        }
    });
    return Array.from(amountMap.entries())
        .filter(([, amounts]) => {
        if (amounts.length <= 1)
            return false;
        const first = amounts[0];
        return amounts.some((a) => a.original !== first.original || a.adjusted !== first.adjusted);
    })
        .map(([orderNo, amounts]) => ({ orderNo, amounts }));
}
function getDirtyTypeLabel(type) {
    const labels = {
        missing_field: '缺字段',
        cross_day: '跨日',
        name_changed: '改名',
        amount_conflict: '金额冲突',
        quantity_conflict: '数量冲突',
        duplicate: '重复记录',
        merge_conflict: '合并冲突',
    };
    return labels[type] || type;
}
function getSourceTypeLabel(type) {
    const labels = {
        appointment: '预约单',
        location: '师傅定位',
        review: '用户评价',
        price_adjustment: '手工改价',
    };
    return labels[type] || type;
}
//# sourceMappingURL=dirtyChecker.js.map