"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrbpFocusFields = exports.rolePermissions = void 0;
exports.filterFieldsByRole = filterFieldsByRole;
exports.canPerformAction = canPerformAction;
const types_1 = require("../models/types");
exports.rolePermissions = {
    [types_1.UserRole.DATA_ENTRY]: {
        visibleFields: [
            'id', 'employeeId', 'employeeName', 'department', 'trainingId', 'trainingName',
            'trainingDate', 'signinTime', 'source', 'sourceFile', 'qrcodeId', 'location',
            'isProxy', 'proxyEmployeeId', 'proxyEmployeeName', 'remark', 'createdAt'
        ],
        allowedActions: [
            types_1.AuditAction.SUBMIT,
            types_1.AuditAction.QUEUE,
            types_1.AuditAction.EXPORT
        ]
    },
    [types_1.UserRole.REVIEWER]: {
        visibleFields: [
            'id', 'employeeId', 'employeeName', 'department', 'trainingId', 'trainingName',
            'trainingDate', 'signinTime', 'source', 'sourceFile', 'qrcodeId', 'location',
            'isProxy', 'proxyEmployeeId', 'proxyEmployeeName', 'isCompensated', 'compensationSource',
            'isValid', 'validationRemark', 'status', 'retryCategory', 'retryCount',
            'errorMessage', 'originalData', 'correctedData', 'remark', 'createdAt', 'updatedAt'
        ],
        allowedActions: [
            types_1.AuditAction.SUBMIT,
            types_1.AuditAction.QUEUE,
            types_1.AuditAction.RETRY,
            types_1.AuditAction.MANUAL_TAKEOVER,
            types_1.AuditAction.APPROVE,
            types_1.AuditAction.REJECT,
            types_1.AuditAction.UPDATE,
            types_1.AuditAction.EXPORT
        ]
    },
    [types_1.UserRole.SUPERVISOR]: {
        visibleFields: [
            'id', 'employeeId', 'employeeName', 'department', 'trainingId', 'trainingName',
            'trainingDate', 'signinTime', 'source', 'sourceFile', 'qrcodeId', 'location',
            'latitude', 'longitude', 'isProxy', 'proxyEmployeeId', 'proxyEmployeeName',
            'isCompensated', 'compensationSource', 'isValid', 'validationRemark',
            'status', 'retryCategory', 'retryCount', 'maxRetryCount', 'lastRetryTime',
            'nextRetryTime', 'errorMessage', 'errorStack', 'originalData', 'correctedData',
            'handledBy', 'handledAt', 'handleRemark', 'compensatedRecordId',
            'closedBy', 'closedAt', 'closeReason', 'createdBy', 'createdAt', 'updatedAt'
        ],
        allowedActions: [
            types_1.AuditAction.SUBMIT,
            types_1.AuditAction.QUEUE,
            types_1.AuditAction.RETRY,
            types_1.AuditAction.MANUAL_TAKEOVER,
            types_1.AuditAction.COMPENSATE,
            types_1.AuditAction.CLOSE,
            types_1.AuditAction.APPROVE,
            types_1.AuditAction.REJECT,
            types_1.AuditAction.UPDATE,
            types_1.AuditAction.DELETE,
            types_1.AuditAction.EXPORT
        ]
    },
    [types_1.UserRole.READ_ONLY]: {
        visibleFields: [
            'id', 'employeeId', 'employeeName', 'department', 'trainingId', 'trainingName',
            'trainingDate', 'signinTime', 'source', 'isProxy', 'isCompensated',
            'isValid', 'status', 'retryCategory', 'retryCount', 'createdAt'
        ],
        allowedActions: [
            types_1.AuditAction.EXPORT
        ]
    }
};
exports.hrbpFocusFields = [
    'retryCategory',
    'status',
    'retryCount',
    'maxRetryCount',
    'nextRetryTime',
    'errorMessage',
    'isCompensated',
    'handledAt',
    'closedAt'
];
function filterFieldsByRole(data, role) {
    const allowedFields = exports.rolePermissions[role].visibleFields;
    const filtered = {};
    for (const field of allowedFields) {
        if (field in data) {
            filtered[field] = data[field];
        }
    }
    return filtered;
}
function canPerformAction(role, action) {
    return exports.rolePermissions[role].allowedActions.includes(action);
}
//# sourceMappingURL=permissions.js.map