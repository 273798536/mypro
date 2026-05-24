"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationType = exports.RecordStatus = exports.SourceType = void 0;
var SourceType;
(function (SourceType) {
    SourceType["CABINET_INVENTORY"] = "cabinet_inventory";
    SourceType["RESTOCK_PHOTO"] = "restock_photo";
    SourceType["REFUND_RECORD"] = "refund_record";
    SourceType["EXCEPTION_PHOTO"] = "exception_photo";
    SourceType["SMS_SCREENSHOT"] = "sms_screenshot";
})(SourceType || (exports.SourceType = SourceType = {}));
var RecordStatus;
(function (RecordStatus) {
    RecordStatus["PENDING"] = "pending";
    RecordStatus["VALID"] = "valid";
    RecordStatus["INVALID"] = "invalid";
    RecordStatus["FIXED"] = "fixed";
    RecordStatus["EXCLUDED"] = "excluded";
})(RecordStatus || (exports.RecordStatus = RecordStatus = {}));
var OperationType;
(function (OperationType) {
    OperationType["INIT"] = "init";
    OperationType["IMPORT"] = "import";
    OperationType["CHECK"] = "check";
    OperationType["FIX"] = "fix";
    OperationType["RECALCULATE"] = "recalculate";
    OperationType["EXPORT"] = "export";
})(OperationType || (exports.OperationType = OperationType = {}));
//# sourceMappingURL=index.js.map