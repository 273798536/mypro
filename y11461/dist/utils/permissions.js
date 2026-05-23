"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canPerformAction = canPerformAction;
exports.canViewField = canViewField;
exports.canEditField = canEditField;
exports.filterRecordByRole = filterRecordByRole;
exports.filterRecordsByRole = filterRecordsByRole;
exports.getRoleName = getRoleName;
exports.assertPermission = assertPermission;
const types_1 = require("../types");
const ROLE_FIELD_PERMISSIONS = {
    [types_1.UserRole.DATA_ENTRY]: {
        visible: [
            'id', 'source', 'sourceLine', 'sourceFile', 'batchNumber', 'materialName',
            'materialType', 'quantity', 'unitPrice', 'totalAmount', 'supplier',
            'patientId', 'patientName', 'appointmentDate', 'invoiceNumber',
            'importDate', 'importedBy', 'status', 'createdAt'
        ],
        editable: [
            'batchNumber', 'materialName', 'materialType', 'quantity', 'unitPrice',
            'totalAmount', 'supplier', 'patientId', 'patientName', 'appointmentDate',
            'invoiceNumber'
        ]
    },
    [types_1.UserRole.REVIEWER]: {
        visible: [
            'id', 'source', 'sourceLine', 'sourceFile', 'batchNumber', 'materialName',
            'materialType', 'quantity', 'unitPrice', 'totalAmount', 'supplier',
            'patientId', 'patientName', 'appointmentDate', 'invoiceNumber',
            'importDate', 'importedBy', 'status', 'createdAt', 'updatedAt', 'rawData'
        ],
        editable: [
            'status'
        ]
    },
    [types_1.UserRole.SUPERVISOR]: {
        visible: [
            'id', 'source', 'sourceLine', 'sourceFile', 'batchNumber', 'materialName',
            'materialType', 'quantity', 'unitPrice', 'totalAmount', 'supplier',
            'patientId', 'patientName', 'appointmentDate', 'invoiceNumber',
            'importDate', 'importedBy', 'status', 'createdAt', 'updatedAt', 'rawData'
        ],
        editable: [
            'batchNumber', 'materialName', 'materialType', 'quantity', 'unitPrice',
            'totalAmount', 'supplier', 'patientId', 'patientName', 'appointmentDate',
            'invoiceNumber', 'status'
        ]
    },
    [types_1.UserRole.READ_ONLY]: {
        visible: [
            'id', 'source', 'sourceLine', 'batchNumber', 'materialName',
            'materialType', 'quantity', 'unitPrice', 'totalAmount', 'supplier',
            'status', 'createdAt'
        ],
        editable: []
    }
};
const ROLE_ACTION_PERMISSIONS = {
    [types_1.UserRole.DATA_ENTRY]: {
        init: false,
        import: true,
        check: true,
        fix: true,
        review: false,
        approve: false,
        reject: false,
        report: true,
        history: true,
        export: true,
        createUser: false,
        manageUsers: false
    },
    [types_1.UserRole.REVIEWER]: {
        init: false,
        import: false,
        check: true,
        fix: false,
        review: true,
        approve: false,
        reject: true,
        report: true,
        history: true,
        export: true,
        createUser: false,
        manageUsers: false
    },
    [types_1.UserRole.SUPERVISOR]: {
        init: true,
        import: true,
        check: true,
        fix: true,
        review: true,
        approve: true,
        reject: true,
        report: true,
        history: true,
        export: true,
        createUser: true,
        manageUsers: true
    },
    [types_1.UserRole.READ_ONLY]: {
        init: false,
        import: false,
        check: false,
        fix: false,
        review: false,
        approve: false,
        reject: false,
        report: true,
        history: true,
        export: false,
        createUser: false,
        manageUsers: false
    }
};
function canPerformAction(role, action) {
    return ROLE_ACTION_PERMISSIONS[role]?.[action] ?? false;
}
function canViewField(role, field) {
    return ROLE_FIELD_PERMISSIONS[role]?.visible.includes(field) ?? false;
}
function canEditField(role, field) {
    return ROLE_FIELD_PERMISSIONS[role]?.editable.includes(field) ?? false;
}
function filterRecordByRole(record, role) {
    const visibleFields = ROLE_FIELD_PERMISSIONS[role]?.visible ?? [];
    const filtered = {};
    for (const field of visibleFields) {
        if (field in record) {
            filtered[field] = record[field];
        }
    }
    return filtered;
}
function filterRecordsByRole(records, role) {
    return records.map(r => filterRecordByRole(r, role));
}
function getRoleName(role) {
    const names = {
        [types_1.UserRole.DATA_ENTRY]: '录入员',
        [types_1.UserRole.REVIEWER]: '复核员',
        [types_1.UserRole.SUPERVISOR]: '主管',
        [types_1.UserRole.READ_ONLY]: '只读查看'
    };
    return names[role] ?? role;
}
function assertPermission(role, action) {
    if (!canPerformAction(role, action)) {
        throw new Error(`权限不足：角色 "${getRoleName(role)}" 无法执行操作 "${action}"`);
    }
}
//# sourceMappingURL=permissions.js.map