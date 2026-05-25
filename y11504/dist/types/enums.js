"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensitiveFieldLevel = exports.ReceiptSource = exports.ChangeAction = exports.DataQuality = exports.UserRole = exports.PartType = exports.LedgerStatus = void 0;
var LedgerStatus;
(function (LedgerStatus) {
    LedgerStatus["DRAFT"] = "draft";
    LedgerStatus["SUBMITTED"] = "submitted";
    LedgerStatus["REJECTED"] = "rejected";
    LedgerStatus["CONFIRMED"] = "confirmed";
    LedgerStatus["AUDITED"] = "audited";
})(LedgerStatus || (exports.LedgerStatus = LedgerStatus = {}));
var PartType;
(function (PartType) {
    PartType["NORMAL"] = "normal";
    PartType["RETURNED"] = "returned";
    PartType["SCRAPPED"] = "scrapped";
})(PartType || (exports.PartType = PartType = {}));
var UserRole;
(function (UserRole) {
    UserRole["ENGINEER"] = "engineer";
    UserRole["SERVICE_MANAGER"] = "service_manager";
    UserRole["AUDITOR"] = "auditor";
    UserRole["ADMIN"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var DataQuality;
(function (DataQuality) {
    DataQuality["VALID"] = "valid";
    DataQuality["INVALID"] = "invalid";
    DataQuality["SUSPICIOUS"] = "suspicious";
})(DataQuality || (exports.DataQuality = DataQuality = {}));
var ChangeAction;
(function (ChangeAction) {
    ChangeAction["CREATE"] = "create";
    ChangeAction["UPDATE"] = "update";
    ChangeAction["SUBMIT"] = "submit";
    ChangeAction["REJECT"] = "reject";
    ChangeAction["CONFIRM"] = "confirm";
    ChangeAction["AUDIT"] = "audit";
})(ChangeAction || (exports.ChangeAction = ChangeAction = {}));
var ReceiptSource;
(function (ReceiptSource) {
    ReceiptSource["INTERNAL"] = "internal";
    ReceiptSource["EXTERNAL"] = "external";
})(ReceiptSource || (exports.ReceiptSource = ReceiptSource = {}));
var SensitiveFieldLevel;
(function (SensitiveFieldLevel) {
    SensitiveFieldLevel["NONE"] = "none";
    SensitiveFieldLevel["MASK"] = "mask";
    SensitiveFieldLevel["HIDE"] = "hide";
})(SensitiveFieldLevel || (exports.SensitiveFieldLevel = SensitiveFieldLevel = {}));
//# sourceMappingURL=enums.js.map