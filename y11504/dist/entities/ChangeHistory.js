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
exports.ChangeHistory = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const Ledger_1 = require("./Ledger");
const enums_1 = require("../types/enums");
let ChangeHistory = class ChangeHistory extends BaseEntity_1.BaseEntity {
    constructor() {
        super(...arguments);
        this.version = 1;
    }
};
exports.ChangeHistory = ChangeHistory;
__decorate([
    (0, typeorm_1.Column)({ name: 'ledger_id', nullable: true }),
    __metadata("design:type", String)
], ChangeHistory.prototype, "ledgerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Ledger_1.Ledger, (ledger) => ledger.changeHistories, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'ledger_id' }),
    __metadata("design:type", Ledger_1.Ledger)
], ChangeHistory.prototype, "ledger", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: enums_1.ChangeAction,
    }),
    __metadata("design:type", String)
], ChangeHistory.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: enums_1.LedgerStatus,
        nullable: true,
        name: 'from_status',
    }),
    __metadata("design:type", String)
], ChangeHistory.prototype, "fromStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: enums_1.LedgerStatus,
        nullable: true,
        name: 'to_status',
    }),
    __metadata("design:type", String)
], ChangeHistory.prototype, "toStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true, name: 'before_data' }),
    __metadata("design:type", Object)
], ChangeHistory.prototype, "beforeData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true, name: 'after_data' }),
    __metadata("design:type", Object)
], ChangeHistory.prototype, "afterData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Array)
], ChangeHistory.prototype, "changes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ChangeHistory.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_id', nullable: true }),
    __metadata("design:type", String)
], ChangeHistory.prototype, "operatorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_name', nullable: true }),
    __metadata("design:type", String)
], ChangeHistory.prototype, "operatorName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_role', nullable: true }),
    __metadata("design:type", String)
], ChangeHistory.prototype, "operatorRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'version', default: 1 }),
    __metadata("design:type", Number)
], ChangeHistory.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], ChangeHistory.prototype, "metadata", void 0);
exports.ChangeHistory = ChangeHistory = __decorate([
    (0, typeorm_1.Entity)('change_histories')
], ChangeHistory);
//# sourceMappingURL=ChangeHistory.js.map