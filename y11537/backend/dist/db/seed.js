"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = __importDefault(require("./index"));
const models_1 = require("../models");
const types_1 = require("../models/types");
async function seed() {
    console.log('🌱 开始初始化测试数据...');
    try {
        await index_1.default.authenticate();
        console.log('✅ 数据库连接成功');
        const hashedPassword = await bcryptjs_1.default.hash('123456', 10);
        const users = await models_1.User.bulkCreate([
            {
                username: 'admin',
                password: hashedPassword,
                realName: '系统管理员',
                email: 'admin@company.com',
                role: types_1.UserRole.SUPERVISOR,
                department: '人力资源部',
                isActive: true
            },
            {
                username: 'reviewer',
                password: hashedPassword,
                realName: '张复核',
                email: 'reviewer@company.com',
                role: types_1.UserRole.REVIEWER,
                department: '人力资源部',
                isActive: true
            },
            {
                username: 'entry',
                password: hashedPassword,
                realName: '李录入',
                email: 'entry@company.com',
                role: types_1.UserRole.DATA_ENTRY,
                department: '培训部',
                isActive: true
            },
            {
                username: 'viewer',
                password: hashedPassword,
                realName: '王查看',
                email: 'viewer@company.com',
                role: types_1.UserRole.READ_ONLY,
                department: '财务部',
                isActive: true
            }
        ]);
        console.log('✅ 测试用户创建成功:');
        console.log('  - admin / 123456 (主管权限)');
        console.log('  - reviewer / 123456 (复核权限)');
        console.log('  - entry / 123456 (录入权限)');
        console.log('  - viewer / 123456 (只读权限)');
        console.log('\n✅ 数据初始化完成!');
    }
    catch (error) {
        console.error('❌ 数据初始化失败:', error);
        process.exit(1);
    }
    finally {
        await index_1.default.close();
    }
}
seed();
//# sourceMappingURL=seed.js.map