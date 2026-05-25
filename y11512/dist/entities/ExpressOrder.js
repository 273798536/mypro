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
exports.ExpressOrder = exports.ExpressType = exports.ExpressStatus = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const BorrowApplication_1 = require("./BorrowApplication");
var ExpressStatus;
(function (ExpressStatus) {
    ExpressStatus["PENDING"] = "pending";
    ExpressStatus["CREATED"] = "created";
    ExpressStatus["SHIPPED"] = "shipped";
    ExpressStatus["IN_TRANSIT"] = "in_transit";
    ExpressStatus["DELIVERED"] = "delivered";
    ExpressStatus["FAILED"] = "failed";
    ExpressStatus["RETURNED"] = "returned";
})(ExpressStatus || (exports.ExpressStatus = ExpressStatus = {}));
var ExpressType;
(function (ExpressType) {
    ExpressType["FORWARD"] = "forward";
    ExpressType["RETURN"] = "return";
})(ExpressType || (exports.ExpressType = ExpressType = {}));
let ExpressOrder = class ExpressOrder extends BaseEntity_1.BaseEntity {
};
exports.ExpressOrder = ExpressOrder;
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ExpressOrder.prototype, "expressNo", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ExpressOrder.prototype, "applicationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => BorrowApplication_1.BorrowApplication, application => application.expressOrders),
    (0, typeorm_1.JoinColumn)({ name: 'applicationId' }),
    __metadata("design:type", BorrowApplication_1.BorrowApplication)
], ExpressOrder.prototype, "application", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: ExpressType,
        default: ExpressType.FORWARD
    }),
    __metadata("design:type", String)
], ExpressOrder.prototype, "expressType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: ExpressStatus,
        default: ExpressStatus.PENDING
    }),
    __metadata("design:type", String)
], ExpressOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ExpressOrder.prototype, "courierCompany", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ExpressOrder.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ExpressOrder.prototype, "senderPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ExpressOrder.prototype, "senderAddress", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ExpressOrder.prototype, "receiver", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ExpressOrder.prototype, "receiverPhone", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ExpressOrder.prototype, "receiverAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], ExpressOrder.prototype, "fee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ExpressOrder.prototype, "shipTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ExpressOrder.prototype, "deliverTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ExpressOrder.prototype, "trackingInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], ExpressOrder.prototype, "rawData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ExpressOrder.prototype, "externalReference", void 0);
exports.ExpressOrder = ExpressOrder = __decorate([
    (0, typeorm_1.Entity)()
], ExpressOrder);
