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
exports.ReceiptPhoto = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const Ledger_1 = require("./Ledger");
let ReceiptPhoto = class ReceiptPhoto extends BaseEntity_1.BaseEntity {
};
exports.ReceiptPhoto = ReceiptPhoto;
__decorate([
    (0, typeorm_1.Column)({ name: 'photo_url' }),
    __metadata("design:type", String)
], ReceiptPhoto.prototype, "photoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'photo_hash', nullable: true }),
    __metadata("design:type", String)
], ReceiptPhoto.prototype, "photoHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'photo_size', nullable: true }),
    __metadata("design:type", Number)
], ReceiptPhoto.prototype, "photoSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'photo_type', nullable: true }),
    __metadata("design:type", String)
], ReceiptPhoto.prototype, "photoType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'capture_time', nullable: true }),
    __metadata("design:type", Date)
], ReceiptPhoto.prototype, "captureTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'capture_location', nullable: true }),
    __metadata("design:type", String)
], ReceiptPhoto.prototype, "captureLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploader_id', nullable: true }),
    __metadata("design:type", String)
], ReceiptPhoto.prototype, "uploaderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploader_name', nullable: true }),
    __metadata("design:type", String)
], ReceiptPhoto.prototype, "uploaderName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'description', nullable: true, type: 'text' }),
    __metadata("design:type", String)
], ReceiptPhoto.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], ReceiptPhoto.prototype, "exifData", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ledger_id', nullable: true }),
    __metadata("design:type", String)
], ReceiptPhoto.prototype, "ledgerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Ledger_1.Ledger, (ledger) => ledger.receiptPhotos, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'ledger_id' }),
    __metadata("design:type", Ledger_1.Ledger)
], ReceiptPhoto.prototype, "ledger", void 0);
exports.ReceiptPhoto = ReceiptPhoto = __decorate([
    (0, typeorm_1.Entity)('receipt_photos')
], ReceiptPhoto);
//# sourceMappingURL=ReceiptPhoto.js.map