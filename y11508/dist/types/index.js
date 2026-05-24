"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportSource = exports.RecordStatus = exports.DeviceStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["DATA_ENTRY"] = "data_entry";
    Role["REVIEWER"] = "reviewer";
    Role["SUPERVISOR"] = "supervisor";
    Role["READ_ONLY"] = "read_only";
})(Role || (exports.Role = Role = {}));
var DeviceStatus;
(function (DeviceStatus) {
    DeviceStatus["NORMAL"] = "normal";
    DeviceStatus["CERT_EXPIRED"] = "cert_expired";
    DeviceStatus["DEACTIVATED"] = "deactivated";
    DeviceStatus["MAINTENANCE"] = "maintenance";
})(DeviceStatus || (exports.DeviceStatus = DeviceStatus = {}));
var RecordStatus;
(function (RecordStatus) {
    RecordStatus["DRAFT"] = "draft";
    RecordStatus["SUBMITTED"] = "submitted";
    RecordStatus["REVIEWED"] = "reviewed";
    RecordStatus["REJECTED"] = "rejected";
    RecordStatus["CONFIRMED"] = "confirmed";
})(RecordStatus || (exports.RecordStatus = RecordStatus = {}));
var ImportSource;
(function (ImportSource) {
    ImportSource["INSPECTION"] = "inspection";
    ImportSource["CALIBRATION"] = "calibration";
    ImportSource["MAINTENANCE_QUOTE"] = "maintenance_quote";
    ImportSource["SECONDARY_CONFIRM"] = "secondary_confirm";
})(ImportSource || (exports.ImportSource = ImportSource = {}));
//# sourceMappingURL=index.js.map