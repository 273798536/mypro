"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleType = exports.DataSource = exports.LedgerStatus = void 0;
var LedgerStatus;
(function (LedgerStatus) {
    LedgerStatus["DRAFT"] = "draft";
    LedgerStatus["SUBMITTED"] = "submitted";
    LedgerStatus["REJECTED"] = "rejected";
    LedgerStatus["SECOND_CONFIRM"] = "second_confirm";
    LedgerStatus["AUDIT_ONLY"] = "audit_only";
})(LedgerStatus || (exports.LedgerStatus = LedgerStatus = {}));
var DataSource;
(function (DataSource) {
    DataSource["APPOINTMENT"] = "appointment";
    DataSource["TECHNICIAN_LOCATION"] = "technician_location";
    DataSource["USER_REVIEW"] = "user_review";
    DataSource["SECOND_CONFIRMATION"] = "second_confirmation";
})(DataSource || (exports.DataSource = DataSource = {}));
var RoleType;
(function (RoleType) {
    RoleType["ADMIN"] = "admin";
    RoleType["AREA_MANAGER"] = "area_manager";
    RoleType["AFTER_SALES"] = "after_sales";
    RoleType["AUDITOR"] = "auditor";
})(RoleType || (exports.RoleType = RoleType = {}));
//# sourceMappingURL=index.js.map