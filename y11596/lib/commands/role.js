const { Command } = require('commander');
const chalk = require('chalk');
const Table = require('cli-table3');

const {
  getWorkspaceRoot
} = require('../utils/file-manager');

const {
  getRoleConfig,
  setUserRole,
  getCurrentUser,
  ROLES,
  assertPermission
} = require('../utils/auth');

const roleCommand = new Command('role')
  .description('角色和权限管理');

roleCommand
  .command('list')
  .description('列出所有角色和用户')
  .action(() => {
    const root = getWorkspaceRoot();
    const user = getCurrentUser();
    assertPermission('role', { list: true }, user);

    const config = getRoleConfig(root);
    printRoleConfig(config);
  });

roleCommand
  .command('assign')
  .description('分配用户角色')
  .requiredOption('-u, --user <username>', '用户名')
  .requiredOption('-r, --role <role>', `角色: ${Object.values(ROLES).join(', ')}`)
  .action((options) => {
    const root = getWorkspaceRoot();
    const user = getCurrentUser();
    assertPermission('role', {}, user);

    if (user.role !== ROLES.ADMIN) {
      console.log(chalk.red('❌ 仅管理员可分配角色'));
      process.exit(1);
    }

    try {
      const result = setUserRole(root, options.user, options.role);
      console.log(chalk.green(`✅ 已将用户 '${options.user}' 角色设置为 '${options.role}'`));
      console.log(`  分配时间: ${result.assignedAt}`);
    } catch (e) {
      console.log(chalk.red(`❌ ${e.message}`));
      process.exit(1);
    }
  });

roleCommand
  .command('whoami')
  .description('显示当前用户信息')
  .action(() => {
    const user = getCurrentUser();
    console.log(chalk.cyan('👤 当前用户:'));
    console.log(`  用户名: ${chalk.white(user.username)}`);
    console.log(`  角色: ${chalk.white(user.role)}`);
    console.log(`  来源: ${chalk.gray(user.source)}`);
    console.log('');
    console.log(chalk.cyan('角色说明:'));
    console.log(`  ${chalk.magenta('admin')}    - 管理员：拥有所有权限，可管理角色`);
    console.log(`  ${chalk.green('operator')} - 运营人员：可导入、检查、改判、导出`);
    console.log(`  ${chalk.blue('readonly')} - 只读账号：仅可查看，敏感字段脱敏`);
  });

function printRoleConfig(config) {
  console.log(chalk.cyan('🎭 角色配置:'));
  console.log('');

  const roleTable = new Table({
    head: [chalk.cyan('角色'), chalk.cyan('名称'), chalk.cyan('描述')],
    colWidths: [15, 12, 40]
  });

  for (const [roleId, role] of Object.entries(config.roles)) {
    roleTable.push([roleId, role.name, role.description]);
  }

  console.log(roleTable.toString());
  console.log('');

  console.log(chalk.cyan('👥 用户角色分配:'));
  if (Object.keys(config.userRoles).length === 0) {
    console.log(chalk.gray('  暂无用户角色分配'));
  } else {
    const userTable = new Table({
      head: [chalk.cyan('用户名'), chalk.cyan('角色'), chalk.cyan('分配时间'), chalk.cyan('分配人')],
      colWidths: [20, 12, 25, 15]
    });

    for (const [username, userConfig] of Object.entries(config.userRoles)) {
      userTable.push([
        username,
        userConfig.role,
        userConfig.assignedAt?.substring(0, 19) || '',
        userConfig.assignedBy || '-'
      ]);
    }

    console.log(userTable.toString());
  }
}

module.exports = roleCommand;
