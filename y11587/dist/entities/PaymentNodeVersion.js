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
exports.PaymentNodeVersion = void 0;
const typeorm_1 = require("typeorm");
const PaymentNode_1 = require("./PaymentNode");
let PaymentNodeVersion = class PaymentNodeVersion {
};
exports.PaymentNodeVersion = PaymentNodeVersion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], PaymentNodeVersion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentNodeVersion.prototype, "paymentNodeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer" }),
    __metadata("design:type", Number)
], PaymentNodeVersion.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], PaymentNodeVersion.prototype, "snapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], PaymentNodeVersion.prototype, "changeReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], PaymentNodeVersion.prototype, "changedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PaymentNodeVersion.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PaymentNode_1.PaymentNode, (node) => node.versions),
    (0, typeorm_1.JoinColumn)({ name: "paymentNodeId" }),
    __metadata("design:type", PaymentNode_1.PaymentNode)
], PaymentNodeVersion.prototype, "paymentNode", void 0);
exports.PaymentNodeVersion = PaymentNodeVersion = __decorate([
    (0, typeorm_1.Entity)()
], PaymentNodeVersion);
