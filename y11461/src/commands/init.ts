import { Database, UserRole } from '../types';
import { saveDatabase, addUser, getCurrentTime } from '../utils/database';

export async function initDatabase(
  db: Database,
  supervisorName: string = '系统管理员'
): Promise<void> {
  if (db.settings.initialized) {
    throw new Error('数据库已初始化，如需重新初始化请先删除 .dmi 目录');
  }

  addUser(db, {
    username: 'admin',
    role: UserRole.SUPERVISOR,
    name: supervisorName
  });

  addUser(db, {
    username: 'entry',
    role: UserRole.DATA_ENTRY,
    name: '录入员'
  });

  addUser(db, {
    username: 'reviewer',
    role: UserRole.REVIEWER,
    name: '复核员'
  });

  addUser(db, {
    username: 'viewer',
    role: UserRole.READ_ONLY,
    name: '查看员'
  });

  db.settings.initialized = true;
  db.settings.initializedAt = getCurrentTime();
  db.settings.initializedBy = 'admin';

  saveDatabase(db);
}
