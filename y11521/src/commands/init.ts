import chalk from 'chalk';
import { initDb, isInitialized, loadDb } from '../utils/database';

export async function handleInit(options: { force?: boolean }): Promise<void> {
  console.log(chalk.blue('=== 家电安装回访巡检工具 初始化 ===\n'));

  if (isInitialized() && !options.force) {
    console.log(chalk.yellow('⚠️  系统已初始化。如需重新初始化，请使用 --force 参数'));
    const db = loadDb();
    console.log(chalk.gray(`初始化时间: ${db.initializedAt}`));
    console.log(chalk.gray(`用户数量: ${db.users.length}`));
    return;
  }

  if (options.force) {
    console.log(chalk.yellow('⚠️  强制重新初始化，将覆盖现有数据...'));
  }

  const db = initDb();

  console.log(chalk.green('✅ 系统初始化成功！\n'));

  console.log(chalk.blue('=== 默认账号 ==='));
  db.users.forEach((user) => {
    const roleLabel = {
      entry: '录入员',
      review: '复核员',
      supervisor: '主管',
      readonly: '只读',
    }[user.role];
    console.log(`  ${chalk.cyan(user.username)} / ${chalk.magenta(user.password)} - ${roleLabel} (${user.name})`);
  });

  console.log(`\n${chalk.gray('提示: 请使用 hai login <username> <password> 登录系统')}`);
}
