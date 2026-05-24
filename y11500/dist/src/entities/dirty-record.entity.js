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
exports.DirtyRecord = void 0;
const typeorm_1 = require("typeorm");
const batch_entity_1 = require("./batch.entity");
const dirty_type_enum_1 = require("../common/enums/dirty-type.enum");
let DirtyRecord = class DirtyRecord {
};
exports.DirtyRecord = DirtyRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DirtyRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: dirty_type_enum_1.DirtyType,
    }),
    __metadata("design:type", String)
], DirtyRecord.prototype, "dirtyType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DirtyRecord.prototype, "sourceType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DirtyRecord.prototype, "sourceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], DirtyRecord.prototype, "originalContent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Array)
], DirtyRecord.prototype, "conflictFields", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DirtyRecord.prototype, "handlingOpinion", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], DirtyRecord.prototype, "isResolved", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DirtyRecord.prototype, "resolvedContent", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DirtyRecord.prototype, "resolvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], DirtyRecord.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => batch_entity_1.Batch, batch => batch.dirtyRecords, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", batch_entity_1.Batch)
], DirtyRecord.prototype, "batch", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DirtyRecord.prototype, "batchId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], DirtyRecord.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], DirtyRecord.prototype, "updatedAt", void 0);
exports.DirtyRecord = DirtyRecord = __decorate([
    (0, typeorm_1.Entity)('dirty_records')
], DirtyRecord);
//# sourceMappingURL=dirty-record.entity.js.map