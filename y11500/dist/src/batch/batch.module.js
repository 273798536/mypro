"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const batch_service_1 = require("./batch.service");
const batch_controller_1 = require("./batch.controller");
const batch_entity_1 = require("../entities/batch.entity");
const repair_order_entity_1 = require("../entities/repair-order.entity");
const spare_part_scan_entity_1 = require("../entities/spare-part-scan.entity");
const customer_sign_photo_entity_1 = require("../entities/customer-sign-photo.entity");
const scan_detail_entity_1 = require("../entities/scan-detail.entity");
const dirty_record_entity_1 = require("../entities/dirty-record.entity");
const state_machine_module_1 = require("../state-machine/state-machine.module");
const dirty_record_module_1 = require("../dirty-record/dirty-record.module");
let BatchModule = class BatchModule {
};
exports.BatchModule = BatchModule;
exports.BatchModule = BatchModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([batch_entity_1.Batch, repair_order_entity_1.RepairOrder, spare_part_scan_entity_1.SparePartScan, customer_sign_photo_entity_1.CustomerSignPhoto, scan_detail_entity_1.ScanDetail, dirty_record_entity_1.DirtyRecord]),
            state_machine_module_1.StateMachineModule,
            dirty_record_module_1.DirtyRecordModule,
        ],
        controllers: [batch_controller_1.BatchController],
        providers: [batch_service_1.BatchService],
    })
], BatchModule);
//# sourceMappingURL=batch.module.js.map