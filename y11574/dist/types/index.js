"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateStrategy = exports.DataSource = exports.DirtyRecordType = exports.WorkflowStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["DATA_ENTRY"] = "data_entry";
    UserRole["REVIEWER"] = "reviewer";
    UserRole["SUPERVISOR"] = "supervisor";
    UserRole["READ_ONLY"] = "read_only";
})(UserRole || (exports.UserRole = UserRole = {}));
var WorkflowStatus;
(function (WorkflowStatus) {
    WorkflowStatus["DRAFT"] = "draft";
    WorkflowStatus["SUBMITTED"] = "submitted";
    WorkflowStatus["REJECTED"] = "rejected";
    WorkflowStatus["SECOND_CONFIRMATION"] = "second_confirmation";
    WorkflowStatus["AUDIT_ONLY"] = "audit_only";
})(WorkflowStatus || (exports.WorkflowStatus = WorkflowStatus = {}));
var DirtyRecordType;
(function (DirtyRecordType) {
    DirtyRecordType["MISSING_FIELDS"] = "missing_fields";
    DirtyRecordType["CROSS_DATE"] = "cross_date";
    DirtyRecordType["NAME_CHANGE"] = "name_change";
    DirtyRecordType["AMOUNT_CONFLICT"] = "amount_conflict";
    DirtyRecordType["QUANTITY_CONFLICT"] = "quantity_conflict";
})(DirtyRecordType || (exports.DirtyRecordType = DirtyRecordType = {}));
var DataSource;
(function (DataSource) {
    DataSource["SESSION_SUMMARY"] = "session_summary";
    DataSource["SLA_RULE"] = "sla_rule";
    DataSource["COMPENSATION_APPROVAL"] = "compensation_approval";
    DataSource["SUPPLIER_STATEMENT"] = "supplier_statement";
    DataSource["APPROVAL_EMAIL"] = "approval_email";
})(DataSource || (exports.DataSource = DataSource = {}));
var DuplicateStrategy;
(function (DuplicateStrategy) {
    DuplicateStrategy["OVERWRITE"] = "overwrite";
    DuplicateStrategy["IGNORE"] = "ignore";
})(DuplicateStrategy || (exports.DuplicateStrategy = DuplicateStrategy = {}));
