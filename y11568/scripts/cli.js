#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const { spawnSync } = require('child_process');
const path = require('path');

const runScript = (scriptName, description) => {
  console.log(chalk.blue(`\n▶ ${description}...`));
  const result = spawnSync('node', [`scripts/${scriptName}.js`], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: process.env
  });
  
  if (result.error) {
    console.log(chalk.red(`✗ 失败: ${result.error.message}`));
    process.exit(1);
  }
  
  if (result.status !== 0) {
    console.log(chalk.red(`✗ 执行失败，退出码: ${result.status}`));
    process.exit(result.status);
  }
  
  console.log(chalk.green(`✓ ${description}完成\n`));
};

program
  .name('lighting-cli')
  .description('城市照明抢修验收回放链路服务 - 命令行工具')
  .version('1.0.0');

program
  .command('init')
  .description('初始化数据库（创建表和默认用户）')
  .action(() => {
    runScript('init-db', '初始化数据库');
    console.log(chalk.yellow('💡 提示: 默认账号已创建，详见上方输出'));
  });

program
  .command('import')
  .description('导入样例数据')
  .action(() => {
    runScript('import-sample', '导入样例数据');
  });

program
  .command('bad-data')
  .description('触发坏数据（用于测试坏数据隔离功能）')
  .action(() => {
    runScript('trigger-bad-data', '触发坏数据');
  });

program
  .command('report')
  .description('生成分析报告')
  .action(() => {
    runScript('generate-report', '生成分析报告');
  });

program
  .command('start')
  .description('启动服务')
  .action(() => {
    console.log(chalk.blue('\n▶ 启动API服务...'));
    console.log(chalk.gray('  服务将在前台运行，按 Ctrl+C 停止\n'));
    
    const result = spawnSync('node', ['src/server.js'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      env: process.env
    });
    
    if (result.error) {
      console.log(chalk.red(`✗ 启动失败: ${result.error.message}`));
      process.exit(1);
    }
  });

program
  .command('full-demo')
  .description('完整演示流程: 初始化 -> 导入数据 -> 触发坏数据 -> 生成报告 -> 启动服务')
  .action(() => {
    console.log(chalk.magenta('\n========================================'));
    console.log(chalk.magenta('  城市照明抢修链路服务 - 完整演示'));
    console.log(chalk.magenta('========================================\n'));
    
    runScript('init-db', '步骤1/4: 初始化数据库');
    runScript('import-sample', '步骤2/4: 导入样例数据');
    runScript('trigger-bad-data', '步骤3/4: 触发坏数据');
    runScript('generate-report', '步骤4/4: 生成分析报告');
    
    console.log(chalk.green('\n🎉 演示数据准备完成!'));
    console.log(chalk.gray('\n下一步操作建议:'));
    console.log(chalk.gray('  1. 运行 npm run start 启动服务'));
    console.log(chalk.gray('  2. 使用 curl 或 Postman 测试 API'));
    console.log(chalk.gray('  3. 登录获取 token: POST /api/auth/login'));
    console.log(chalk.gray('  4. 查看工单: GET /api/work-orders'));
    console.log(chalk.gray('  5. 查看坏数据: GET /api/bad-data'));
    console.log(chalk.gray('  6. 回放操作日志: GET /api/replay/logs\n'));
  });

program.parse();
