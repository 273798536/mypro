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
exports.ReplayCommandEntity = void 0;
const typeorm_1 = require("typeorm");
const ReplaySession_1 = require("./ReplaySession");
let ReplayCommandEntity = class ReplayCommandEntity {
};
exports.ReplayCommandEntity = ReplayCommandEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], ReplayCommandEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ReplayCommandEntity.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ReplaySession_1.ReplaySessionEntity, session => session.commands),
    (0, typeorm_1.JoinColumn)({ name: 'sessionId' }),
    __metadata("design:type", ReplaySession_1.ReplaySessionEntity)
], ReplayCommandEntity.prototype, "session", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ReplayCommandEntity.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text'
    }),
    __metadata("design:type", String)
], ReplayCommandEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], ReplayCommandEntity.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ReplayCommandEntity.prototype, "result", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], ReplayCommandEntity.prototype, "executedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], ReplayCommandEntity.prototype, "duration", void 0);
exports.ReplayCommandEntity = ReplayCommandEntity = __decorate([
    (0, typeorm_1.Entity)('replay_commands')
], ReplayCommandEntity);
//# sourceMappingURL=ReplayCommand.js.map