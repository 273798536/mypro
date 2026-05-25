"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canViewField = exports.hasPermission = exports.getRolePermissions = exports.rolePermissions = void 0;
const types_1 = require("../types");
exports.rolePermissions = {
    [types_1.UserRole.DATA_ENTRY]: {
        visibleFields: [
            'id', 'ticketId', 'ticketNumber', 'customerName', 'customerPhone',
            'agentName', 'agentId', 'department', 'slaBreachType', 'slaBreachDuration',
            'compensationAmount', 'compensationType', 'escalationLevel', 'transferCount',
            'responsibleParty', 'liabilityReason', 'status', 'dataSources', 'occurrenceDate',
            'sourceSessionSummaryId', 'sourceSlaRuleId', 'sourceCompensationApprovalId',
            'sourceSupplierStatementId', 'sourceApprovalEmailId',
            'isDirty', 'dirtyRecordTypes', 'handlingOpinion', 'isCorrected',
            'createdAt', 'updatedAt', 'version'
        ],
        allowedActions: [
            'create_draft', 'update_draft', 'submit', 'view_list', 'view_detail',
            'view_my_records', 'view_history'
        ]
    },
    [types_1.UserRole.REVIEWER]: {
        visibleFields: [
            'id', 'ticketId', 'ticketNumber', 'customerName', 'customerPhone',
            'agentName', 'agentId', 'department', 'slaBreachType', 'slaBreachDuration',
            'compensationAmount', 'compensationType', 'escalationLevel', 'transferCount',
            'responsibleParty', 'liabilityReason', 'status', 'dataSources', 'occurrenceDate',
            'sourceSessionSummaryId', 'sourceSlaRuleId', 'sourceCompensationApprovalId',
            'sourceSupplierStatementId', 'sourceApprovalEmailId',
            'submittedBy', 'submittedAt', 'isDirty', 'dirtyRecordTypes',
            'originalContent', 'handlingOpinion', 'isCorrected',
            'createdAt', 'updatedAt', 'version'
        ],
        allowedActions: [
            'view_list', 'view_detail', 'view_all_records', 'approve', 'reject',
            'request_second_confirmation', 'view_history', 'mark_dirty_resolved',
            'add_handling_opinion'
        ]
    },
    [types_1.UserRole.SUPERVISOR]: {
        visibleFields: [
            'id', 'ticketId', 'ticketNumber', 'customerName', 'customerPhone',
            'agentName', 'agentId', 'department', 'slaBreachType', 'slaBreachDuration',
            'compensationAmount', 'compensationType', 'escalationLevel', 'transferCount',
            'responsibleParty', 'liabilityReason', 'status', 'dataSources', 'occurrenceDate',
            'sourceSessionSummaryId', 'sourceSlaRuleId', 'sourceCompensationApprovalId',
            'sourceSupplierStatementId', 'sourceApprovalEmailId',
            'submittedBy', 'submittedAt', 'reviewedBy', 'reviewedAt',
            'rejectedBy', 'rejectedAt', 'rejectionReason',
            'secondConfirmedBy', 'secondConfirmedAt',
            'isDirty', 'dirtyRecordTypes', 'originalContent',
            'handlingOpinion', 'isCorrected',
            'createdAt', 'updatedAt', 'version'
        ],
        allowedActions: [
            'view_list', 'view_detail', 'view_all_records', 'second_confirm',
            'view_history', 'export_masked', 'export_full',
            'view_role_summary', 'view_change_reasons', 'view_sensitive_handling',
            'mark_dirty_resolved', 'add_handling_opinion', 'correct_record'
        ]
    },
    [types_1.UserRole.READ_ONLY]: {
        visibleFields: [
            'id', 'ticketId', 'ticketNumber', 'customerName',
            'agentName', 'department', 'slaBreachType',
            'compensationAmount', 'compensationType', 'escalationLevel',
            'responsibleParty', 'liabilityReason', 'status', 'occurrenceDate',
            'isDirty', 'isCorrected', 'createdAt'
        ],
        allowedActions: [
            'view_list', 'view_detail', 'view_history'
        ]
    }
};
const getRolePermissions = (role) => {
    return exports.rolePermissions[role];
};
exports.getRolePermissions = getRolePermissions;
const hasPermission = (role, action) => {
    return exports.rolePermissions[role].allowedActions.includes(action);
};
exports.hasPermission = hasPermission;
const canViewField = (role, field) => {
    return exports.rolePermissions[role].visibleFields.includes(field);
};
exports.canViewField = canViewField;
