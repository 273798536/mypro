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
exports.PartScan = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const Ledger_1 = require("./Ledger");
const enums_1 = require("../types/enums");
let PartScan = class PartScan extends BaseEntity_1.BaseEntity {
    constructor() {
        super(...arguments);
        this.partType = enums_1.PartType.NORMAL;
        this.quantity = 1;
    }
};
exports.PartScan = PartScan;
__decorate([
    (0, typeorm_1.Column)({ name: 'part_code' }),
    __metadata("design:type", String)
], PartScan.prototype, "partCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_name', nullable: true }),
    __metadata("design:type", String)
], PartScan.prototype, "partName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: enums_1.PartType,
        default: enums_1.PartType.NORMAL,
        name: 'part_type',
    }),
    __metadata("design:type", String)
], PartScan.prototype, "partType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scan_time', nullable: true }),
    __metadata("design:type", Date)
], PartScan.prototype, "scanTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scan_location', nullable: true }),
    __metadata("design:type", String)
], PartScan.prototype, "scanLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scanner_id', nullable: true }),
    __metadata("design:type", String)
], PartScan.prototype, "scannerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scanner_name', nullable: true }),
    __metadata("design:type", String)
], PartScan.prototype, "scannerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quantity', default: 1 }),
    __metadata("design:type", Number)
], PartScan.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'batch_no', nullable: true }),
    __metadata("design:type", String)
], PartScan.prototype, "batchNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], PartScan.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ledger_id', nullable: true }),
    __metadata("design:type", String)
], PartScan.prototype, "ledgerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Ledger_1.Ledger, (ledger) => ledger.partScans, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'ledger_id' }),
    __metadata("design:type", Ledger_1.Ledger)
], PartScan.prototype, "ledger", void 0);
exports.PartScan = PartScan = __decorate([
    (0, typeorm_1.Entity)('part_scans')
], PartScan);
//# sourceMappingURL=PartScan.js.map