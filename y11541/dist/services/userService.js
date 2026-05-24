"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByUsername = getUserByUsername;
exports.createUser = createUser;
exports.listUsers = listUsers;
exports.getCurrentUser = getCurrentUser;
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const database_1 = require("../db/database");
async function getUserByUsername(username) {
    return (0, database_1.get)('SELECT * FROM users WHERE username = ?', [username]);
}
async function createUser(username, role) {
    const id = (0, uuid_1.v4)();
    const now = (0, dayjs_1.default)().toISOString();
    await (0, database_1.run)('INSERT INTO users (id, username, role, created_at) VALUES (?, ?, ?, ?)', [id, username, role, now]);
    return { id, username, role, created_at: now };
}
async function listUsers() {
    return (0, database_1.all)('SELECT * FROM users ORDER BY created_at DESC');
}
async function getCurrentUser() {
    const username = process.env.AD_INSPECT_USER || 'admin';
    const user = await getUserByUsername(username);
    if (!user) {
        throw new Error(`用户不存在: ${username}`);
    }
    return user;
}
//# sourceMappingURL=userService.js.map