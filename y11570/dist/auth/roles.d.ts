export declare enum Role {
    AGENT = "agent",
    SUPERVISOR = "supervisor",
    MANAGER = "manager",
    QUALITY = "quality",
    FINANCE = "finance",
    ADMIN = "admin"
}
export declare enum Permission {
    TICKET_VIEW = "ticket:view",
    TICKET_REASSIGN = "ticket:reassign",
    TICKET_ESCALATE = "ticket:escalate",
    TICKET_COMPENSATION_REQUEST = "ticket:compensation:request",
    TICKET_COMPENSATION_REVIEW = "ticket:compensation:review",
    TICKET_FREEZE = "ticket:freeze",
    TICKET_UNFREEZE = "ticket:unfreeze",
    TICKET_SETTLE = "ticket:settle",
    TICKET_ARCHIVE = "ticket:archive",
    TICKET_UNARCHIVE = "ticket:unarchive",
    TICKET_REVIEW = "ticket:review",
    TICKET_OVERRIDE = "ticket:override",
    BATCH_VIEW = "batch:view",
    BATCH_CREATE = "batch:create",
    BATCH_SUBMIT = "batch:submit",
    BATCH_REVIEW = "batch:review",
    BATCH_PROCESS = "batch:process",
    BATCH_FREEZE = "batch:freeze",
    BATCH_ARCHIVE = "batch:archive",
    BATCH_UNARCHIVE = "batch:unarchive",
    INVENTORY_VIEW = "inventory:view",
    INVENTORY_CREATE = "inventory:create",
    INVENTORY_EDIT = "inventory:edit",
    EXPORT_VIEW = "export:view",
    EXPORT_CREATE = "export:create",
    REPORT_VIEW = "report:view",
    REPORT_CREATE = "report:create",
    AUDIT_VIEW = "audit:view",
    FAILED_VIEW = "failed:view",
    SLA_MANAGE = "sla:manage",
    COMPENSATION_RULE_MANAGE = "compensation:rule:manage"
}
export declare const ROLE_PERMISSIONS: Record<Role, Permission[]>;
export declare const DEFAULT_ROLE_FOR_OPERATOR: Record<string, Role>;
export declare function getRoleForOperator(operatorId: string): Role;
export declare function hasPermission(operatorId: string, permission: Permission): boolean;
export declare function getPermissionsForOperator(operatorId: string): Permission[];
export declare function checkPermission(operatorId: string, permission: Permission): {
    allowed: boolean;
    message?: string;
};
declare const _default: {
    Role: typeof Role;
    Permission: typeof Permission;
    ROLE_PERMISSIONS: Record<Role, Permission[]>;
    DEFAULT_ROLE_FOR_OPERATOR: Record<string, Role>;
    getRoleForOperator: typeof getRoleForOperator;
    hasPermission: typeof hasPermission;
    getPermissionsForOperator: typeof getPermissionsForOperator;
    checkPermission: typeof checkPermission;
};
export default _default;
