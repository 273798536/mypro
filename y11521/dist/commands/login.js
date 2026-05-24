"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLogin = handleLogin;
exports.handleLogout = handleLogout;
exports.handleWhoami = handleWhoami;
exports.requireLogin = requireLogin;
exports.requirePermission = requirePermission;
const chalk_1 = __importDefault(require("chalk"));
const database_1 = require("../utils/database");
const roleLabels = {
    entry: '录入员',
    review: '复核员',
    supervisor: '主管',
    readonly: '只读',
};
async function handleLogin(username, password) {
    console.log(chalk_1.default.blue('=== 用户登录 ===\n'));
    const user = (0, database_1.login)(username, password);
    if (!user) {
        console.log(chalk_1.default.red('❌ 用户名或密码错误'));
        process.exit(1);
    }
    console.log(chalk_1.default.green(`✅ 登录成功！欢迎 ${chalk_1.default.cyan(user.name)}`));
    console.log(chalk_1.default.gray(`角色: ${roleLabels[user.role]}`));
    console.log(chalk_1.default.gray(`部门: ${user.department || '未设置'}`));
}
async function handleLogout() {
    console.log(chalk_1.default.blue('=== 用户登出 ===\n'));
    const currentUser = (0, database_1.getCurrentUser)();
    if (!currentUser) {
        console.log(chalk_1.default.yellow('⚠️  当前未登录'));
        return;
    }
    (0, database_1.logout)();
    console.log(chalk_1.default.green(`✅ ${currentUser.name} 已登出`));
}
async function handleWhoami() {
    const currentUser = (0, database_1.getCurrentUser)();
    if (!currentUser) {
        console.log(chalk_1.default.yellow('⚠️  当前未登录'));
        return;
    }
    console.log(chalk_1.default.blue('=== 当前用户 ===\n'));
    console.log(`用户名: ${chalk_1.default.cyan(currentUser.username)}`);
    console.log(`姓名: ${chalk_1.default.cyan(currentUser.name)}`);
    console.log(`角色: ${chalk_1.default.magenta(roleLabels[currentUser.role])}`);
    console.log(`部门: ${currentUser.department || '未设置'}`);
}
function requireLogin() {
    const currentUser = (0, database_1.getCurrentUser)();
    if (!currentUser) {
        console.log(chalk_1.default.red('❌ 请先登录系统'));
        console.log(chalk_1.default.gray('使用 hai login <username> <password> 登录'));
        process.exit(1);
    }
}
function requirePermission(action) {
    requireLogin();
    const currentUser = (0, database_1.getCurrentUser)();
    const rolePermissions = {
        entry: ['import', 'view', 'fix_dirty'],
        review: ['view', 'approve', 'reject', 'report'],
        supervisor: ['import', 'view', 'fix_dirty', 'approve', 'reject', 'report', 'export', 'history', 'manage_users'],
        readonly: ['view', 'report'],
    };
    if (!rolePermissions[currentUser.role].includes(action)) {
        console.log(chalk_1.default.red(`❌ 权限不足: ${currentUser.role} 角色无法执行 ${action} 操作`));
        process.exit(1);
    }
}
//# sourceMappingURL=login.js.map