"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_router_1 = __importDefault(require("koa-router"));
const batch_1 = __importDefault(require("./batch"));
const material_1 = __importDefault(require("./material"));
const audit_1 = __importDefault(require("./audit"));
const router = new koa_router_1.default();
router.use(batch_1.default.routes(), batch_1.default.allowedMethods());
router.use(material_1.default.routes(), material_1.default.allowedMethods());
router.use(audit_1.default.routes(), audit_1.default.allowedMethods());
router.get('/health', (ctx) => {
    ctx.body = {
        success: true,
        data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'ad-material-audit-replay-service'
        }
    };
});
exports.default = router;
