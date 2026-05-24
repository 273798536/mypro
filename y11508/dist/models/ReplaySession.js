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
exports.ReplaySessionEntity = void 0;
const typeorm_1 = require("typeorm");
const ReplayCommand_1 = require("./ReplayCommand");
let ReplaySessionEntity = class ReplaySessionEntity {
};
exports.ReplaySessionEntity = ReplaySessionEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], ReplaySessionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ReplaySessionEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReplaySessionEntity.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], ReplaySessionEntity.prototype, "endTime", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        default: 'running'
    }),
    __metadata("design:type", String)
], ReplaySessionEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ReplayCommand_1.ReplayCommandEntity, cmd => cmd.session),
    __metadata("design:type", Array)
], ReplaySessionEntity.prototype, "commands", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ReplaySessionEntity.prototype, "createdBy", void 0);
exports.ReplaySessionEntity = ReplaySessionEntity = __decorate([
    (0, typeorm_1.Entity)('replay_sessions')
], ReplaySessionEntity);
//# sourceMappingURL=ReplaySession.js.map