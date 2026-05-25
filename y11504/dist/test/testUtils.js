"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditTestLedger = exports.rejectTestLedger = exports.confirmTestLedger = exports.submitTestLedger = exports.createTestLedger = exports.adminHeaders = exports.auditorHeaders = exports.managerHeaders = exports.engineerHeaders = exports.authHeaders = exports.createTestApp = void 0;
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const routes_1 = require("../routes");
const enums_1 = require("../types/enums");
const createTestApp = (dataSource) => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/api', (0, routes_1.createRoutes)(dataSource));
    return app;
};
exports.createTestApp = createTestApp;
const authHeaders = (role, userId = 'test-user', userName = 'Test User') => ({
    'x-user-id': userId,
    'x-user-name': userName,
    'x-user-role': role,
});
exports.authHeaders = authHeaders;
exports.engineerHeaders = (0, exports.authHeaders)(enums_1.UserRole.ENGINEER, 'ENG001', 'ZhangEngineer');
exports.managerHeaders = (0, exports.authHeaders)(enums_1.UserRole.SERVICE_MANAGER, 'MGR001', 'LiManager');
exports.auditorHeaders = (0, exports.authHeaders)(enums_1.UserRole.AUDITOR, 'AUD001', 'WangAuditor');
exports.adminHeaders = (0, exports.authHeaders)(enums_1.UserRole.ADMIN, 'ADM001', 'ZhaoAdmin');
const createTestLedger = async (app, data = {}) => {
    return (0, supertest_1.default)(app)
        .post('/api/ledgers')
        .set(exports.engineerHeaders)
        .send({
        engineerId: 'ENG001',
        engineerName: 'ZhangEngineer',
        partScans: [
            {
                partCode: 'PART001',
                partName: 'TestPart',
                quantity: 2,
            },
        ],
        receiptPhotos: [
            {
                photoUrl: 'https://example.com/photo1.jpg',
                description: 'CustomerReceiptPhoto',
            },
        ],
        ...data,
    });
};
exports.createTestLedger = createTestLedger;
const submitTestLedger = async (app, ledgerId, headers = exports.engineerHeaders) => {
    return (0, supertest_1.default)(app)
        .post(`/api/ledgers/${ledgerId}/submit`)
        .set(headers)
        .send({ changeReason: '提交审核' });
};
exports.submitTestLedger = submitTestLedger;
const confirmTestLedger = async (app, ledgerId, headers = exports.managerHeaders) => {
    return (0, supertest_1.default)(app)
        .post(`/api/ledgers/${ledgerId}/confirm`)
        .set(headers)
        .send({ changeReason: '确认通过' });
};
exports.confirmTestLedger = confirmTestLedger;
const rejectTestLedger = async (app, ledgerId, reason = '数据不全', headers = exports.managerHeaders) => {
    return (0, supertest_1.default)(app)
        .post(`/api/ledgers/${ledgerId}/reject`)
        .set(headers)
        .send({ rejectReason: reason, changeReason: '驳回申请' });
};
exports.rejectTestLedger = rejectTestLedger;
const auditTestLedger = async (app, ledgerId, headers = exports.auditorHeaders) => {
    return (0, supertest_1.default)(app)
        .post(`/api/ledgers/${ledgerId}/audit`)
        .set(headers)
        .send({ changeReason: '审计完成' });
};
exports.auditTestLedger = auditTestLedger;
//# sourceMappingURL=testUtils.js.map