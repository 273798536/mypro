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
exports.StatusChangeLogEntity = void 0;
const typeorm_1 = require("typeorm");
let StatusChangeLogEntity = class StatusChangeLogEntity {
};
exports.StatusChangeLogEntity = StatusChangeLogEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], StatusChangeLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StatusChangeLogEntity.prototype, "entityType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StatusChangeLogEntity.prototype, "entityId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StatusChangeLogEntity.prototype, "oldStatus", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StatusChangeLogEntity.prototype, "newStatus", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StatusChangeLogEntity.prototype, "changedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StatusChangeLogEntity.prototype, "changedAt", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], StatusChangeLogEntity.prototype, "reason", void 0);
exports.StatusChangeLogEntity = StatusChangeLogEntity = __decorate([
    (0, typeorm_1.Entity)('status_change_logs')
], StatusChangeLogEntity);
//# sourceMappingURL=StatusChangeLog.js.map