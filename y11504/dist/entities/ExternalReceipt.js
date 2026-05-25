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
exports.ExternalReceipt = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const Ledger_1 = require("./Ledger");
const enums_1 = require("../types/enums");
let ExternalReceipt = class ExternalReceipt extends BaseEntity_1.BaseEntity {
    constructor() {
        super(...arguments);
        this.source = enums_1.ReceiptSource.EXTERNAL;
    }
};
exports.ExternalReceipt = ExternalReceipt;
__decorate([
    (0, typeorm_1.Column)({ name: 'receipt_no', nullable: true }),
    __metadata("design:type", String)
], ExternalReceipt.prototype, "receiptNo", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: enums_1.ReceiptSource,
        default: enums_1.ReceiptSource.EXTERNAL,
        name: 'source',
    }),
    __metadata("design:type", String)
], ExternalReceipt.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_system', nullable: true }),
    __metadata("design:type", String)
], ExternalReceipt.prototype, "sourceSystem", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_at', nullable: true }),
    __metadata("design:type", Date)
], ExternalReceipt.prototype, "receivedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender', nullable: true }),
    __metadata("design:type", String)
], ExternalReceipt.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'receiver', nullable: true }),
    __metadata("design:type", String)
], ExternalReceipt.prototype, "receiver", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content', type: 'text', nullable: true }),
    __metadata("design:type", String)
], ExternalReceipt.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'attachment_url', nullable: true }),
    __metadata("design:type", String)
], ExternalReceipt.prototype, "attachmentUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'attachment_hash', nullable: true }),
    __metadata("design:type", String)
], ExternalReceipt.prototype, "attachmentHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], ExternalReceipt.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ledger_id', nullable: true }),
    __metadata("design:type", String)
], ExternalReceipt.prototype, "ledgerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Ledger_1.Ledger, (ledger) => ledger.externalReceipts, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'ledger_id' }),
    __metadata("design:type", Ledger_1.Ledger)
], ExternalReceipt.prototype, "ledger", void 0);
exports.ExternalReceipt = ExternalReceipt = __decorate([
    (0, typeorm_1.Entity)('external_receipts')
], ExternalReceipt);
//# sourceMappingURL=ExternalReceipt.js.map