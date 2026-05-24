"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAction = exports.UserRole = exports.RetryCategory = exports.QueueStatus = exports.SigninType = exports.DataSource = void 0;
var DataSource;
(function (DataSource) {
    DataSource["REGISTRATION_FORM"] = "registration_form";
    DataSource["SIGNIN_QRCODE"] = "signin_qrcode";
    DataSource["HOMEWORK"] = "homework";
    DataSource["MANUAL_PRICE"] = "manual_price";
    DataSource["HISTORY_ARCHIVE"] = "history_archive";
})(DataSource || (exports.DataSource = DataSource = {}));
var SigninType;
(function (SigninType) {
    SigninType["NORMAL"] = "normal";
    SigninType["RETRY"] = "retry";
    SigninType["MANUAL"] = "manual";
    SigninType["COMPENSATION"] = "compensation";
})(SigninType || (exports.SigninType = SigninType = {}));
var QueueStatus;
(function (QueueStatus) {
    QueueStatus["PENDING"] = "pending";
    QueueStatus["PROCESSING"] = "processing";
    QueueStatus["RETRYING"] = "retrying";
    QueueStatus["SUCCESS"] = "success";
    QueueStatus["FAILED"] = "failed";
    QueueStatus["DEAD_LETTER"] = "dead_letter";
    QueueStatus["MANUAL_REVIEW"] = "manual_review";
    QueueStatus["COMPENSATED"] = "compensated";
    QueueStatus["CLOSED"] = "closed";
})(QueueStatus || (exports.QueueStatus = QueueStatus = {}));
var RetryCategory;
(function (RetryCategory) {
    RetryCategory["NETWORK_ERROR"] = "network_error";
    RetryCategory["DATA_CONFLICT"] = "data_conflict";
    RetryCategory["VALIDATION_ERROR"] = "validation_error";
    RetryCategory["DUPLICATE_RECORD"] = "duplicate_record";
    RetryCategory["MISSING_DATA"] = "missing_data";
    RetryCategory["SYSTEM_ERROR"] = "system_error";
    RetryCategory["UNKNOWN"] = "unknown";
})(RetryCategory || (exports.RetryCategory = RetryCategory = {}));
var UserRole;
(function (UserRole) {
    UserRole["DATA_ENTRY"] = "data_entry";
    UserRole["REVIEWER"] = "reviewer";
    UserRole["SUPERVISOR"] = "supervisor";
    UserRole["READ_ONLY"] = "read_only";
})(UserRole || (exports.UserRole = UserRole = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["SUBMIT"] = "submit";
    AuditAction["QUEUE"] = "queue";
    AuditAction["RETRY"] = "retry";
    AuditAction["MANUAL_TAKEOVER"] = "manual_takeover";
    AuditAction["COMPENSATE"] = "compensate";
    AuditAction["CLOSE"] = "close";
    AuditAction["APPROVE"] = "approve";
    AuditAction["REJECT"] = "reject";
    AuditAction["UPDATE"] = "update";
    AuditAction["DELETE"] = "delete";
    AuditAction["EXPORT"] = "export";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
//# sourceMappingURL=types.js.map