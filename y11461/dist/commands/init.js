"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
const types_1 = require("../types");
const database_1 = require("../utils/database");
async function initDatabase(db, supervisorName = '系统管理员') {
    if (db.settings.initialized) {
        throw new Error('数据库已初始化，如需重新初始化请先删除 .dmi 目录');
    }
    (0, database_1.addUser)(db, {
        username: 'admin',
        role: types_1.UserRole.SUPERVISOR,
        name: supervisorName
    });
    (0, database_1.addUser)(db, {
        username: 'entry',
        role: types_1.UserRole.DATA_ENTRY,
        name: '录入员'
    });
    (0, database_1.addUser)(db, {
        username: 'reviewer',
        role: types_1.UserRole.REVIEWER,
        name: '复核员'
    });
    (0, database_1.addUser)(db, {
        username: 'viewer',
        role: types_1.UserRole.READ_ONLY,
        name: '查看员'
    });
    db.settings.initialized = true;
    db.settings.initializedAt = (0, database_1.getCurrentTime)();
    db.settings.initializedBy = 'admin';
    (0, database_1.saveDatabase)(db);
}
//# sourceMappingURL=init.js.map