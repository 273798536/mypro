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
exports.Batch = void 0;
const typeorm_1 = require("typeorm");
const Material_1 = require("./Material");
let Batch = class Batch {
};
exports.Batch = Batch;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Batch.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, type: 'text' }),
    __metadata("design:type", String)
], Batch.prototype, "batchNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Batch.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        default: 'draft'
    }),
    __metadata("design:type", String)
], Batch.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        default: 'ignore'
    }),
    __metadata("design:type", String)
], Batch.prototype, "duplicateStrategy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Batch.prototype, "operator", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Batch.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Batch.prototype, "materialCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Batch.prototype, "successCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Batch.prototype, "failedCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Batch.prototype, "frozen", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Batch.prototype, "frozenAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Batch.prototype, "frozenBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Batch.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Batch.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Material_1.Material, material => material.batch),
    __metadata("design:type", Array)
], Batch.prototype, "materials", void 0);
exports.Batch = Batch = __decorate([
    (0, typeorm_1.Entity)()
], Batch);
