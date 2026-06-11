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
exports.Review = void 0;
const typeorm_1 = require("typeorm");
const CadLayer_1 = require("./CadLayer");
const Material_1 = require("./Material");
const Collision_1 = require("./Collision");
const ReviewHistory_1 = require("./ReviewHistory");
const ViewConfig_1 = require("./ViewConfig");
const Remark_1 = require("./Remark");
let Review = class Review {
    id;
    name;
    code;
    status;
    conclusion;
    operatorRemark;
    description;
    isGrayRelease;
    cadLayers;
    materials;
    collisions;
    histories;
    viewConfigs;
    remarks;
    createdAt;
    updatedAt;
};
exports.Review = Review;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Review.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Review.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Review.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", default: "pending" }),
    __metadata("design:type", String)
], Review.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", default: "pending" }),
    __metadata("design:type", String)
], Review.prototype, "conclusion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Review.prototype, "operatorRemark", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Review.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Review.prototype, "isGrayRelease", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CadLayer_1.CadLayer, (layer) => layer.review, { cascade: true }),
    __metadata("design:type", Array)
], Review.prototype, "cadLayers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Material_1.Material, (material) => material.review, { cascade: true }),
    __metadata("design:type", Array)
], Review.prototype, "materials", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Collision_1.Collision, (collision) => collision.review, { cascade: true }),
    __metadata("design:type", Array)
], Review.prototype, "collisions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ReviewHistory_1.ReviewHistory, (history) => history.review, { cascade: true }),
    __metadata("design:type", Array)
], Review.prototype, "histories", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ViewConfig_1.ViewConfig, (view) => view.review, { cascade: true }),
    __metadata("design:type", Array)
], Review.prototype, "viewConfigs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Remark_1.Remark, (remark) => remark.review, { cascade: true }),
    __metadata("design:type", Array)
], Review.prototype, "remarks", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Review.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Review.prototype, "updatedAt", void 0);
exports.Review = Review = __decorate([
    (0, typeorm_1.Entity)()
], Review);
