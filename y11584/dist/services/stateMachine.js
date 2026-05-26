"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateTransitionMatrix = void 0;
exports.validateStateTransition = validateStateTransition;
exports.getActionDescription = getActionDescription;
const schema_1 = require("../database/schema");
exports.stateTransitionMatrix = {
    submit: {
        from: [schema_1.RecordStatus.DRAFT, schema_1.RecordStatus.REJECTED],
        to: schema_1.RecordStatus.SUBMITTED,
        allowedRoles: [schema_1.RoleType.STORE_STAFF, schema_1.RoleType.STORE_MANAGER]
    },
    reject: {
        from: [schema_1.RecordStatus.DRAFT, schema_1.RecordStatus.SUBMITTED, schema_1.RecordStatus.CONFIRMED],
        to: schema_1.RecordStatus.REJECTED,
        allowedRoles: [schema_1.RoleType.STORE_MANAGER, schema_1.RoleType.FINANCE, schema_1.RoleType.AUDITOR]
    },
    confirm: {
        from: [schema_1.RecordStatus.SUBMITTED],
        to: schema_1.RecordStatus.CONFIRMED,
        allowedRoles: [schema_1.RoleType.FINANCE, schema_1.RoleType.AUDITOR]
    },
    audit: {
        from: [schema_1.RecordStatus.CONFIRMED],
        to: schema_1.RecordStatus.AUDITED,
        allowedRoles: [schema_1.RoleType.FINANCE, schema_1.RoleType.AUDITOR]
    }
};
function validateStateTransition(action, currentStatus, operatorRole) {
    const rule = exports.stateTransitionMatrix[action];
    if (!rule) {
        return { valid: false, error: `无效的操作类型: ${action}` };
    }
    if (!rule.from.includes(currentStatus)) {
        return {
            valid: false,
            error: `状态流转不合法: 无法从 ${currentStatus} ${action} 到 ${rule.to}。允许的前置状态: ${rule.from.join(', ')}`
        };
    }
    if (!rule.allowedRoles.includes(operatorRole)) {
        return {
            valid: false,
            error: `权限不足: ${operatorRole} 无法执行 ${action} 操作。允许的角色: ${rule.allowedRoles.join(', ')}`
        };
    }
    return { valid: true };
}
function getActionDescription(action, currentStatus) {
    const descriptions = {
        submit: {
            [schema_1.RecordStatus.DRAFT]: '提交审核',
            [schema_1.RecordStatus.REJECTED]: '重新提交审核',
            [schema_1.RecordStatus.SUBMITTED]: '',
            [schema_1.RecordStatus.CONFIRMED]: '',
            [schema_1.RecordStatus.AUDITED]: ''
        },
        reject: {
            [schema_1.RecordStatus.DRAFT]: '驳回草稿',
            [schema_1.RecordStatus.SUBMITTED]: '驳回审核',
            [schema_1.RecordStatus.CONFIRMED]: '驳回已确认记录',
            [schema_1.RecordStatus.REJECTED]: '',
            [schema_1.RecordStatus.AUDITED]: ''
        },
        confirm: {
            [schema_1.RecordStatus.SUBMITTED]: '财务确认',
            [schema_1.RecordStatus.DRAFT]: '',
            [schema_1.RecordStatus.REJECTED]: '',
            [schema_1.RecordStatus.CONFIRMED]: '',
            [schema_1.RecordStatus.AUDITED]: ''
        },
        audit: {
            [schema_1.RecordStatus.CONFIRMED]: '最终审计',
            [schema_1.RecordStatus.DRAFT]: '',
            [schema_1.RecordStatus.SUBMITTED]: '',
            [schema_1.RecordStatus.REJECTED]: '',
            [schema_1.RecordStatus.AUDITED]: ''
        }
    };
    return descriptions[action]?.[currentStatus] || action;
}
