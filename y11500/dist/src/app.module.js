"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const database_config_1 = require("./database/database.config");
const batch_module_1 = require("./batch/batch.module");
const state_machine_module_1 = require("./state-machine/state-machine.module");
const dirty_record_module_1 = require("./dirty-record/dirty-record.module");
const export_module_1 = require("./export/export.module");
const auth_middleware_1 = require("./common/middleware/auth.middleware");
const user_entity_1 = require("./entities/user.entity");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(auth_middleware_1.AuthMiddleware)
            .forRoutes({ path: '*', method: common_1.RequestMethod.ALL });
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot(database_config_1.databaseConfig),
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User]),
            batch_module_1.BatchModule,
            state_machine_module_1.StateMachineModule,
            dirty_record_module_1.DirtyRecordModule,
            export_module_1.ExportModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map