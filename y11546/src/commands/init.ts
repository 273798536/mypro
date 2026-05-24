import { getDatabase } from '../db/database';
import chalk from 'chalk';

export async function initCommand(workDir?: string): Promise<number> {
  try {
    const db = getDatabase(workDir);
    const dbPath = db.getDbPath();
    db.close();

    console.log(chalk.green('✓ 初始化成功!'));
    console.log(chalk.gray(`数据库位置: ${dbPath}`));
    console.log('');
    console.log('下一步操作:');
    console.log('  ema import --type material_list <file.csv>  导入物料清单');
    console.log('  ema import --type logistics_receipt <file.csv>  导入物流签收');
    console.log('  ema import --type on_site_borrow <file.csv>  导入现场借用');
    console.log('  ema check  检查数据一致性');

    return 0;
  } catch (error: any) {
    console.error(chalk.red('✗ 初始化失败:'), error.message);
    return 1;
  }
}
