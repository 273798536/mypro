"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSource = exports.DirtyType = exports.RecordStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["DATA_ENTRY"] = "data_entry";
    UserRole["REVIEWER"] = "reviewer";
    UserRole["SUPERVISOR"] = "supervisor";
    UserRole["READ_ONLY"] = "read_only";
})(UserRole || (exports.UserRole = UserRole = {}));
var RecordStatus;
(function (RecordStatus) {
    RecordStatus["PENDING"] = "pending";
    RecordStatus["IMPORTED"] = "imported";
    RecordStatus["DIRTY"] = "dirty";
    RecordStatus["REVIEWED"] = "reviewed";
    RecordStatus["FIXED"] = "fixed";
    RecordStatus["REJECTED"] = "rejected";
    RecordStatus["APPROVED"] = "approved";
})(RecordStatus || (exports.RecordStatus = RecordStatus = {}));
var DirtyType;
(function (DirtyType) {
    DirtyType["MISSING_FIELD"] = "missing_field";
    DirtyType["CROSS_DATE"] = "cross_date";
    DirtyType["NAME_CHANGED"] = "name_changed";
    DirtyType["AMOUNT_CONFLICT"] = "amount_conflict";
    DirtyType["QUANTITY_CONFLICT"] = "quantity_conflict";
})(DirtyType || (exports.DirtyType = DirtyType = {}));
var DataSource;
(function (DataSource) {
    DataSource["IMPLANT_BATCH"] = "implant_batch";
    DataSource["APPOINTMENT"] = "appointment";
    DataSource["SUPPLIER_INVOICE"] = "supplier_invoice";
    DataSource["MANUAL_ENTRY"] = "manual_entry";
})(DataSource || (exports.DataSource = DataSource = {}));
//# sourceMappingURL=index.js.map