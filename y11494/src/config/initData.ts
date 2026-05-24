import bcrypt from 'bcryptjs';
import { runQuery, getOne } from './database';
import { UserRole } from '../types';

const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const initUsers = async () => {
  const users = [
    {
      username: 'admin',
      password: await hashPassword('admin123'),
      name: '系统管理员',
      role: UserRole.MANAGER,
      department: '信息部',
      phone: '13800000000',
      email: 'admin@company.com'
    },
    {
      username: 'entry',
      password: await hashPassword('entry123'),
      name: '张录入',
      role: UserRole.DATA_ENTRY,
      department: '商务部',
      phone: '13800000001',
      email: 'entry@company.com'
    },
    {
      username: 'reviewer',
      password: await hashPassword('reviewer123'),
      name: '李复核',
      role: UserRole.REVIEWER,
      department: '质量部',
      phone: '13800000002',
      email: 'reviewer@company.com'
    },
    {
      username: 'manager',
      password: await hashPassword('manager123'),
      name: '王主管',
      role: UserRole.MANAGER,
      department: '投标部',
      phone: '13800000003',
      email: 'manager@company.com'
    },
    {
      username: 'viewer',
      password: await hashPassword('viewer123'),
      name: '赵查看',
      role: UserRole.READ_ONLY,
      department: '审计部',
      phone: '13800000004',
      email: 'viewer@company.com'
    }
  ];

  for (const user of users) {
    const existing = await getOne('SELECT id FROM users WHERE username = ?', [user.username]);
    if (!existing) {
      await runQuery(
        'INSERT INTO users (username, password, name, role, department, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.username, user.password, user.name, user.role, user.department, user.phone, user.email]
      );
      console.log(`创建用户: ${user.username}`);
    }
  }
};

export const initSampleData = async () => {
  const managerUser = await getOne('SELECT id FROM users WHERE username = ?', ['manager']);
  if (!managerUser) return;

  const sampleProject = await getOne('SELECT id FROM projects WHERE project_no = ?', ['BID-2024-001']);
  if (!sampleProject) {
    await runQuery(
      'INSERT INTO projects (project_no, project_name, client_name, bid_deadline, project_manager_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      ['BID-2024-001', 'XX市政府采购项目', 'XX市财政局', '2024-12-31', managerUser.id, 'draft']
    );
    console.log('创建示例项目: BID-2024-001');
  }
};
