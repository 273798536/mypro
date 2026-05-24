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
exports.BatchController = void 0;
const common_1 = require("@nestjs/common");
const batch_service_1 = require("./batch.service");
const create_batch_dto_1 = require("./dto/create-batch.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const role_enum_1 = require("../common/enums/role.enum");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const state_machine_service_1 = require("../state-machine/state-machine.service");
const dirty_record_service_1 = require("../dirty-record/dirty-record.service");
let BatchController = class BatchController {
    constructor(batchService, stateMachineService, dirtyRecordService) {
        this.batchService = batchService;
        this.stateMachineService = stateMachineService;
        this.dirtyRecordService = dirtyRecordService;
    }
    create(createBatchDto, user) {
        return this.batchService.create(createBatchDto, user);
    }
    findAll(user) {
        return this.batchService.findAll(user);
    }
    findOne(id) {
        return this.batchService.findOne(id);
    }
    submitForReview(id, user) {
        return this.batchService.submitForReview(id, user);
    }
    approve(id, user, opinion) {
        return this.batchService.approve(id, user, opinion);
    }
    reject(id, user, reason) {
        return this.batchService.reject(id, user, reason);
    }
    freeze(id, user, reason) {
        return this.batchService.freeze(id, user, reason);
    }
    unfreeze(id, user, reason) {
        return this.batchService.unfreeze(id, user, reason);
    }
    settle(id, user) {
        return this.batchService.settle(id, user);
    }
    cancel(id, user, reason) {
        return this.batchService.cancel(id, user, reason);
    }
    archive(id, user) {
        return this.batchService.archive(id, user);
    }
    getStatusLogs(id) {
        return this.stateMachineService.getStatusLogs(id);
    }
    getDirtyRecords(id) {
        return this.dirtyRecordService.findByBatchId(id);
    }
    resolveDirtyRecord(id, user, handlingOpinion, resolvedContent) {
        return this.dirtyRecordService.resolve(id, user, handlingOpinion, resolvedContent);
    }
};
exports.BatchController = BatchController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.OPERATOR, role_enum_1.Role.MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_batch_dto_1.CreateBatchDto, Object]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.OPERATOR, role_enum_1.Role.REVIEWER, role_enum_1.Role.MANAGER, role_enum_1.Role.VIEWER),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.OPERATOR, role_enum_1.Role.REVIEWER, role_enum_1.Role.MANAGER, role_enum_1.Role.VIEWER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.OPERATOR, role_enum_1.Role.MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "submitForReview", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REVIEWER, role_enum_1.Role.MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('opinion')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REVIEWER, role_enum_1.Role.MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/freeze'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "freeze", null);
__decorate([
    (0, common_1.Post)(':id/unfreeze'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "unfreeze", null);
__decorate([
    (0, common_1.Post)(':id/settle'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "settle", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/archive'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "archive", null);
__decorate([
    (0, common_1.Get)(':id/status-logs'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.OPERATOR, role_enum_1.Role.REVIEWER, role_enum_1.Role.MANAGER, role_enum_1.Role.VIEWER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "getStatusLogs", null);
__decorate([
    (0, common_1.Get)(':id/dirty-records'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.OPERATOR, role_enum_1.Role.REVIEWER, role_enum_1.Role.MANAGER, role_enum_1.Role.VIEWER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "getDirtyRecords", null);
__decorate([
    (0, common_1.Post)('dirty-records/:id/resolve'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REVIEWER, role_enum_1.Role.MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('handlingOpinion')),
    __param(3, (0, common_1.Body)('resolvedContent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "resolveDirtyRecord", null);
exports.BatchController = BatchController = __decorate([
    (0, common_1.Controller)('batches'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [batch_service_1.BatchService,
        state_machine_service_1.StateMachineService,
        dirty_record_service_1.DirtyRecordService])
], BatchController);
//# sourceMappingURL=batch.controller.js.map