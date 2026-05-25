"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = exports.MaterialStatus = void 0;
var MaterialStatus;
(function (MaterialStatus) {
    MaterialStatus["DRAFT"] = "draft";
    MaterialStatus["SUBMITTED"] = "submitted";
    MaterialStatus["REJECTED"] = "rejected";
    MaterialStatus["SECONDARY_CONFIRMED"] = "secondary_confirmed";
    MaterialStatus["AUDIT_ONLY"] = "audit_only";
    MaterialStatus["EXPORTED"] = "exported";
})(MaterialStatus || (exports.MaterialStatus = MaterialStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["OPERATOR"] = "operator";
    UserRole["REVIEWER"] = "reviewer";
    UserRole["MANAGER"] = "manager";
    UserRole["AUDITOR"] = "auditor";
    UserRole["ADMIN"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
//# sourceMappingURL=types.js.map