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
exports.CalibrationCertificateEntity = void 0;
const typeorm_1 = require("typeorm");
const types_1 = require("../types");
let CalibrationCertificateEntity = class CalibrationCertificateEntity {
};
exports.CalibrationCertificateEntity = CalibrationCertificateEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], CalibrationCertificateEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], CalibrationCertificateEntity.prototype, "certificateNo", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CalibrationCertificateEntity.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CalibrationCertificateEntity.prototype, "deviceCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CalibrationCertificateEntity.prototype, "calibrationAgency", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], CalibrationCertificateEntity.prototype, "calibrationDate", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], CalibrationCertificateEntity.prototype, "expiryDate", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-json'),
    __metadata("design:type", Array)
], CalibrationCertificateEntity.prototype, "calibrationItems", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text'
    }),
    __metadata("design:type", String)
], CalibrationCertificateEntity.prototype, "conclusion", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        default: types_1.RecordStatus.DRAFT
    }),
    __metadata("design:type", String)
], CalibrationCertificateEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CalibrationCertificateEntity.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CalibrationCertificateEntity.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CalibrationCertificateEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CalibrationCertificateEntity.prototype, "updatedAt", void 0);
exports.CalibrationCertificateEntity = CalibrationCertificateEntity = __decorate([
    (0, typeorm_1.Entity)('calibration_certificates')
], CalibrationCertificateEntity);
//# sourceMappingURL=CalibrationCertificate.js.map