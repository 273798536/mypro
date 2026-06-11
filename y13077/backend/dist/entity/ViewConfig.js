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
exports.ViewConfig = void 0;
const typeorm_1 = require("typeorm");
const Review_1 = require("./Review");
let ViewConfig = class ViewConfig {
    id;
    name;
    angle;
    zoom;
    rotationX;
    rotationY;
    panX;
    panY;
    screenshotPath;
    collisionId;
    description;
    review;
    reviewId;
    createdAt;
};
exports.ViewConfig = ViewConfig;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ViewConfig.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ViewConfig.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", default: "isometric" }),
    __metadata("design:type", String)
], ViewConfig.prototype, "angle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", default: 1 }),
    __metadata("design:type", Number)
], ViewConfig.prototype, "zoom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", default: 0 }),
    __metadata("design:type", Number)
], ViewConfig.prototype, "rotationX", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", default: 0 }),
    __metadata("design:type", Number)
], ViewConfig.prototype, "rotationY", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", default: 0 }),
    __metadata("design:type", Number)
], ViewConfig.prototype, "panX", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", default: 0 }),
    __metadata("design:type", Number)
], ViewConfig.prototype, "panY", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ViewConfig.prototype, "screenshotPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ViewConfig.prototype, "collisionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ViewConfig.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Review_1.Review, (review) => review.viewConfigs, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", Review_1.Review)
], ViewConfig.prototype, "review", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ViewConfig.prototype, "reviewId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ViewConfig.prototype, "createdAt", void 0);
exports.ViewConfig = ViewConfig = __decorate([
    (0, typeorm_1.Entity)()
], ViewConfig);
