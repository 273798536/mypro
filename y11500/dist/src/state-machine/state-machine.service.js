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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateMachineService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const batch_status_enum_1 = require("../common/enums/batch-status.enum");
const status_log_entity_1 = require("../entities/status-log.entity");
let StateMachineService = class StateMachineService {
    constructor(statusLogRepository) {
        this.statusLogRepository = statusLogRepository;
        this.transitions = new Map();
        this.initTransitions();
    }
    initTransitions() {
        this.addTransition(batch_status_enum_1.BatchStatus.DRAFT, batch_status_enum_1.BatchStatus.PENDING_REVIEW);
        this.addTransition(batch_status_enum_1.BatchStatus.DRAFT, batch_status_enum_1.BatchStatus.CANCELLED);
        this.addTransition(batch_status_enum_1.BatchStatus.PENDING_REVIEW, batch_status_enum_1.BatchStatus.APPROVED);
        this.addTransition(batch_status_enum_1.BatchStatus.PENDING_REVIEW, batch_status_enum_1.BatchStatus.REJECTED);
        this.addTransition(batch_status_enum_1.BatchStatus.PENDING_REVIEW, batch_status_enum_1.BatchStatus.DRAFT);
        this.addTransition(batch_status_enum_1.BatchStatus.APPROVED, batch_status_enum_1.BatchStatus.FROZEN);
        this.addTransition(batch_status_enum_1.BatchStatus.APPROVED, batch_status_enum_1.BatchStatus.SETTLED);
        this.addTransition(batch_status_enum_1.BatchStatus.REJECTED, batch_status_enum_1.BatchStatus.DRAFT);
        this.addTransition(batch_status_enum_1.BatchStatus.REJECTED, batch_status_enum_1.BatchStatus.CANCELLED);
        this.addTransition(batch_status_enum_1.BatchStatus.FROZEN, batch_status_enum_1.BatchStatus.APPROVED);
        this.addTransition(batch_status_enum_1.BatchStatus.FROZEN, batch_status_enum_1.BatchStatus.CANCELLED);
        this.addTransition(batch_status_enum_1.BatchStatus.SETTLED, batch_status_enum_1.BatchStatus.ARCHIVED);
        this.addTransition(batch_status_enum_1.BatchStatus.SETTLED, batch_status_enum_1.BatchStatus.FROZEN);
        this.addTransition(batch_status_enum_1.BatchStatus.CANCELLED, batch_status_enum_1.BatchStatus.ARCHIVED);
        this.addTransition(batch_status_enum_1.BatchStatus.CANCELLED, batch_status_enum_1.BatchStatus.DRAFT);
    }
    addTransition(from, to) {
        if (!this.transitions.has(from)) {
            this.transitions.set(from, []);
        }
        const existing = this.transitions.get(from);
        if (!existing.find(t => t.to === to)) {
            existing.push({ from: [from], to });
        }
    }
    canTransition(from, to) {
        const transitions = this.transitions.get(from);
        if (!transitions)
            return false;
        return transitions.some(t => t.to === to);
    }
    getAvailableTransitions(status) {
        const transitions = this.transitions.get(status);
        if (!transitions)
            return [];
        return transitions.map(t => t.to);
    }
    async transition(batch, toStatus, user, reason, metadata) {
        if (!batch.id) {
            throw new common_1.BadRequestException('批次ID无效，无法进行状态转换');
        }
        if (!this.canTransition(batch.status, toStatus)) {
            throw new common_1.BadRequestException(`无法从 ${batch.status} 转换到 ${toStatus}`);
        }
        const log = new status_log_entity_1.StatusLog();
        log.batchId = batch.id;
        log.fromStatus = batch.status;
        log.toStatus = toStatus;
        log.reason = reason;
        log.operatorId = user.id;
        log.operatorName = user.name;
        log.metadata = metadata;
        await this.statusLogRepository.save(log);
        batch.status = toStatus;
        return batch;
    }
    async getStatusLogs(batchId) {
        return this.statusLogRepository.find({
            where: { batchId },
            order: { operatedAt: 'DESC' },
        });
    }
};
exports.StateMachineService = StateMachineService;
exports.StateMachineService = StateMachineService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(status_log_entity_1.StatusLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], StateMachineService);
//# sourceMappingURL=state-machine.service.js.map