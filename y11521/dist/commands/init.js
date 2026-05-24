"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInit = handleInit;
const chalk_1 = __importDefault(require("chalk"));
const database_1 = require("../utils/database");
async function handleInit(options) {
    console.log(chalk_1.default.blue('=== 家电安装回访巡检工具 初始化 ===\n'));
    if ((0, database_1.isInitialized)() && !options.force) {
        console.log(chalk_1.default.yellow('⚠️  系统已初始化。如需重新初始化，请使用 --force 参数'));
        const db = (0, database_1.loadDb)();
        console.log(chalk_1.default.gray(`初始化时间: ${db.initializedAt}`));
        console.log(chalk_1.default.gray(`用户数量: ${db.users.length}`));
        return;
    }
    if (options.force) {
        console.log(chalk_1.default.yellow('⚠️  强制重新初始化，将覆盖现有数据...'));
    }
    const db = (0, database_1.initDb)();
    console.log(chalk_1.default.green('✅ 系统初始化成功！\n'));
    console.log(chalk_1.default.blue('=== 默认账号 ==='));
    db.users.forEach((user) => {
        const roleLabel = {
            entry: '录入员',
            review: '复核员',
            supervisor: '主管',
            readonly: '只读',
        }[user.role];
        console.log(`  ${chalk_1.default.cyan(user.username)} / ${chalk_1.default.magenta(user.password)} - ${roleLabel} (${user.name})`);
    });
    console.log(`\n${chalk_1.default.gray('提示: 请使用 hai login <username> <password> 登录系统')}`);
}
//# sourceMappingURL=init.js.map