"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchStatus = exports.FrozenType = exports.ApprovalStatus = exports.AssignmentType = exports.TicketStatus = void 0;
var TicketStatus;
(function (TicketStatus) {
    TicketStatus["CREATED"] = "created";
    TicketStatus["ASSIGNED"] = "assigned";
    TicketStatus["PROCESSING"] = "processing";
    TicketStatus["ESCALATED"] = "escalated";
    TicketStatus["COMPENSATION_APPROVING"] = "compensation_approving";
    TicketStatus["COMPENSATION_APPROVED"] = "compensation_approved";
    TicketStatus["COMPENSATION_REJECTED"] = "compensation_rejected";
    TicketStatus["FROZEN"] = "frozen";
    TicketStatus["SETTLED"] = "settled";
    TicketStatus["ARCHIVED"] = "archived";
    TicketStatus["CLOSED"] = "closed";
})(TicketStatus || (exports.TicketStatus = TicketStatus = {}));
var AssignmentType;
(function (AssignmentType) {
    AssignmentType["AUTO"] = "auto";
    AssignmentType["MANUAL"] = "manual";
    AssignmentType["ESCALATION"] = "escalation";
})(AssignmentType || (exports.AssignmentType = AssignmentType = {}));
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "pending";
    ApprovalStatus["APPROVED"] = "approved";
    ApprovalStatus["REJECTED"] = "rejected";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
var FrozenType;
(function (FrozenType) {
    FrozenType["REVIEW"] = "review";
    FrozenType["DISPUTE"] = "dispute";
    FrozenType["RISK"] = "risk";
})(FrozenType || (exports.FrozenType = FrozenType = {}));
var BatchStatus;
(function (BatchStatus) {
    BatchStatus["DRAFT"] = "draft";
    BatchStatus["SUBMITTED"] = "submitted";
    BatchStatus["REVIEWING"] = "reviewing";
    BatchStatus["PROCESSED"] = "processed";
    BatchStatus["FROZEN"] = "frozen";
    BatchStatus["ARCHIVED"] = "archived";
})(BatchStatus || (exports.BatchStatus = BatchStatus = {}));
//# sourceMappingURL=index.js.map