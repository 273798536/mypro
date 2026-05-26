"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROLE_FOR_OPERATOR = exports.ROLE_PERMISSIONS = exports.Permission = exports.Role = void 0;
exports.getRoleForOperator = getRoleForOperator;
exports.hasPermission = hasPermission;
exports.getPermissionsForOperator = getPermissionsForOperator;
exports.checkPermission = checkPermission;
var Role;
(function (Role) {
    Role["AGENT"] = "agent";
    Role["SUPERVISOR"] = "supervisor";
    Role["MANAGER"] = "manager";
    Role["QUALITY"] = "quality";
    Role["FINANCE"] = "finance";
    Role["ADMIN"] = "admin";
})(Role || (exports.Role = Role = {}));
var Permission;
(function (Permission) {
    Permission["TICKET_VIEW"] = "ticket:view";
    Permission["TICKET_REASSIGN"] = "ticket:reassign";
    Permission["TICKET_ESCALATE"] = "ticket:escalate";
    Permission["TICKET_COMPENSATION_REQUEST"] = "ticket:compensation:request";
    Permission["TICKET_COMPENSATION_REVIEW"] = "ticket:compensation:review";
    Permission["TICKET_FREEZE"] = "ticket:freeze";
    Permission["TICKET_UNFREEZE"] = "ticket:unfreeze";
    Permission["TICKET_SETTLE"] = "ticket:settle";
    Permission["TICKET_ARCHIVE"] = "ticket:archive";
    Permission["TICKET_UNARCHIVE"] = "ticket:unarchive";
    Permission["TICKET_REVIEW"] = "ticket:review";
    Permission["TICKET_OVERRIDE"] = "ticket:override";
    Permission["BATCH_VIEW"] = "batch:view";
    Permission["BATCH_CREATE"] = "batch:create";
    Permission["BATCH_SUBMIT"] = "batch:submit";
    Permission["BATCH_REVIEW"] = "batch:review";
    Permission["BATCH_PROCESS"] = "batch:process";
    Permission["BATCH_FREEZE"] = "batch:freeze";
    Permission["BATCH_ARCHIVE"] = "batch:archive";
    Permission["BATCH_UNARCHIVE"] = "batch:unarchive";
    Permission["INVENTORY_VIEW"] = "inventory:view";
    Permission["INVENTORY_CREATE"] = "inventory:create";
    Permission["INVENTORY_EDIT"] = "inventory:edit";
    Permission["EXPORT_VIEW"] = "export:view";
    Permission["EXPORT_CREATE"] = "export:create";
    Permission["REPORT_VIEW"] = "report:view";
    Permission["REPORT_CREATE"] = "report:create";
    Permission["AUDIT_VIEW"] = "audit:view";
    Permission["FAILED_VIEW"] = "failed:view";
    Permission["SLA_MANAGE"] = "sla:manage";
    Permission["COMPENSATION_RULE_MANAGE"] = "compensation:rule:manage";
})(Permission || (exports.Permission = Permission = {}));
exports.ROLE_PERMISSIONS = {
    [Role.AGENT]: [
        Permission.TICKET_VIEW,
        Permission.TICKET_REASSIGN,
        Permission.TICKET_COMPENSATION_REQUEST,
        Permission.INVENTORY_VIEW,
        Permission.INVENTORY_CREATE,
        Permission.BATCH_VIEW,
        Permission.EXPORT_VIEW,
        Permission.REPORT_VIEW,
        Permission.AUDIT_VIEW
    ],
    [Role.SUPERVISOR]: [
        Permission.TICKET_VIEW,
        Permission.TICKET_REASSIGN,
        Permission.TICKET_ESCALATE,
        Permission.TICKET_COMPENSATION_REQUEST,
        Permission.TICKET_COMPENSATION_REVIEW,
        Permission.TICKET_FREEZE,
        Permission.TICKET_SETTLE,
        Permission.TICKET_REVIEW,
        Permission.BATCH_VIEW,
        Permission.BATCH_CREATE,
        Permission.BATCH_SUBMIT,
        Permission.BATCH_REVIEW,
        Permission.BATCH_PROCESS,
        Permission.BATCH_FREEZE,
        Permission.INVENTORY_VIEW,
        Permission.INVENTORY_CREATE,
        Permission.INVENTORY_EDIT,
        Permission.EXPORT_VIEW,
        Permission.EXPORT_CREATE,
        Permission.REPORT_VIEW,
        Permission.REPORT_CREATE,
        Permission.AUDIT_VIEW,
        Permission.FAILED_VIEW
    ],
    [Role.MANAGER]: [
        Permission.TICKET_VIEW,
        Permission.TICKET_REASSIGN,
        Permission.TICKET_ESCALATE,
        Permission.TICKET_COMPENSATION_REQUEST,
        Permission.TICKET_COMPENSATION_REVIEW,
        Permission.TICKET_FREEZE,
        Permission.TICKET_UNFREEZE,
        Permission.TICKET_SETTLE,
        Permission.TICKET_ARCHIVE,
        Permission.TICKET_UNARCHIVE,
        Permission.TICKET_REVIEW,
        Permission.TICKET_OVERRIDE,
        Permission.BATCH_VIEW,
        Permission.BATCH_CREATE,
        Permission.BATCH_SUBMIT,
        Permission.BATCH_REVIEW,
        Permission.BATCH_PROCESS,
        Permission.BATCH_FREEZE,
        Permission.BATCH_ARCHIVE,
        Permission.BATCH_UNARCHIVE,
        Permission.INVENTORY_VIEW,
        Permission.INVENTORY_CREATE,
        Permission.INVENTORY_EDIT,
        Permission.EXPORT_VIEW,
        Permission.EXPORT_CREATE,
        Permission.REPORT_VIEW,
        Permission.REPORT_CREATE,
        Permission.AUDIT_VIEW,
        Permission.FAILED_VIEW,
        Permission.SLA_MANAGE,
        Permission.COMPENSATION_RULE_MANAGE
    ],
    [Role.QUALITY]: [
        Permission.TICKET_VIEW,
        Permission.TICKET_FREEZE,
        Permission.TICKET_UNFREEZE,
        Permission.TICKET_REVIEW,
        Permission.TICKET_OVERRIDE,
        Permission.BATCH_VIEW,
        Permission.BATCH_REVIEW,
        Permission.INVENTORY_VIEW,
        Permission.INVENTORY_EDIT,
        Permission.EXPORT_VIEW,
        Permission.REPORT_VIEW,
        Permission.REPORT_CREATE,
        Permission.AUDIT_VIEW,
        Permission.FAILED_VIEW
    ],
    [Role.FINANCE]: [
        Permission.TICKET_VIEW,
        Permission.TICKET_COMPENSATION_REVIEW,
        Permission.TICKET_SETTLE,
        Permission.BATCH_VIEW,
        Permission.BATCH_REVIEW,
        Permission.BATCH_PROCESS,
        Permission.INVENTORY_VIEW,
        Permission.EXPORT_VIEW,
        Permission.EXPORT_CREATE,
        Permission.REPORT_VIEW,
        Permission.REPORT_CREATE,
        Permission.AUDIT_VIEW
    ],
    [Role.ADMIN]: Object.values(Permission)
};
exports.DEFAULT_ROLE_FOR_OPERATOR = {
    'AGENT001': Role.AGENT,
    'AGENT002': Role.AGENT,
    'AGENT003': Role.AGENT,
    'AGENT_SUPERVISOR': Role.SUPERVISOR,
    'MANAGER001': Role.MANAGER,
    'QUALITY_TEAM': Role.QUALITY,
    'FINANCE001': Role.FINANCE,
    'WAREHOUSE001': Role.AGENT,
    'admin_001': Role.ADMIN,
    'admin': Role.ADMIN,
    'system': Role.ADMIN
};
function getRoleForOperator(operatorId) {
    return exports.DEFAULT_ROLE_FOR_OPERATOR[operatorId] || Role.AGENT;
}
function hasPermission(operatorId, permission) {
    const role = getRoleForOperator(operatorId);
    const permissions = exports.ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
}
function getPermissionsForOperator(operatorId) {
    const role = getRoleForOperator(operatorId);
    return exports.ROLE_PERMISSIONS[role] || [];
}
function checkPermission(operatorId, permission) {
    if (hasPermission(operatorId, permission)) {
        return { allowed: true };
    }
    const role = getRoleForOperator(operatorId);
    return {
        allowed: false,
        message: `操作人 [${operatorId}] 角色为 [${role}]，缺少权限 [${permission}]`
    };
}
exports.default = {
    Role,
    Permission,
    ROLE_PERMISSIONS: exports.ROLE_PERMISSIONS,
    DEFAULT_ROLE_FOR_OPERATOR: exports.DEFAULT_ROLE_FOR_OPERATOR,
    getRoleForOperator,
    hasPermission,
    getPermissionsForOperator,
    checkPermission
};
//# sourceMappingURL=roles.js.map