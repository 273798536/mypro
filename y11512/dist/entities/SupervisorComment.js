"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupervisorComment = exports.CommentType = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const BorrowApplication_1 = require("./BorrowApplication");
var CommentType;
(function (CommentType) {
    CommentType["FEE_ADJUSTMENT"] = "fee_adjustment";
    CommentType["STATUS_CHANGE"] = "status_change";
    CommentType["EXCEPTION_HANDLING"] = "exception_handling";
    CommentType["COMPENSATION_DECISION"] = "compensation_decision";
    CommentType["GENERAL_NOTE"] = "general_note";
})(CommentType || (exports.CommentType = CommentType = {}));
let SupervisorComment = class SupervisorComment extends BaseEntity_1.BaseEntity {
};
exports.SupervisorComment = SupervisorComment;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SupervisorComment.prototype, "applicationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => BorrowApplication_1.BorrowApplication, application => application.supervisorComments),
    (0, typeorm_1.JoinColumn)({ name: 'applicationId' }),
    __metadata("design:type", BorrowApplication_1.BorrowApplication)
], SupervisorComment.prototype, "application", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: CommentType,
        default: CommentType.GENERAL_NOTE
    }),
    __metadata("design:type", String)
], SupervisorComment.prototype, "commentType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SupervisorComment.prototype, "supervisorName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SupervisorComment.prototype, "supervisorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SupervisorComment.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], SupervisorComment.prototype, "changes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SupervisorComment.prototype, "isDecision", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], SupervisorComment.prototype, "decisionTime", void 0);
exports.SupervisorComment = SupervisorComment = __decorate([
    (0, typeorm_1.Entity)()
], SupervisorComment);
