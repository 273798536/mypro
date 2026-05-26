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
exports.PaymentNode = void 0;
const typeorm_1 = require("typeorm");
const Contract_1 = require("./Contract");
const PaymentNodeVersion_1 = require("./PaymentNodeVersion");
let PaymentNode = class PaymentNode {
};
exports.PaymentNode = PaymentNode;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], PaymentNode.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentNode.prototype, "contractId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentNode.prototype, "nodeName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
    }),
    __metadata("design:type", String)
], PaymentNode.prototype, "nodeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PaymentNode.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PaymentNode.prototype, "percentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "date", nullable: true }),
    __metadata("design:type", String)
], PaymentNode.prototype, "expectedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "date", nullable: true }),
    __metadata("design:type", String)
], PaymentNode.prototype, "actualDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 0 }),
    __metadata("design:type", Number)
], PaymentNode.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "PENDING",
    }),
    __metadata("design:type", String)
], PaymentNode.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], PaymentNode.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 1 }),
    __metadata("design:type", Number)
], PaymentNode.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], PaymentNode.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], PaymentNode.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], PaymentNode.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PaymentNode.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PaymentNode.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Contract_1.Contract, (contract) => contract.paymentNodes),
    (0, typeorm_1.JoinColumn)({ name: "contractId" }),
    __metadata("design:type", Contract_1.Contract)
], PaymentNode.prototype, "contract", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PaymentNodeVersion_1.PaymentNodeVersion, (version) => version.paymentNode),
    __metadata("design:type", Array)
], PaymentNode.prototype, "versions", void 0);
exports.PaymentNode = PaymentNode = __decorate([
    (0, typeorm_1.Entity)()
], PaymentNode);
