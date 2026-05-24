import chalk from 'chalk';
import { login, getCurrentUser, logout } from '../utils/database';
import { Role } from '../types';

const roleLabels: Record<Role, string> = {
  entry: '录入员',
  review: '复核员',
  supervisor: '主管',
  readonly: '只读',
};

export async function handleLogin(username: string, password: string): Promise<void> {
  console.log(chalk.blue('=== 用户登录 ===\n'));

  const user = login(username, password);

  if (!user) {
    console.log(chalk.red('❌ 用户名或密码错误'));
    process.exit(1);
  }

  console.log(chalk.green(`✅ 登录成功！欢迎 ${chalk.cyan(user.name)}`));
  console.log(chalk.gray(`角色: ${roleLabels[user.role]}`));
  console.log(chalk.gray(`部门: ${user.department || '未设置'}`));
}

export async function handleLogout(): Promise<void> {
  console.log(chalk.blue('=== 用户登出 ===\n'));

  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.log(chalk.yellow('⚠️  当前未登录'));
    return;
  }

  logout();
  console.log(chalk.green(`✅ ${currentUser.name} 已登出`));
}

export async function handleWhoami(): Promise<void> {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.log(chalk.yellow('⚠️  当前未登录'));
    return;
  }

  console.log(chalk.blue('=== 当前用户 ===\n'));
  console.log(`用户名: ${chalk.cyan(currentUser.username)}`);
  console.log(`姓名: ${chalk.cyan(currentUser.name)}`);
  console.log(`角色: ${chalk.magenta(roleLabels[currentUser.role])}`);
  console.log(`部门: ${currentUser.department || '未设置'}`);
}

export function requireLogin(): void {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.log(chalk.red('❌ 请先登录系统'));
    console.log(chalk.gray('使用 hai login <username> <password> 登录'));
    process.exit(1);
  }
}

export function requirePermission(action: string): void {
  requireLogin();
  const currentUser = getCurrentUser()!;

  const rolePermissions: Record<Role, string[]> = {
    entry: ['import', 'view', 'fix_dirty'],
    review: ['view', 'approve', 'reject', 'report'],
    supervisor: ['import', 'view', 'fix_dirty', 'approve', 'reject', 'report', 'export', 'history', 'manage_users'],
    readonly: ['view', 'report'],
  };

  if (!rolePermissions[currentUser.role].includes(action)) {
    console.log(chalk.red(`❌ 权限不足: ${currentUser.role} 角色无法执行 ${action} 操作`));
    process.exit(1);
  }
}
