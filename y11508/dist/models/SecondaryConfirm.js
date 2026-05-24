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
exports.SecondaryConfirmEntity = void 0;
const typeorm_1 = require("typeorm");
const types_1 = require("../types");
let SecondaryConfirmEntity = class SecondaryConfirmEntity {
};
exports.SecondaryConfirmEntity = SecondaryConfirmEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], SecondaryConfirmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], SecondaryConfirmEntity.prototype, "confirmNo", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text'
    }),
    __metadata("design:type", String)
], SecondaryConfirmEntity.prototype, "relatedRecordType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SecondaryConfirmEntity.prototype, "relatedRecordId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SecondaryConfirmEntity.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SecondaryConfirmEntity.prototype, "deviceCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SecondaryConfirmEntity.prototype, "confirmer", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], SecondaryConfirmEntity.prototype, "confirmDate", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], SecondaryConfirmEntity.prototype, "confirmContent", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        default: types_1.RecordStatus.DRAFT
    }),
    __metadata("design:type", String)
], SecondaryConfirmEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SecondaryConfirmEntity.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SecondaryConfirmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SecondaryConfirmEntity.prototype, "updatedAt", void 0);
exports.SecondaryConfirmEntity = SecondaryConfirmEntity = __decorate([
    (0, typeorm_1.Entity)('secondary_confirms')
], SecondaryConfirmEntity);
//# sourceMappingURL=SecondaryConfirm.js.map