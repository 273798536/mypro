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
exports.InspectionRecordEntity = void 0;
const typeorm_1 = require("typeorm");
const types_1 = require("../types");
let InspectionRecordEntity = class InspectionRecordEntity {
};
exports.InspectionRecordEntity = InspectionRecordEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], InspectionRecordEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], InspectionRecordEntity.prototype, "recordNo", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InspectionRecordEntity.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InspectionRecordEntity.prototype, "deviceCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InspectionRecordEntity.prototype, "inspector", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], InspectionRecordEntity.prototype, "inspectionDate", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-json'),
    __metadata("design:type", Object)
], InspectionRecordEntity.prototype, "inspectionItems", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InspectionRecordEntity.prototype, "conclusion", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        default: types_1.RecordStatus.DRAFT
    }),
    __metadata("design:type", String)
], InspectionRecordEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], InspectionRecordEntity.prototype, "remarks", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InspectionRecordEntity.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], InspectionRecordEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], InspectionRecordEntity.prototype, "updatedAt", void 0);
exports.InspectionRecordEntity = InspectionRecordEntity = __decorate([
    (0, typeorm_1.Entity)('inspection_records')
], InspectionRecordEntity);
//# sourceMappingURL=InspectionRecord.js.map