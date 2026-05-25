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
exports.SitePhoto = void 0;
const typeorm_1 = require("typeorm");
const WorkOrder_1 = require("./WorkOrder");
let SitePhoto = class SitePhoto {
};
exports.SitePhoto = SitePhoto;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], SitePhoto.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SitePhoto.prototype, "workOrderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WorkOrder_1.WorkOrder, (order) => order.photos),
    (0, typeorm_1.JoinColumn)({ name: "workOrderId" }),
    __metadata("design:type", WorkOrder_1.WorkOrder)
], SitePhoto.prototype, "workOrder", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SitePhoto.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SitePhoto.prototype, "originalName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SitePhoto.prototype, "filePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "bigint", nullable: true }),
    __metadata("design:type", Number)
], SitePhoto.prototype, "fileSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SitePhoto.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        default: "during_repair",
    }),
    __metadata("design:type", String)
], SitePhoto.prototype, "photoType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "datetime", nullable: true }),
    __metadata("design:type", Date)
], SitePhoto.prototype, "captureTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 6, nullable: true }),
    __metadata("design:type", Number)
], SitePhoto.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 6, nullable: true }),
    __metadata("design:type", Number)
], SitePhoto.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SitePhoto.prototype, "uploader", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], SitePhoto.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "simple-json", nullable: true }),
    __metadata("design:type", Object)
], SitePhoto.prototype, "exifData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "simple-json", nullable: true }),
    __metadata("design:type", Object)
], SitePhoto.prototype, "rawData", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SitePhoto.prototype, "isDirty", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "simple-array", nullable: true }),
    __metadata("design:type", Array)
], SitePhoto.prototype, "dirtyReasons", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SitePhoto.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SitePhoto.prototype, "updatedAt", void 0);
exports.SitePhoto = SitePhoto = __decorate([
    (0, typeorm_1.Entity)()
], SitePhoto);
