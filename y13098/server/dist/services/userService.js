"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
exports.getOrCreateUser = getOrCreateUser;
exports.updateUser = updateUser;
exports.getCurrentUser = getCurrentUser;
const database_1 = require("../database");
const utils_1 = require("@shared/utils");
const toUser = (row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar
});
async function getAllUsers() {
    const rows = await (0, database_1.runQuery)('SELECT * FROM users ORDER BY name');
    return rows.map(toUser);
}
async function getUserById(id) {
    const row = await (0, database_1.runQueryOne)('SELECT * FROM users WHERE id = ?', [id]);
    return row ? toUser(row) : undefined;
}
async function getOrCreateUser(name, role = 'inspector') {
    let user = await (0, database_1.runQueryOne)('SELECT * FROM users WHERE name = ?', [name]);
    if (!user) {
        const id = (0, utils_1.generateId)();
        await (0, database_1.runExecute)('INSERT INTO users (id, name, role) VALUES (?, ?, ?)', [id, name, role]);
        user = await (0, database_1.runQueryOne)('SELECT * FROM users WHERE id = ?', [id]);
    }
    return toUser(user);
}
async function updateUser(id, data) {
    const existing = await getUserById(id);
    if (!existing)
        return undefined;
    const updates = [];
    const params = [];
    if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name);
    }
    if (data.role !== undefined) {
        updates.push('role = ?');
        params.push(data.role);
    }
    if (data.avatar !== undefined) {
        updates.push('avatar = ?');
        params.push(data.avatar);
    }
    params.push(id);
    await (0, database_1.runExecute)(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    return getUserById(id);
}
async function getCurrentUser() {
    return getOrCreateUser('小赵', 'manager');
}
