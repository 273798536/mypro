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
exports.RepairOrder = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const Ledger_1 = require("./Ledger");
let RepairOrder = class RepairOrder extends BaseEntity_1.BaseEntity {
    constructor() {
        super(...arguments);
        this.isAfterSupplement = false;
    }
};
exports.RepairOrder = RepairOrder;
__decorate([
    (0, typeorm_1.Column)({ name: 'order_no', unique: true }),
    __metadata("design:type", String)
], RepairOrder.prototype, "orderNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_name', nullable: true }),
    __metadata("design:type", String)
], RepairOrder.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_phone', nullable: true }),
    __metadata("design:type", String)
], RepairOrder.prototype, "customerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_address', nullable: true, type: 'text' }),
    __metadata("design:type", String)
], RepairOrder.prototype, "customerAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_model', nullable: true }),
    __metadata("design:type", String)
], RepairOrder.prototype, "productModel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_sn', nullable: true }),
    __metadata("design:type", String)
], RepairOrder.prototype, "productSn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fault_description', nullable: true, type: 'text' }),
    __metadata("design:type", String)
], RepairOrder.prototype, "faultDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'engineer_id', nullable: true }),
    __metadata("design:type", String)
], RepairOrder.prototype, "engineerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'engineer_name', nullable: true }),
    __metadata("design:type", String)
], RepairOrder.prototype, "engineerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'repair_date', nullable: true }),
    __metadata("design:type", Date)
], RepairOrder.prototype, "repairDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_after_supplement', default: false }),
    __metadata("design:type", Boolean)
], RepairOrder.prototype, "isAfterSupplement", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplement_reason', nullable: true, type: 'text' }),
    __metadata("design:type", String)
], RepairOrder.prototype, "supplementReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], RepairOrder.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Ledger_1.Ledger, (ledger) => ledger.repairOrder),
    __metadata("design:type", Array)
], RepairOrder.prototype, "ledgers", void 0);
exports.RepairOrder = RepairOrder = __decorate([
    (0, typeorm_1.Entity)('repair_orders')
], RepairOrder);
//# sourceMappingURL=RepairOrder.js.map